/**
 * D-002 지도 홈 (FR-MAP-001~004).
 * Kakao 지도 위 단지 마커(뷰포트 bbox 질의) → 마커 탭 시 단지 상세(D-003) 진입.
 * 현위치 이동(FR-MAP-004). 노트 목록 통합/검색은 후속 슬라이스.
 */
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { KakaoMapView } from '@/features/map/KakaoMapView';
import { useMarkers } from '@/features/complex/hooks';
import { useMyWorkspaces } from '@/features/workspace/hooks';
import { useMapStore } from '@/stores/mapStore';
import { tokens } from '@/theme/tokens';
import type { BBox } from '@/types/database';

export default function MapScreen() {
  const router = useRouter();
  const center = useMapStore((s) => s.center);
  const bbox = useMapStore((s) => s.bbox);
  const zoom = useMapStore((s) => s.zoom);
  const setViewport = useMapStore((s) => s.setViewport);

  const workspaces = useMyWorkspaces();
  const workspaceId = workspaces.data?.[0]?.workspace.id ?? null;
  const markersQuery = useMarkers(bbox, zoom, workspaceId);

  const onRegionChange = useCallback(
    (c: { lat: number; lng: number }, z: number, b: BBox) => setViewport(c, z, b),
    [setViewport],
  );

  const onMarkerPress = useCallback(
    (complexId: string) => router.push(`/complex/${complexId}`),
    [router],
  );

  const goToCurrentLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return; // 권한 거부: 현 중심 유지(상태매트릭스 no_permission)
    const pos = await Location.getCurrentPositionAsync({});
    useMapStore.getState().setViewport(
      { lat: pos.coords.latitude, lng: pos.coords.longitude },
      zoom,
      bbox as BBox,
    );
  }, [zoom, bbox]);

  return (
    <View style={styles.container}>
      <KakaoMapView
        markers={markersQuery.data ?? []}
        initial={center}
        onRegionChange={onRegionChange}
        onMarkerPress={onMarkerPress}
      />

      {/* 마커 로딩/개수 표시 */}
      <View style={styles.overlayTop} pointerEvents="none">
        <View style={styles.pill}>
          {markersQuery.isFetching ? (
            <ActivityIndicator size="small" color={tokens.color.primary} />
          ) : (
            <Text style={styles.pillText}>단지 {markersQuery.data?.length ?? 0}곳</Text>
          )}
        </View>
      </View>

      {/* 검색 진입 (FR-SEARCH-001) */}
      <Pressable
        style={styles.searchBtn}
        onPress={() => router.push('/search')}
        accessibilityRole="button"
        accessibilityLabel="검색"
      >
        <Text style={styles.searchText}>🔍  지역·단지명 검색</Text>
      </Pressable>

      {/* 현위치 버튼 (FR-MAP-004) */}
      <Pressable
        style={styles.locBtn}
        onPress={goToCurrentLocation}
        accessibilityRole="button"
        accessibilityLabel="현위치로 이동"
      >
        <Text style={styles.locIcon}>◎</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.color.bg },
  overlayTop: { position: 'absolute', top: tokens.space.md, alignSelf: 'center' },
  pill: {
    backgroundColor: tokens.color.bg,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tokens.color.border,
    minHeight: 32,
    justifyContent: 'center',
  },
  pillText: { fontSize: tokens.font.sm, color: tokens.color.text, fontWeight: '600' },
  searchBtn: {
    position: 'absolute',
    top: tokens.space.lg + 28,
    left: tokens.space.md,
    right: tokens.space.md,
    backgroundColor: tokens.color.bg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tokens.color.border,
    paddingHorizontal: tokens.space.md,
    minHeight: tokens.touchTarget,
    justifyContent: 'center',
  },
  searchText: { fontSize: tokens.font.md, color: tokens.color.textMuted },
  locBtn: {
    position: 'absolute',
    right: tokens.space.md,
    bottom: tokens.space.lg,
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    borderRadius: tokens.touchTarget / 2,
    backgroundColor: tokens.color.bg,
    borderWidth: 1,
    borderColor: tokens.color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locIcon: { fontSize: 22, color: tokens.color.primary },
});
