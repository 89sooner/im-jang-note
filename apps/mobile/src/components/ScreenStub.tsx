/**
 * REL-002+ 화면 자리표시 스텁. 빈 라우트/장식용 목업 금지 원칙(implementation_request §6)에 따라
 * 각 화면의 책임·요구사항·릴리스 슬라이스를 명시해 "의도된 미구현"임을 표면화한다.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tokens } from '@/theme/tokens';

interface Props {
  screenId: string;
  title: string;
  requirements: string;
  releaseSlice: string;
}

export function ScreenStub({ screenId, title, requirements, releaseSlice }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.badge}>{screenId}</Text>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.card}>
          <Text style={styles.label}>요구사항</Text>
          <Text style={styles.value}>{requirements}</Text>
          <Text style={styles.label}>릴리스 슬라이스</Text>
          <Text style={styles.value}>{releaseSlice}</Text>
          <Text style={styles.note}>
            이 화면은 REL-001 골격 범위 밖이며 해당 슬라이스에서 구현됩니다.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  container: { padding: tokens.space.lg, gap: tokens.space.sm },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: tokens.color.surface,
    color: tokens.color.textMuted,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
    fontSize: tokens.font.sm,
    fontWeight: '700',
  },
  title: { fontSize: tokens.font.xl, fontWeight: '700', color: tokens.color.text },
  card: {
    marginTop: tokens.space.md,
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
    gap: tokens.space.xs,
  },
  label: {
    fontSize: tokens.font.sm,
    color: tokens.color.textMuted,
    marginTop: tokens.space.sm,
    fontWeight: '600',
  },
  value: { fontSize: tokens.font.md, color: tokens.color.text },
  note: { marginTop: tokens.space.md, fontSize: tokens.font.sm, color: tokens.color.textMuted },
});
