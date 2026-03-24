import { StyleSheet, Text, View } from "react-native";
import type { ChatMessage } from "../../types/ai";

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps): JSX.Element {
  const isUser = message.role === "user";

  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.aiRow]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.content, isUser ? styles.userContent : styles.aiContent]}>
          {message.content}
        </Text>
        {!isUser && message.source ? (
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceText}>
              {message.source === "sportradar" ? "via Sportradar" : "AI knowledge"}
            </Text>
          </View>
        ) : null}
      </View>
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
  }
});
