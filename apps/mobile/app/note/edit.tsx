/**
 * D-004 노트 작성/편집 (FR-NOTE-001~004/006, FR-MEDIA-001, FR-SET-002).
 * 별점(C-004) + 체크리스트(C-005) + 사진(C-006) + 자유 메모. 저장은 rpc_save_note(원자).
 * 사진은 동의(ADR-006) 후 EXIF 제거(picker exif:false)하여 서명 URL 업로드.
 */
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSaveNote } from '@/features/note/hooks';
import { requestUploadUrls, uploadPhoto } from '@/features/note/api';
import { useMyWorkspaces } from '@/features/workspace/hooks';
import { useConsentStore } from '@/stores/consentStore';
import { RatingStars } from '@/components/RatingStars';
import { ChecklistInput } from '@/components/ChecklistInput';
import { PhotoGrid, type PhotoTile } from '@/components/PhotoGrid';
import { Button } from '@/components/Button';
import { toUserMessage } from '@/lib/errors';
import { tokens } from '@/theme/tokens';
import type { ChecklistItem } from '@/types/database';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function NoteEditScreen() {
  const router = useRouter();
  const { complexId } = useLocalSearchParams<{ complexId: string }>();
  const workspaces = useMyWorkspaces();
  const saveNote = useSaveNote();
  const photoConsent = useConsentStore((s) => s.photo);
  const setPhotoConsent = useConsentStore((s) => s.setPhoto);

  const [visitedAt, setVisitedAt] = useState(todayISO());
  const [rating, setRating] = useState(0);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [memo, setMemo] = useState('');
  const [localPhotos, setLocalPhotos] = useState<PhotoTile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const workspaceId = workspaces.data?.[0]?.workspace.id ?? null;

  async function pickPhoto() {
    if (!photoConsent) {
      Alert.alert(
        '사진 첨부 동의',
        '현장 사진을 노트에 첨부합니다. 사진의 위치정보(EXIF)는 업로드 시 제거됩니다.',
        [
          { text: '취소', style: 'cancel' },
          { text: '동의', onPress: () => setPhotoConsent(true) },
        ],
      );
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      exif: false, // EXIF GPS 제거 (ADR-006)
    });
    if (!res.canceled && res.assets[0]) {
      setLocalPhotos((prev) => [...prev, { key: `${Date.now()}`, uri: res.assets[0].uri }]);
    }
  }

  async function submit() {
    setError(null);
    if (!workspaceId) {
      setError('워크스페이스가 필요합니다. 먼저 워크스페이스를 만들어 주세요.');
      return;
    }
    if (!complexId) {
      setError('단지 정보가 없습니다.');
      return;
    }
    if (rating < 1) {
      setError('별점을 선택해 주세요.');
      return;
    }
    setBusy(true);
    try {
      // 1) 노트 + 체크리스트 원자 저장
      const note = await saveNote.mutateAsync({
        workspace_id: workspaceId,
        complex_id: complexId,
        visited_at: visitedAt,
        rating,
        free_memo: memo,
        checklist,
      });
      // 2) 사진 업로드 (있으면)
      if (localPhotos.length > 0) {
        const urls = await requestUploadUrls(note.note_id, localPhotos.length);
        await Promise.all(
          localPhotos.map((p, i) => (p.uri ? uploadPhoto(urls[i], p.uri) : Promise.resolve())),
        );
      }
      router.replace(`/note/${note.note_id}`);
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: '임장 노트 작성' }} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Field label="방문일">
          <TextInput
            style={styles.input}
            value={visitedAt}
            onChangeText={setVisitedAt}
            placeholder="YYYY-MM-DD"
            accessibilityLabel="방문일"
          />
        </Field>

        <Field label="종합 별점">
          <RatingStars value={rating} onChange={setRating} />
        </Field>

        <Field label="체크리스트">
          <ChecklistInput value={checklist} onChange={setChecklist} />
        </Field>

        <Field label="사진">
          <PhotoGrid
            photos={localPhotos}
            onAdd={pickPhoto}
            onRemove={(key) => setLocalPhotos((prev) => prev.filter((p) => p.key !== key))}
          />
        </Field>

        <Field label="메모">
          <TextInput
            style={[styles.input, styles.memo]}
            value={memo}
            onChangeText={setMemo}
            placeholder="자유롭게 기록하세요 (최대 2000자)"
            maxLength={2000}
            multiline
            accessibilityLabel="자유 메모"
          />
        </Field>

        {error && <Text style={styles.error}>{error}</Text>}
        <View style={{ height: tokens.space.sm }} />
        <Button label="저장" onPress={submit} loading={busy} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  container: { padding: tokens.space.lg, gap: tokens.space.lg },
  field: { gap: tokens.space.sm },
  label: { fontSize: tokens.font.sm, color: tokens.color.textMuted, fontWeight: '700' },
  input: {
    minHeight: tokens.touchTarget,
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    fontSize: tokens.font.md,
    color: tokens.color.text,
  },
  memo: { minHeight: 100, paddingTop: tokens.space.sm, textAlignVertical: 'top' },
  error: { color: tokens.color.danger, fontSize: tokens.font.sm },
});
