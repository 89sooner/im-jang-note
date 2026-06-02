/**
 * 알림 API (API-NOTIFY-001/002).
 */
import { supabase } from '@/lib/supabase';
import { newIdempotencyKey } from '@/lib/idempotency';
import type { AppNotification, DeviceToken } from '@/types/database';

/** API-NOTIFY-001 알림 센터 목록 (FR-NOTIFY-002) */
export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notification')
    .select('id, workspace_id, recipient_id, type, payload, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

/** 읽음 처리 */
export async function markRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.rpc('rpc_mark_notifications_read', { p_ids: ids });
  if (error) throw error;
}

/** API-NOTIFY-002 디바이스 토큰 등록/설정 (FR-NOTIFY-001) */
export async function registerDevice(
  expoPushToken: string,
  enabled: boolean,
): Promise<DeviceToken> {
  const { data, error } = await supabase.rpc('rpc_register_device', {
    p_expo_push_token: expoPushToken,
    p_enabled: enabled,
    p_idempotency_key: newIdempotencyKey(),
  });
  if (error) throw error;
  return data as DeviceToken;
}
