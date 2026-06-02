// fn:notify_worker — JOB-NOTIFY-001 (FR-NOTIFY-001/002)
// 미발송 알림(notification.pushed_at is null)을 Expo Push로 발송하는 서버 잡.
//
// 트리거: pg_cron 스케줄 또는 수동 호출(POST). RN 앱에서 호출하지 않는다.
// 입력(선택): { limit?: number } — 한 번에 처리할 최대 알림 수(기본 100).
//
// 인증: 서버 잡이므로 requireUser를 쓰지 않는다. 요청 헤더 `x-cron-secret`을
//       환경변수 CRON_SECRET과 비교한다. CRON_SECRET 미설정이거나 불일치면 401.
//       (운영에서는 service_role 키 또는 cron secret으로만 호출 가능하게 한다.)
//
// 동작:
//   1) pushed_at is null 인 notification 을 최대 limit건 조회.
//   2) 각 recipient 의 enabled device_token(expo_push_token) 조회.
//   3) Expo Push API 로 배치 전송.
//   4) 전송 성공한 notification 은 pushed_at=now() 갱신.
//   5) Expo 응답이 DeviceNotRegistered 면 해당 device_token.enabled=false.
//
// 재시도: 본 스켈레톤은 1회 전송만 수행한다. 실패한 알림은 pushed_at이 null로
//         남아 다음 호출에서 재처리된다(최대 3회 재시도 정책은 호출 스케줄러가
//         담당하거나 추후 retry_count 컬럼으로 확장한다 — TODO).

import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/client.ts";

const DEFAULT_LIMIT = 100;
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface NotificationRow {
  id: string;
  recipient_id: string;
  type: string;
  payload: Record<string, unknown> | null;
}

interface DeviceTokenRow {
  id: string;
  user_id: string;
  expo_push_token: string;
}

/** Expo 단일 메시지 형식. */
interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

/** notification.type → 알림 제목/본문 매핑. 미지정 type은 일반 문구로 폴백. */
function buildMessageText(type: string): { title: string; body: string } {
  switch (type) {
    case "note_created":
      return { title: "새 임장 노트", body: "새 임장 노트가 등록되었습니다." };
    case "comment_created":
      return { title: "새 코멘트", body: "새 코멘트가 등록되었습니다." };
    case "member_joined":
      return {
        title: "워크스페이스 합류",
        body: "새 멤버가 워크스페이스에 합류했습니다.",
      };
    default:
      return { title: "알림", body: "새 알림이 도착했습니다." };
  }
}

/** GET query 또는 POST body에서 limit을 읽는다(없으면 기본값). */
async function readLimit(req: Request): Promise<number> {
  const url = new URL(req.url);
  const q = url.searchParams.get("limit");
  let limit = q != null ? Number(q) : NaN;

  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (body?.limit != null) limit = Number(body.limit);
    } catch {
      // body 파싱 실패는 무시하고 기본값 사용.
    }
  }

  if (!Number.isFinite(limit) || limit <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(limit), DEFAULT_LIMIT);
}

/** Expo Push API 단일 응답 티켓(필요한 필드만). */
interface ExpoTicket {
  status: "ok" | "error";
  details?: { error?: string };
}

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  // 인증: cron secret 검증(요청자 JWT가 아니라 서버 잡 시크릿).
  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  const provided = req.headers.get("x-cron-secret") ?? "";
  if (!cronSecret || provided !== cronSecret) {
    return errorResponse("UNAUTHENTICATED", "잘못된 호출 시크릿입니다.", 401);
  }

  try {
    const limit = await readLimit(req);
    const db = adminClient();

    // 1) 미발송 알림 조회(오래된 순).
    const { data: notifRows, error: nErr } = await db
      .from("notification")
      .select("id, recipient_id, type, payload")
      .is("pushed_at", null)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (nErr) return errorResponse("INTERNAL", "알림 조회 실패", 500);

    const notifications = (notifRows ?? []) as NotificationRow[];
    const processed = notifications.length;
    if (processed === 0) {
      return jsonResponse({ processed: 0, pushed: 0, failed: 0 });
    }

    // 2) recipient 들의 enabled device_token 일괄 조회.
    const recipientIds = [...new Set(notifications.map((n) => n.recipient_id))];
    const { data: tokenRows, error: tErr } = await db
      .from("device_token")
      .select("id, user_id, expo_push_token")
      .eq("enabled", true)
      .in("user_id", recipientIds);
    if (tErr) return errorResponse("INTERNAL", "디바이스 토큰 조회 실패", 500);

    // user_id → 토큰 목록 인덱스.
    const tokensByUser = new Map<string, DeviceTokenRow[]>();
    for (const t of (tokenRows ?? []) as DeviceTokenRow[]) {
      const list = tokensByUser.get(t.user_id) ?? [];
      list.push(t);
      tokensByUser.set(t.user_id, list);
    }

    // 3) Expo 메시지 빌드. 각 메시지가 어느 notification/token에 속하는지 추적.
    interface Pending {
      notificationId: string;
      tokenId: string;
      expoToken: string;
      message: ExpoMessage;
    }
    const pending: Pending[] = [];
    // 토큰이 하나도 없는 알림은 발송 대상이 없으므로 즉시 "발송 완료" 처리한다
    // (수신자가 푸시를 끈 상태 — 재시도해도 의미 없음).
    const noTokenNotifIds: string[] = [];

    for (const n of notifications) {
      const tokens = tokensByUser.get(n.recipient_id) ?? [];
      if (tokens.length === 0) {
        noTokenNotifIds.push(n.id);
        continue;
      }
      const { title, body } = buildMessageText(n.type);
      // data 에 payload + 알림 메타를 실어 딥링크에 활용한다.
      const data = {
        type: n.type,
        notification_id: n.id,
        ...(n.payload ?? {}),
      };
      for (const t of tokens) {
        pending.push({
          notificationId: n.id,
          tokenId: t.id,
          expoToken: t.expo_push_token,
          message: { to: t.expo_push_token, title, body, data },
        });
      }
    }

    let pushed = 0;
    let failed = 0;

    // 토큰 없는 알림은 발송 완료로 마킹(무한 재처리 방지).
    if (noTokenNotifIds.length > 0) {
      const nowTs = new Date().toISOString();
      await db
        .from("notification")
        .update({ pushed_at: nowTs })
        .in("id", noTokenNotifIds);
    }

    // 4) Expo Push API 배치 전송(단일 요청 본문에 메시지 배열).
    //    응답 티켓 순서는 요청 순서와 일치한다(Expo 규약).
    const succeededNotifIds = new Set<string>();
    const failedNotifIds = new Set<string>();
    const tokensToDisable = new Set<string>();

    if (pending.length > 0) {
      let tickets: ExpoTicket[] = [];
      try {
        const res = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(pending.map((p) => p.message)),
        });
        if (res.ok) {
          const json = await res.json();
          tickets = (json?.data ?? []) as ExpoTicket[];
        } else {
          // 전체 요청 실패: 모두 실패 처리(pushed_at 유지 → 다음 호출 재시도).
          tickets = [];
        }
      } catch {
        // 네트워크 오류: 모두 실패 처리(다음 호출에서 재시도).
        tickets = [];
      }

      pending.forEach((p, i) => {
        const ticket = tickets[i];
        if (ticket && ticket.status === "ok") {
          succeededNotifIds.add(p.notificationId);
        } else {
          failedNotifIds.add(p.notificationId);
          // 토큰 무효(DeviceNotRegistered) → 해당 device_token 비활성화.
          if (ticket?.details?.error === "DeviceNotRegistered") {
            tokensToDisable.add(p.tokenId);
          }
        }
      });
    }

    // 5) 후처리: 성공 알림 pushed_at 갱신 / 무효 토큰 비활성화.
    // 한 알림에 토큰이 여러 개면 하나라도 성공 시 발송 완료로 본다.
    const toMark = [...succeededNotifIds];
    if (toMark.length > 0) {
      const nowTs = new Date().toISOString();
      await db
        .from("notification")
        .update({ pushed_at: nowTs })
        .in("id", toMark);
    }
    if (tokensToDisable.size > 0) {
      await db
        .from("device_token")
        .update({ enabled: false })
        .in("id", [...tokensToDisable]);
    }

    // 집계: pushed = 발송 완료 알림 수(토큰 없는 알림 포함),
    //       failed = 한 번도 성공 못한 알림 수.
    for (const id of failedNotifIds) {
      if (!succeededNotifIds.has(id)) failed += 1;
    }
    pushed = succeededNotifIds.size + noTokenNotifIds.length;

    return jsonResponse({ processed, pushed, failed });
  } catch (_e) {
    return errorResponse("INTERNAL", "처리 중 오류가 발생했습니다.", 500);
  }
});
