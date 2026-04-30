import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../../theme/tokens";

interface SuggestedPromptsProps {
  prompts: string[];
  onSelectPrompt: (prompt: string) => void;
}

/**
 * Stacked suggested prompts (per ChatEmptyA / ChatEmptyD).
 * Each prompt is its own bordered row so users can tap to populate a
 * conversation starter — always visible above the composer in empty state.
 */
export function SuggestedPrompts({ prompts, onSelectPrompt }: SuggestedPromptsProps): JSX.Element {
  return (
    <View style={styles.container}>
      {prompts.map((prompt) => (
        <Pressable
          key={prompt}
          onPress={() => onSelectPrompt(prompt)}
          style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
        >
          <Text style={styles.text}>{prompt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8
  },
  row: {
    borderColor: colors.lineMuted,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  rowPressed: {
    backgroundColor: colors.paper2
  },
  text: {
    color: colors.ink2,
    fontSize: 13
  }
});
