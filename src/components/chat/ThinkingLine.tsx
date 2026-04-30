import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/tokens";

interface ThinkingLineProps {
  text?: string;
}

/**
 * Pulsing dot + status line shown while the AI is reasoning before tokens
 * start streaming back. Mirrors the Claude-style "thinking" indicator from
 * the design's ChatThinking state.
 */
export function ThinkingLine({ text = "Thinking" }: ThinkingLineProps): JSX.Element {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.25] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <View style={styles.row}>
      <View style={styles.dotWrap}>
        <Animated.View style={[styles.halo, { opacity, transform: [{ scale }] }]} />
        <View style={styles.dot} />
      </View>
      <Text style={styles.text}>{text}…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 16
  },
  dotWrap: {
    alignItems: "center",
    height: 14,
    justifyContent: "center",
    width: 14
  },
  halo: {
    backgroundColor: colors.ink2,
    borderRadius: 9,
    height: 18,
    opacity: 0.2,
    position: "absolute",
    width: 18
  },
  dot: {
    backgroundColor: colors.ink,
    borderRadius: 5,
    height: 10,
    width: 10
  },
  text: {
    color: colors.ink2,
    fontSize: 13
  }
});
