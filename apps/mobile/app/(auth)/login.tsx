/**
 * D-001 온보딩/로그인 (FR-AUTH-001~003).
 * 이메일 로그인/가입. 가입 시 user_profile은 DB 트리거가 생성(FR-AUTH-002).
 */
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithPassword, signUpWithPassword } from '@/features/auth/api';
import { toUserMessage } from '@/lib/errors';
import { Button } from '@/components/Button';
import { tokens } from '@/theme/tokens';

type Mode = 'signIn' | 'signUp';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setInfo(null);
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signIn') {
        await signInWithPassword(email.trim(), password);
        // 세션 변경은 onAuthStateChange → 게이트가 자동 전환
      } else {
        const res = await signUpWithPassword(email.trim(), password, displayName.trim());
        if (!res.session) {
          setInfo('가입 확인 메일을 확인해 주세요. (이메일 확인이 켜진 경우)');
        }
      }
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Text style={styles.brand}>임장노트</Text>
          <Text style={styles.subtitle}>부부가 함께 쓰는 임장 기록</Text>

          {mode === 'signUp' && (
            <TextInput
              style={styles.input}
              placeholder="표시 이름 (선택)"
              autoCapitalize="none"
              value={displayName}
              onChangeText={setDisplayName}
              accessibilityLabel="표시 이름"
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="이메일"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            accessibilityLabel="이메일"
          />
          <TextInput
            style={styles.input}
            placeholder="비밀번호"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            accessibilityLabel="비밀번호"
          />

          {error && <Text style={styles.error}>{error}</Text>}
          {info && <Text style={styles.info}>{info}</Text>}

          <Button
            label={mode === 'signIn' ? '로그인' : '가입하기'}
            onPress={submit}
            loading={loading}
          />
          <Button
            variant="secondary"
            label={mode === 'signIn' ? '계정이 없으신가요? 가입' : '이미 계정이 있으신가요? 로그인'}
            onPress={() => {
              setMode(mode === 'signIn' ? 'signUp' : 'signIn');
              setError(null);
              setInfo(null);
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', padding: tokens.space.lg, gap: tokens.space.sm },
  brand: { fontSize: 32, fontWeight: '800', color: tokens.color.text, textAlign: 'center' },
  subtitle: {
    fontSize: tokens.font.md,
    color: tokens.color.textMuted,
    textAlign: 'center',
    marginBottom: tokens.space.lg,
  },
  input: {
    minHeight: tokens.touchTarget,
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    fontSize: tokens.font.md,
    color: tokens.color.text,
    backgroundColor: tokens.color.bg,
  },
  error: { color: tokens.color.danger, fontSize: tokens.font.sm },
  info: { color: tokens.color.success, fontSize: tokens.font.sm },
});
