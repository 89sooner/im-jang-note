/**
 * D-011 설정/계정 — REL-001 범위: 프로필 표시, 워크스페이스 진입, 로그아웃.
 * (FR-AUTH-002/003, FR-SET-* 일부. 개인정보 동의/저하모드 등은 후속 슬라이스.)
 */
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { fetchMyProfile, requestAccountDeletion, signOut } from '@/features/auth/api';
import { useMyWorkspaces } from '@/features/workspace/hooks';
import { useAuthStore } from '@/stores/authStore';
import { toUserMessage } from '@/lib/errors';
import type { Workspace, WorkspaceRole } from '@/types/database';
import { Button } from '@/components/Button';
import { tokens } from '@/theme/tokens';

export default function SettingsScreen() {
  const router = useRouter();
  const reset = useAuthStore((s) => s.reset);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const profile = useQuery({
    queryKey: queryKeys.myProfile(),
    queryFn: fetchMyProfile,
  });
  const workspaces = useMyWorkspaces();

  async function handleSignOut() {
    setError(null);
    setSigningOut(true);
    try {
      await signOut();
      reset();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setSigningOut(false);
    }
  }

  function confirmAccountDeletion() {
    Alert.alert(
      '계정 탈퇴',
      '본인 작성 노트/코멘트가 삭제 예약되고, 30일 후 영구 삭제됩니다. 단독 소유 워크스페이스가 있으면 먼저 위임하거나 삭제해야 합니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: async () => {
            setError(null);
            setDeleting(true);
            try {
              await requestAccountDeletion();
              await signOut();
              reset();
            } catch (e) {
              setError(toUserMessage(e));
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.section}>계정</Text>
        <View style={styles.card}>
          <Text style={styles.label}>표시 이름</Text>
          <Text style={styles.value}>
            {profile.isPending ? '불러오는 중…' : profile.data?.display_name || '(미설정)'}
          </Text>
        </View>

        <Text style={styles.section}>워크스페이스</Text>
        <View style={styles.card}>
          {workspaces.isPending ? (
            <Text style={styles.value}>불러오는 중…</Text>
          ) : workspaces.data && workspaces.data.length > 0 ? (
            workspaces.data.map(({ workspace, role }: { workspace: Workspace; role: WorkspaceRole }) => (
              <View key={workspace.id} style={styles.wsRow}>
                <Text style={styles.value}>{workspace.name}</Text>
                <Text style={styles.role}>{role === 'owner' ? '소유자' : '파트너'}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.value}>아직 워크스페이스가 없습니다.</Text>
          )}
          <View style={{ height: tokens.space.sm }} />
          <Button label="워크스페이스 관리 / 초대" onPress={() => router.push('/workspace')} />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
        <View style={{ height: tokens.space.md }} />
        <Button label="로그아웃" variant="danger" onPress={handleSignOut} loading={signingOut} />
        <View style={{ height: tokens.space.sm }} />
        <Button
          label="계정 탈퇴"
          variant="secondary"
          onPress={confirmAccountDeletion}
          loading={deleting}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  container: { padding: tokens.space.lg, gap: tokens.space.sm },
  section: {
    fontSize: tokens.font.sm,
    color: tokens.color.textMuted,
    fontWeight: '700',
    marginTop: tokens.space.md,
  },
  card: {
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
    gap: tokens.space.xs,
  },
  label: { fontSize: tokens.font.sm, color: tokens.color.textMuted },
  value: { fontSize: tokens.font.md, color: tokens.color.text },
  wsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  role: { fontSize: tokens.font.sm, color: tokens.color.primary, fontWeight: '600' },
  error: { color: tokens.color.danger, fontSize: tokens.font.sm, marginTop: tokens.space.sm },
});
