import { StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../../theme/tokens";

interface LivePillProps {
  label: string;
}

export function LivePill({ label }: LivePillProps): JSX.Element {
  return (
    <View style={styles.pill}>
      <View style={styles.dot} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: "center",
    backgroundColor: colors.liveSoft,
    borderColor: colors.liveBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  dot: {
    backgroundColor: colors.live,
    borderRadius: 3,
    height: 6,
    width: 6
  },
  label: {
    color: colors.live,
    fontSize: 11,
    fontWeight: "700"
  }
});
