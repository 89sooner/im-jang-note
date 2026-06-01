/**
 * D-009 워크스페이스/공유·초대 (FR-WS-001~004).
 * REL-001 핵심 흐름: 워크스페이스 생성 → 초대 코드 발급 → (배우자) 초대 수락.
 * 딥링크 workspace?invite=<code> 로 진입 시 코드 자동 채움(F-002).
 */
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
  useAcceptInvite,
  useCreateInvite,
  useCreateWorkspace,
  useMembers,
  useMyWorkspaces,
} from '@/features/workspace/hooks';
import { toUserMessage } from '@/lib/errors';
import type { WorkspaceMember } from '@/types/database';
import { Button } from '@/components/Button';
import { tokens } from '@/theme/tokens';

export default function WorkspaceScreen() {
  const params = useLocalSearchParams<{ invite?: string }>();
  const workspaces = useMyWorkspaces();
  const createWs = useCreateWorkspace();
  const createInvite = useCreateInvite();
  const acceptInvite = useAcceptInvite();

  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 딥링크(F-002): invite 코드 자동 채움
  useEffect(() => {
    if (params.invite) setInviteCode(params.invite);
  }, [params.invite]);

  const firstWs = workspaces.data?.[0];
  const isOwner = firstWs?.role === 'owner';
  const members = useMembers(firstWs?.workspace.id ?? null);

  async function handleCreate() {
    setError(null);
    if (!name.trim()) {
      setError('워크스페이스 이름을 입력해 주세요.');
      return;
    }
    try {
      await createWs.mutateAsync(name.trim());
      setName('');
    } catch (e) {
      setError(toUserMessage(e));
    }
  }

  async function handleInvite() {
    setError(null);
    if (!firstWs) return;
    try {
      const invite = await createInvite.mutateAsync(firstWs.workspace.id);
      setIssuedCode(invite.code);
    } catch (e) {
      setError(toUserMessage(e));
    }
  }

  async function handleAccept() {
    setError(null);
    if (!inviteCode.trim()) {
      setError('초대 코드를 입력해 주세요.');
      return;
    }
    try {
      await acceptInvite.mutateAsync(inviteCode.trim());
      setInviteCode('');
    } catch (e) {
      setError(toUserMessage(e));
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        {error && <Text style={styles.error}>{error}</Text>}

        {/* 현재 워크스페이스 */}
        {workspaces.isPending ? (
          <Text style={styles.value}>불러오는 중…</Text>
        ) : firstWs ? (
          <View style={styles.card}>
            <Text style={styles.section}>현재 워크스페이스</Text>
            <Text style={styles.title}>{firstWs.workspace.name}</Text>
            <Text style={styles.role}>{isOwner ? '소유자' : '파트너'}</Text>
            <View style={styles.divider} />
            <Text style={styles.label}>멤버 {members.data?.length ?? '…'} / 2</Text>
            {members.data?.map((m: WorkspaceMember) => (
              <Text key={m.id} style={styles.value}>
                · {m.role === 'owner' ? '소유자' : '파트너'}
              </Text>
            ))}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.section}>워크스페이스 만들기</Text>
            <Text style={styles.help}>부부가 함께 쓸 공유 공간을 만드세요.</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 우리집 후보"
              value={name}
              onChangeText={setName}
              accessibilityLabel="워크스페이스 이름"
            />
            <Button label="만들기" onPress={handleCreate} loading={createWs.isPending} />
          </View>
        )}

        {/* 초대 발급 (소유자) */}
        {firstWs && isOwner && (members.data?.length ?? 0) < 2 && (
          <View style={styles.card}>
            <Text style={styles.section}>배우자 초대</Text>
            <Text style={styles.help}>초대 코드를 발급해 배우자에게 전달하세요. (기본 24시간 유효)</Text>
            <Button label="초대 코드 발급" onPress={handleInvite} loading={createInvite.isPending} />
            {issuedCode && (
              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>초대 코드</Text>
                <Text selectable style={styles.code}>{issuedCode}</Text>
              </View>
            )}
          </View>
        )}

        {/* 초대 수락 (워크스페이스 없을 때) */}
        {!firstWs && (
          <View style={styles.card}>
            <Text style={styles.section}>초대 받았나요?</Text>
            <Text style={styles.help}>배우자에게 받은 초대 코드를 입력하세요.</Text>
            <TextInput
              style={styles.input}
              placeholder="초대 코드"
              autoCapitalize="none"
              value={inviteCode}
              onChangeText={setInviteCode}
              accessibilityLabel="초대 코드"
            />
            <Button label="수락하기" onPress={handleAccept} loading={acceptInvite.isPending} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  container: { padding: tokens.space.lg, gap: tokens.space.md },
  card: {
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
    gap: tokens.space.sm,
  },
  section: { fontSize: tokens.font.sm, color: tokens.color.textMuted, fontWeight: '700' },
  title: { fontSize: tokens.font.xl, fontWeight: '700', color: tokens.color.text },
  role: { fontSize: tokens.font.sm, color: tokens.color.primary, fontWeight: '600' },
  label: { fontSize: tokens.font.sm, color: tokens.color.textMuted },
  value: { fontSize: tokens.font.md, color: tokens.color.text },
  help: { fontSize: tokens.font.sm, color: tokens.color.textMuted },
  input: {
    minHeight: tokens.touchTarget,
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    fontSize: tokens.font.md,
    color: tokens.color.text,
  },
  divider: { height: 1, backgroundColor: tokens.color.border, marginVertical: tokens.space.xs },
  codeBox: {
    marginTop: tokens.space.sm,
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.surface,
  },
  codeLabel: { fontSize: tokens.font.sm, color: tokens.color.textMuted },
  code: { fontSize: tokens.font.lg, fontWeight: '700', color: tokens.color.text },
  error: { color: tokens.color.danger, fontSize: tokens.font.sm },
});
