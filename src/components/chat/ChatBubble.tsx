import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { colors, radii } from "../../theme/tokens";
import type { ChartInstruction, ChatMessage } from "../../types/ai";
import { ChartRenderer } from "../visualizations/ChartRenderer";
import { FullScreenChart } from "../visualizations/FullScreenChart";

interface ChatBubbleProps {
  message: ChatMessage;
}

/**
 * Chat message renderer.
 *
 * - User messages: right-aligned dark pill (per design's UserBubble).
 * - AI messages: flat document style (no bubble) so the response reads like
 *   a Claude / sample-1 response rather than a chat balloon.
 */
export function ChatBubble({ message }: ChatBubbleProps): JSX.Element {
  const isUser = message.role === "user";
  const [expandedChart, setExpandedChart] = useState<ChartInstruction | null>(null);

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.content}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.aiBlock}>
      {message.content ? <Markdown style={markdownStyles}>{message.content}</Markdown> : null}

      {message.charts?.length ? (
        <View style={styles.chartsContainer}>
          {message.charts.map((chart, index) => (
            <Pressable
              key={`${chart.chartType}-${index}`}
              onPress={() => setExpandedChart(chart)}
              style={({ pressed }) => [styles.chartCard, pressed ? styles.chartCardPressed : null]}
            >
              <View style={styles.chartCardHeader}>
                <Text style={styles.chartTitle}>{chart.title}</Text>
                <Text style={styles.expandHint}>Tap to expand ↗</Text>
              </View>
              <ChartRenderer chart={chart} height={220} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {message.source ? (
        <View style={styles.sourceBadge}>
          <Text style={styles.sourceText}>
            {message.source === "football db" ? "via Football DB" : "AI knowledge"}
          </Text>
        </View>
      ) : null}

      <FullScreenChart chart={expandedChart} onClose={() => setExpandedChart(null)} visible={Boolean(expandedChart)} />
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    alignItems: "flex-end",
    marginBottom: 14
  },
  userBubble: {
    backgroundColor: "#2a2a2d",
    borderRadius: 18,
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  userText: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 19
  },
  aiBlock: {
    marginBottom: 16
  },
  chartsContainer: {
    gap: 8,
    marginTop: 10
  },
  chartCard: {
    backgroundColor: colors.paper2,
    borderColor: colors.lineMuted,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 12
  },
  chartCardPressed: {
    opacity: 0.9
  },
  chartCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  chartTitle: {
    color: colors.ink2,
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginRight: 8,
    textTransform: "uppercase"
  },
  expandHint: {
    color: colors.ink3,
    fontSize: 10
  },
  sourceBadge: {
    alignSelf: "flex-start",
    borderColor: colors.lineSoft,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  sourceText: {
    color: colors.ink3,
    fontSize: 11
  }
});

const markdownStyles = {
  body: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 0,
    marginTop: 0
  },
  heading1: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
    marginBottom: 8
  },
  heading2: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 24,
    marginBottom: 8
  },
  heading3: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 22,
    marginBottom: 6
  },
  paragraph: {
    color: colors.ink,
    marginBottom: 8,
    marginTop: 0
  },
  list_item: {
    color: colors.ink,
    marginBottom: 4
  },
  bullet_list: {
    marginBottom: 8,
    marginTop: 0
  },
  ordered_list: {
    marginBottom: 8,
    marginTop: 0
  },
  strong: {
    color: colors.ink,
    fontWeight: "700"
  },
  em: {
    fontStyle: "italic"
  },
  link: {
    color: colors.accent,
    textDecorationLine: "underline"
  },
  code_inline: {
    backgroundColor: colors.paper2,
    color: colors.ink,
    paddingHorizontal: 4
  },
  fence: {
    backgroundColor: colors.paper2,
    borderRadius: 8,
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18,
    padding: 8
  }
} as const;
