import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Markdown from "react-native-markdown-display";
import type { ChartInstruction, ChatMessage } from "../../types/ai";
import { ChartRenderer } from "../visualizations/ChartRenderer";
import { FullScreenChart } from "../visualizations/FullScreenChart";

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps): JSX.Element {
  const isUser = message.role === "user";
  const [expandedChart, setExpandedChart] = useState<ChartInstruction | null>(null);

  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.aiRow]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {isUser ? (
          <Text style={[styles.content, styles.userContent]}>{message.content}</Text>
        ) : (
          <Markdown style={markdownStyles}>{message.content}</Markdown>
        )}

        {!isUser && message.charts?.length ? (
          <View style={styles.chartsContainer}>
            {message.charts.map((chart, index) => (
              <Pressable key={`${chart.chartType}-${index}`} onPress={() => setExpandedChart(chart)} style={styles.chartCard}>
                <View style={styles.chartCardHeader}>
                  <Text style={styles.chartTitle}>{chart.title}</Text>
                  <Text style={styles.expandHint}>Expand</Text>
                </View>
                <ChartRenderer chart={chart} height={220} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {!isUser && message.source ? (
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceText}>
              {message.source === "football db" ? "via Football DB" : "AI knowledge"}
            </Text>
          </View>
        ) : null}
      </View>
      <FullScreenChart chart={expandedChart} onClose={() => setExpandedChart(null)} visible={Boolean(expandedChart)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 10
  },
  userRow: {
    alignItems: "flex-end"
  },
  aiRow: {
    alignItems: "flex-start"
  },
  bubble: {
    borderRadius: 12,
    maxWidth: "88%",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  userBubble: {
    backgroundColor: "#006341"
  },
  aiBubble: {
    backgroundColor: "#F2F4F5"
  },
  content: {
    fontSize: 15,
    lineHeight: 20
  },
  userContent: {
    color: "#ffffff"
  },
  aiContent: {
    color: "#222222"
  },
  sourceBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#e0e4e6",
    borderRadius: 99,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  sourceText: {
    color: "#555555",
    fontSize: 11
  },
  chartsContainer: {
    gap: 8,
    marginTop: 8
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE2E5",
    borderRadius: 10,
    borderWidth: 1,
    padding: 8
  },
  chartCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6
  },
  chartTitle: {
    color: "#222222",
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    marginRight: 8
  },
  expandHint: {
    color: "#006341",
    fontSize: 11,
    fontWeight: "600"
  }
});

const markdownStyles = {
  body: {
    color: "#222222",
    fontSize: 15,
    lineHeight: 20,
    marginTop: 0,
    marginBottom: 0
  },
  heading1: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    marginBottom: 8
  },
  heading2: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "700",
    marginBottom: 8
  },
  heading3: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    marginBottom: 6
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8
  },
  list_item: {
    marginBottom: 4
  },
  bullet_list: {
    marginTop: 0,
    marginBottom: 8
  },
  ordered_list: {
    marginTop: 0,
    marginBottom: 8
  },
  strong: {
    fontWeight: "700"
  },
  em: {
    fontStyle: "italic"
  },
  link: {
    color: "#006341",
    textDecorationLine: "underline"
  },
  code_inline: {
    backgroundColor: "#E6EAEC",
    color: "#222222",
    paddingHorizontal: 4
  },
  fence: {
    backgroundColor: "#E0E4E6",
    borderRadius: 8,
    color: "#222222",
    fontSize: 13,
    lineHeight: 18,
    padding: 8
  }
} as const;
