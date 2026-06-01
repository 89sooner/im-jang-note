/**
 * 루트 레이아웃: Provider 설정 + 인증 게이트.
 * 비인증 → (auth), 인증 → (tabs). 세션 만료 시 안전 전환(FR-AUTH-003).
 */
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useSessionBootstrap } from '@/features/auth/useSession';
import { useAuthStore } from '@/stores/authStore';
import { tokens } from '@/theme/tokens';

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const session = useAuthStore((s) => s.session);
  const initializing = useAuthStore((s) => s.initializing);

  useEffect(() => {
    if (initializing) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)/map');
    }
  }, [session, initializing, segments, router]);

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={tokens.color.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="workspace" options={{ presentation: 'modal', headerShown: true, title: '워크스페이스' }} />
    </Stack>
  );
}

function Bootstrapper({ children }: { children: React.ReactNode }) {
  useSessionBootstrap();
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Bootstrapper>
          <StatusBar style="auto" />
          <AuthGate />
        </Bootstrapper>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
