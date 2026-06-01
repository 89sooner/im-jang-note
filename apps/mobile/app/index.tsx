import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

/** 진입점: 세션 유무에 따라 분기 (게이트는 _layout이 보강) */
export default function Index() {
  const session = useAuthStore((s) => s.session);
  return <Redirect href={session ? '/(tabs)/map' : '/(auth)/login'} />;
}
