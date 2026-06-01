// 공용 CORS 헤더 및 OPTIONS 프리플라이트 처리 헬퍼.
// 모든 Edge Function은 동일한 CORS 정책을 공유한다(api_contracts §5, NFR-002).

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/** OPTIONS 프리플라이트면 200 Response 반환, 아니면 null. */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  return null;
}

/** 표준 JSON 응답(공통 CORS 헤더 포함). */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** 표준 오류 응답: { error: { code, message } } (api_contracts §5). */
export function errorResponse(
  code: string,
  message: string,
  status: number,
): Response {
  return jsonResponse({ error: { code, message } }, status);
}
