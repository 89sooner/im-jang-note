/**
 * Supabase 클라이언트 (ADR-002).
 * 세션은 AsyncStorage에 영속, 토큰 자동 갱신(FR-AUTH-003).
 * anon key만 클라이언트에 포함하며 데이터 접근은 RLS로 보호한다(NFR-002).
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // 개발 초기 흔한 실수를 명확히 표면화 (상태 매트릭스: recoverable_error)
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY 가 비어 있습니다. apps/mobile/.env 를 설정하세요.',
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // 네이티브 앱
  },
});
