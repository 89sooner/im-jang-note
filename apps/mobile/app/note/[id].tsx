/**
 * D-012 노트 상세 (FR-NOTE-002/004/006, FR-MEDIA-002).
 * 별점·체크리스트·사진·메모 표시. 코멘트(FR-COMMENT-001)는 REL-004.
 */
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useNoteDetail, useDeleteNote } from '@/features/note/hooks';
import { RatingStars } from '@/components/RatingStars';
import { Button } from '@/components/Button';
import { toUserMessage } from '@/lib/errors';
import { tokens } from '@/theme/tokens';
import type { ChecklistItem, Photo } from '@/types/database';

export default function NoteDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useNoteDetail(id ?? null);
  const del = useDeleteNote(detail.data?.workspace_id ?? null);

  function confirmDelete() {
    Alert.alert('노트 삭제', '이 노트를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await del.mutateAsync(id as string);
            router.back();
          } catch (e) {
            Alert.alert('삭제 실패', toUserMessage(e));
          }
        },
      },
    ]);
  }

  if (detail.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={tokens.color.primary} />
      </View>
    );
  }
  if (detail.isError || !detail.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{toUserMessage(detail.error)}</Text>
      </View>
    );
  }

  const note = detail.data;
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: '임장 노트' }} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headRow}>
          <RatingStars value={note.rating} />
          <Text style={styles.date}>{note.visited_at} 방문</Text>
        </View>

        {note.checklist.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.section}>체크리스트</Text>
            {note.checklist.map((c: ChecklistItem) => (
              <View key={c.category} style={styles.clRow}>
                <Text style={styles.clCat}>{c.category}</Text>
                <RatingStars value={c.score} size={16} />
                {c.memo ? <Text style={styles.clMemo}>{c.memo}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {note.photos.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.section}>사진</Text>
            <View style={styles.photoRow}>
              {note.photos.map((p: Photo) =>
                p.signed_url ? (
                  <Image key={p.id} source={{ uri: p.signed_url }} style={styles.photo} />
                ) : (
                  <View key={p.id} style={[styles.photo, styles.photoPlaceholder]} />
                ),
              )}
            </View>
          </View>
        )}

        {note.free_memo ? (
          <View style={styles.card}>
            <Text style={styles.section}>메모</Text>
            <Text style={styles.memo}>{note.free_memo}</Text>
          </View>
        ) : null}

        {/* 코멘트는 REL-004 */}
        <View style={{ height: tokens.space.md }} />
        <Button label="삭제" variant="danger" onPress={confirmDelete} loading={del.isPending} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  container: { padding: tokens.space.lg, gap: tokens.space.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.space.lg },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { fontSize: tokens.font.sm, color: tokens.color.textMuted },
  card: {
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
    gap: tokens.space.sm,
  },
  section: { fontSize: tokens.font.sm, color: tokens.color.textMuted, fontWeight: '700' },
  clRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, flexWrap: 'wrap' },
  clCat: { fontSize: tokens.font.md, color: tokens.color.text, width: 72 },
  clMemo: { fontSize: tokens.font.sm, color: tokens.color.textMuted, flex: 1 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  photo: { width: 100, height: 100, borderRadius: tokens.radius.sm },
  photoPlaceholder: { backgroundColor: tokens.color.surface },
  memo: { fontSize: tokens.font.md, color: tokens.color.text, lineHeight: 22 },
  error: { color: tokens.color.danger, fontSize: tokens.font.md },
});
