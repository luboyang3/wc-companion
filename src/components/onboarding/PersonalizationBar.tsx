import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

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
      <Text style={styles.label}>Your AI is {boundedScore}% personalized</Text>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: widthInterpolate }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16
  },
  label: {
    color: "#222222",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8
  },
  track: {
    backgroundColor: "#e6e8ea",
    borderRadius: 99,
    height: 10,
    overflow: "hidden"
  },
  fill: {
    backgroundColor: "#006341",
    borderRadius: 99,
    height: "100%"
  }
});
