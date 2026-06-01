/**
 * C-010 SearchBar — 검색어 입력·검색 진입 (FR-SEARCH-001).
 */
import { StyleSheet, TextInput, View } from 'react-native';
import { tokens } from '@/theme/tokens';

interface Props {
  query: string;
  onChange: (q: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}

export function SearchBar({ query, onChange, onSubmit, placeholder }: Props) {
  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        placeholder={placeholder ?? '지역·단지명 검색'}
        accessibilityLabel="검색어"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: tokens.space.md, paddingVertical: tokens.space.sm },
  input: {
    minHeight: tokens.touchTarget,
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: 999,
    paddingHorizontal: tokens.space.md,
    fontSize: tokens.font.md,
    color: tokens.color.text,
    backgroundColor: tokens.color.bg,
  },
});
