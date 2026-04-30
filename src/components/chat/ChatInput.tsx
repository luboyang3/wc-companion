import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { MicIcon, SendIcon } from "../design/Icons";
import { colors, radii } from "../../theme/tokens";

interface ChatInputProps {
  isSending?: boolean;
  onSend: (value: string) => Promise<void>;
  placeholder?: string;
}

/**
 * Pill-shaped composer at the bottom of the chat tab.
 *
 * - Mic icon shows when input is empty (per design's Composer).
 * - Filled accent send button replaces the mic once the user types.
 * - Footer micro-copy: "AI-generated · scores via Football DB".
 */
export function ChatInput({
  isSending = false,
  onSend,
  placeholder = "Ask WC Companion…"
}: ChatInputProps): JSX.Element {
  const [value, setValue] = useState("");
  const hasContent = value.trim().length > 0;

  const handleSend = async () => {
    if (!hasContent || isSending) {
      return;
    }
    const trimmed = value.trim();
    setValue("");
    await onSend(trimmed);
  };

  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        <TextInput
          editable={!isSending}
          multiline
          onChangeText={setValue}
          onSubmitEditing={() => void handleSend()}
          placeholder={placeholder}
          placeholderTextColor={colors.ink3}
          returnKeyType="send"
          style={styles.input}
          testID="chat-input"
          value={value}
        />

        {hasContent || isSending ? (
          <Pressable
            accessibilityLabel="Send message"
            accessibilityRole="button"
            disabled={isSending || !hasContent}
            onPress={() => void handleSend()}
            style={({ pressed }) => [
              styles.sendButton,
              !hasContent || isSending ? styles.sendButtonDisabled : null,
              pressed ? styles.sendButtonPressed : null
            ]}
          >
            <SendIcon size={14} color="#ffffff" />
          </Pressable>
        ) : (
          <MicIcon size={18} color={colors.ink3} />
        )}
      </View>
      <Text style={styles.footer}>AI-generated · scores via Football DB ⓘ</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 4,
    paddingHorizontal: 16,
    paddingTop: 8
  },
  pill: {
    alignItems: "center",
    backgroundColor: colors.paper2,
    borderColor: colors.lineSoft,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  input: {
    color: colors.ink,
    flex: 1,
    fontSize: 13,
    maxHeight: 120,
    minHeight: 22,
    padding: 0
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28
  },
  sendButtonDisabled: {
    opacity: 0.5
  },
  sendButtonPressed: {
    opacity: 0.85
  },
  footer: {
    color: colors.ink3,
    fontSize: 10,
    marginTop: 6,
    textAlign: "center"
  }
});
