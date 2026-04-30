import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../../theme/tokens";
import { SparkleIcon } from "./Icons";

interface AIPillProps {
  label: string;
  onPress?: () => void;
  filled?: boolean;
}

export function AIPill({ label, onPress, filled = false }: AIPillProps): JSX.Element {
  const content = (
    <View style={[styles.pill, filled ? styles.pillFilled : null]}>
      <SparkleIcon size={10} color={colors.accent} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: "center",
    borderColor: colors.accent,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  pillFilled: {
    backgroundColor: colors.accentSoft
  },
  label: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "600"
  },
  pressed: {
    opacity: 0.7
  }
});
