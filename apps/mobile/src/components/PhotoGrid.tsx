/**
 * C-006 PhotoGrid — 사진 그리드 + 추가/삭제 (FR-MEDIA-001/002).
 * 추가는 expo-image-picker(EXIF 제거, ADR-006). 표시는 로컬 URI 또는 서명 URL.
 */
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '@/theme/tokens';

export interface PhotoTile {
  key: string;
  uri?: string; // 로컬 URI(작성 중) 또는 서명 URL(조회)
}

interface Props {
  photos: PhotoTile[];
  onAdd?: () => void;
  onRemove?: (key: string) => void;
  maxCount?: number;
}

export function PhotoGrid({ photos, onAdd, onRemove, maxCount = 10 }: Props) {
  const canAdd = onAdd && photos.length < maxCount;
  return (
    <View style={styles.grid}>
      {photos.map((p) => (
        <View key={p.key} style={styles.tile}>
          {p.uri ? <Image source={{ uri: p.uri }} style={styles.img} /> : <View style={styles.imgPlaceholder} />}
          {onRemove && (
            <Pressable
              style={styles.remove}
              onPress={() => onRemove(p.key)}
              accessibilityRole="button"
              accessibilityLabel="사진 삭제"
              hitSlop={6}
            >
              <Text style={styles.removeText}>×</Text>
            </Pressable>
          )}
        </View>
      ))}
      {canAdd && (
        <Pressable
          style={[styles.tile, styles.addTile]}
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel="사진 추가"
        >
          <Text style={styles.addIcon}>＋</Text>
        </Pressable>
      )}
    </View>
  );
}

const TILE = 96;
const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  tile: { width: TILE, height: TILE, borderRadius: tokens.radius.sm, overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: { width: '100%', height: '100%', backgroundColor: tokens.color.surface },
  addTile: {
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: { fontSize: 28, color: tokens.color.textMuted },
  remove: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#fff', fontSize: 16, lineHeight: 18 },
});
