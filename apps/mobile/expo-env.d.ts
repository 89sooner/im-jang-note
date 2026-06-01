/// <reference types="expo/types" />

// EXPO_PUBLIC_* 환경변수 타입 힌트
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
  }
}
