import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

interface SuggestedPromptsProps {
  prompts: string[];
  onSelectPrompt: (prompt: string) => void;
}

export function SuggestedPrompts({ prompts, onSelectPrompt }: SuggestedPromptsProps): JSX.Element {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {prompts.map((prompt) => (
          <Pressable
            key={prompt}
            onPress={() => onSelectPrompt(prompt)}
            style={({ pressed }) => [styles.chip, pressed ? styles.chipPressed : null]}
          >
            <Text style={styles.chipText}>{prompt}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10
  },
  chip: {
    backgroundColor: "#F2F4F5",
    borderColor: "#d8d8d8",
    borderRadius: 99,
    borderWidth: 1,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  chipPressed: {
    opacity: 0.85
  },
  chipText: {
    color: "#222222",
    fontSize: 13
  }
});
