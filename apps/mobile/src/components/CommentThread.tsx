/**
 * C-007 CommentThread — 노트 코멘트 목록 + 작성 입력 (FR-COMMENT-001).
 * 배우자와 실시간 의견 교환(FR-WS-003은 상위 Realtime 구독이 담당).
 */
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useComments, useAddComment } from '@/features/comment/hooks';
import { Button } from './Button';
import { toUserMessage } from '@/lib/errors';
import { tokens } from '@/theme/tokens';
import type { Comment } from '@/types/database';

export function CommentThread({ noteId, myUserId }: { noteId: string; myUserId?: string }) {
  const comments = useComments(noteId);
  const add = useAddComment(noteId);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!body.trim()) return;
    try {
      await add.mutateAsync(body.trim());
      setBody('');
    } catch (e) {
      setError(toUserMessage(e));
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.section}>코멘트 {comments.data?.length ?? 0}</Text>

      {comments.data?.length === 0 && (
        <Text style={styles.empty}>아직 코멘트가 없습니다. 첫 의견을 남겨보세요.</Text>
      )}
      {comments.data?.map((c: Comment) => (
        <View key={c.id} style={[styles.bubble, c.author_id === myUserId && styles.mine]}>
          <Text style={styles.body}>{c.body}</Text>
          <Text style={styles.time}>{new Date(c.created_at).toLocaleString('ko-KR')}</Text>
        </View>
      ))}

      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="코멘트 입력"
          value={body}
          onChangeText={setBody}
          multiline
          accessibilityLabel="코멘트 입력"
        />
        <Button label="등록" onPress={submit} loading={add.isPending} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: tokens.space.sm },
  section: { fontSize: tokens.font.sm, color: tokens.color.textMuted, fontWeight: '700' },
  empty: { fontSize: tokens.font.sm, color: tokens.color.textMuted },
  bubble: {
    padding: tokens.space.sm,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.surface,
    gap: 2,
  },
  mine: { backgroundColor: '#E5EFFF' },
  body: { fontSize: tokens.font.md, color: tokens.color.text },
  time: { fontSize: 11, color: tokens.color.textMuted },
  inputRow: { gap: tokens.space.sm, marginTop: tokens.space.xs },
  input: {
    minHeight: tokens.touchTarget,
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    paddingTop: tokens.space.sm,
    fontSize: tokens.font.md,
    color: tokens.color.text,
  },
  error: { color: tokens.color.danger, fontSize: tokens.font.sm },
});
