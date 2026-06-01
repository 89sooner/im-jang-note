/**
 * 인증 셸: 하단 5탭 (product_ia.md 전역 내비게이션).
 * 지도 / 피드 / 즐겨찾기 / 알림 / 설정.
 */
import { Tabs } from 'expo-router';
import { tokens } from '@/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: tokens.color.primary,
        tabBarInactiveTintColor: tokens.color.textMuted,
      }}
    >
      <Tabs.Screen name="map" options={{ title: '지도' }} />
      <Tabs.Screen name="feed" options={{ title: '피드' }} />
      <Tabs.Screen name="favorites" options={{ title: '즐겨찾기' }} />
      <Tabs.Screen name="notifications" options={{ title: '알림' }} />
      <Tabs.Screen name="settings" options={{ title: '설정' }} />
    </Tabs>
  );
}
