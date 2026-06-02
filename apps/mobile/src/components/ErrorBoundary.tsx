/**
 * 앱 전역 에러 바운더리 (NFR-004/006).
 * 자식 트리에서 렌더 오류 발생 시 안전 화면으로 fallback, 텔레메트리에 기록.
 */
import { Component, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { track } from '@/lib/telemetry';
import { Button } from './Button';
import { tokens } from '@/theme/tokens';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    track('app_error', { message: error.message, stack: info.componentStack });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container} accessibilityRole="alert">
          <Text style={styles.title}>문제가 발생했습니다</Text>
          <Text style={styles.body}>잠시 후 다시 시도해 주세요.</Text>
          <Text style={styles.detail} numberOfLines={3}>
            {this.state.error.message}
          </Text>
          <Button label="다시 시도" onPress={this.reset} />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.space.xl,
    gap: tokens.space.sm,
    backgroundColor: tokens.color.bg,
  },
  title: { fontSize: tokens.font.xl, fontWeight: '700', color: tokens.color.text },
  body: { fontSize: tokens.font.md, color: tokens.color.textMuted, textAlign: 'center' },
  detail: { fontSize: tokens.font.sm, color: tokens.color.danger, textAlign: 'center' },
});
