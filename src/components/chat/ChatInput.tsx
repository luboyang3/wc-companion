import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

interface ChatInputProps {
  isSending?: boolean;
  onSend: (value: string) => Promise<void>;
}

export function ChatInput({ isSending = false, onSend }: ChatInputProps): JSX.Element {
  const [value, setValue] = useState("");

  const handleSend = async () => {
    const trimmed = value.trim();
    if (!trimmed || isSending) {
      return;
    }
    setValue("");
    await onSend(trimmed);
  };

  return (
    <View style={styles.container}>
      <TextInput
        multiline
        onChangeText={setValue}
        placeholder="Ask anything about World Cup football..."
        style={styles.input}
        testID="chat-input"
        value={value}
      />
      <Pressable
        disabled={isSending || !value.trim()}
        onPress={() => void handleSend()}
        style={({ pressed }) => [
          styles.sendButton,
          (!value.trim() || isSending) ? styles.sendButtonDisabled : null,
          pressed ? styles.sendButtonPressed : null
        ]}
      >
        <Text style={styles.sendLabel}>{isSending ? "Sending..." : "Send"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-end",
    borderTopColor: "#e3e3e3",
    borderTopWidth: 1,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#cfcfcf",
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: 120,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: "100%"
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: "#006341",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  sendButtonDisabled: {
    opacity: 0.5
  },
  sendButtonPressed: {
    opacity: 0.8
  },
  sendLabel: {
    color: "#ffffff",
    fontWeight: "600"
  }
});
