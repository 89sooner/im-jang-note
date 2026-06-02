/**
 * D-010 알림 센터 (FR-NOTIFY-001/002).
 * 알림 목록 + 읽음 처리 + 디바이스 푸시 토큰 등록(expo-notifications).
 */
import { useCallback, useEffect } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useNotifications, useMarkRead } from '@/features/notification/hooks';
import { registerDevice } from '@/features/notification/api';
import { tokens } from '@/theme/tokens';
import type { AppNotification } from '@/types/database';

const LABEL: Record<AppNotification['type'], string> = {
  note_created: '새 임장 노트가 등록되었습니다',
  comment_created: '새 코멘트가 달렸습니다',
  member_joined: '워크스페이스에 합류했습니다',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const list = useNotifications();
  const markRead = useMarkRead();

  // 디바이스 푸시 토큰 등록 (FR-NOTIFY-001). 권한 거부 시 무시(저하).
  useEffect(() => {
    (async () => {
      try {
        const perm = await Notifications.getPermissionsAsync();
        let granted = perm.granted;
        if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted;
        if (!granted) return;
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        if (token) await registerDevice(token, true);
      } catch {
        /* 푸시 미지원 환경(에뮬레이터 등)에서는 조용히 건너뜀 */
      }
    })();
  }, []);

  const onPressItem = useCallback(
    (n: AppNotification) => {
      if (!n.read_at) markRead.mutate([n.id]);
      const noteId = (n.payload as { note_id?: string }).note_id;
      if (noteId) router.push(`/note/${noteId}`);
    },
    [markRead, router],
  );

  if (list.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={tokens.color.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={list.data ?? []}
      keyExtractor={(it) => it.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }: { item: AppNotification }) => (
        <Pressable
          style={[styles.card, !item.read_at && styles.unread]}
          onPress={() => onPressItem(item)}
        >
          <Text style={styles.body}>{LABEL[item.type]}</Text>
          <Text style={styles.time}>{new Date(item.created_at).toLocaleString('ko-KR')}</Text>
        </Pressable>
      )}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.empty}>알림이 없습니다.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: tokens.space.md, gap: tokens.space.sm },
  card: {
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
    gap: 2,
  },
  unread: { backgroundColor: '#EAF2FF', borderColor: '#CFE0FF' },
  body: { fontSize: tokens.font.md, color: tokens.color.text },
  time: { fontSize: 11, color: tokens.color.textMuted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.space.xl },
  empty: { fontSize: tokens.font.md, color: tokens.color.textMuted },
});
