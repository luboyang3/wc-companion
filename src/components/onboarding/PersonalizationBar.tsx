import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../../theme/tokens";

interface PersonalizationBarProps {
  score: number;
}

export function PersonalizationBar({ score }: PersonalizationBarProps): JSX.Element {
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const boundedScore = Math.max(0, Math.min(100, score));

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: boundedScore,
      duration: 350,
      useNativeDriver: false
    }).start();
  }, [animatedProgress, boundedScore]);

  const widthInterpolate = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"]
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>
          Your AI is <Text style={styles.accent}>{boundedScore}%</Text> personalized
        </Text>
        <Text style={styles.action}>Improve →</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: widthInterpolate }]} />
      </View>
      {boundedScore < 100 ? (
        <Text style={styles.hint}>Add club team & nationality for full personalization</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderColor: colors.lineMuted,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  label: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700"
  },
  accent: {
    color: colors.accent
  },
  action: {
    color: colors.accent,
    fontSize: 12
  },
  track: {
    backgroundColor: colors.lineMuted,
    borderRadius: 3,
    height: 6,
    overflow: "hidden"
  },
  fill: {
    backgroundColor: colors.accent,
    borderRadius: 3,
    height: "100%"
  },
  hint: {
    color: colors.ink3,
    fontSize: 11,
    marginTop: 6
  }
});
