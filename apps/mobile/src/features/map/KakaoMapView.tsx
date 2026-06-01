/**
 * Kakao 지도 WebView 래퍼 (D-002 지도 레이어, ADR-003).
 * 상위는 동일 props 인터페이스(markers/onRegionChange/onMarkerPress)만 본다(NFR-007 어댑터 경계).
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { buildKakaoMapHtml } from './kakaoMapHtml';
import type { BBox, Marker } from '@/types/database';
import { tokens } from '@/theme/tokens';

const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY;

interface Props {
  markers: Marker[];
  initial: { lat: number; lng: number };
  onRegionChange: (center: { lat: number; lng: number }, zoom: number, bbox: BBox) => void;
  onMarkerPress: (complexId: string) => void;
}

export function KakaoMapView({ markers, initial, onRegionChange, onMarkerPress }: Props) {
  const ref = useRef<WebView>(null);
  const html = useMemo(
    () => buildKakaoMapHtml(KAKAO_JS_KEY ?? '', initial.lat, initial.lng),
    [initial.lat, initial.lng],
  );

  const pushMarkers = useCallback(() => {
    const json = JSON.stringify(markers).replace(/'/g, "\\'");
    ref.current?.injectJavaScript(`window.__setMarkers && window.__setMarkers('${json}'); true;`);
  }, [markers]);

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(e.nativeEvent.data);
        if (msg.type === 'ready') pushMarkers();
        else if (msg.type === 'region') onRegionChange(msg.center, msg.zoom, msg.bbox);
        else if (msg.type === 'marker') onMarkerPress(msg.complex_id);
      } catch {
        /* ignore malformed bridge messages */
      }
    },
    [onRegionChange, onMarkerPress, pushMarkers],
  );

  // 마커 변경 시 주입 (렌더 부작용 회피)
  useEffect(() => {
    pushMarkers();
  }, [pushMarkers]);

  if (!KAKAO_JS_KEY) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>지도 키가 필요합니다</Text>
        <Text style={styles.fallbackBody}>
          apps/mobile/.env 의 EXPO_PUBLIC_KAKAO_JS_KEY 를 설정하세요. (Kakao JavaScript Key)
        </Text>
      </View>
    );
  }

  return (
    <WebView
      ref={ref}
      originWhitelist={['*']}
      source={{ html }}
      onMessage={onMessage}
      javaScriptEnabled
      domStorageEnabled
      style={styles.web}
    />
  );
}

const styles = StyleSheet.create({
  web: { flex: 1 },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.space.lg,
    gap: tokens.space.sm,
    backgroundColor: tokens.color.surface,
  },
  fallbackTitle: { fontSize: tokens.font.lg, fontWeight: '700', color: tokens.color.text },
  fallbackBody: { fontSize: tokens.font.sm, color: tokens.color.textMuted, textAlign: 'center' },
});
