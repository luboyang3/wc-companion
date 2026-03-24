import { useMemo } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { ChatBubble } from "../../components/chat/ChatBubble";
import { ChatInput } from "../../components/chat/ChatInput";
import { SuggestedPrompts } from "../../components/chat/SuggestedPrompts";
import { useAIChat } from "../../hooks/useAIChat";
import { useProfileStore } from "../../store/profileStore";

export default function ChatTab(): JSX.Element {
  const { profile } = useProfileStore();
  const { messages, isSending, isUpgradeModalVisible, sendMessage, closeUpgradeModal } = useAIChat();

  const prompts = useMemo(() => {
    const favoriteNationalTeam = profile?.favoriteNationalTeams?.[0];
    return [
      favoriteNationalTeam
        ? `Who starts for ${favoriteNationalTeam} today?`
        : "Who are today's must-watch matches?",
      "Explain the offside rule",
      "How does expected goals work?"
    ];
  }, [profile?.favoriteNationalTeams]);

  const handlePromptSelect = async (prompt: string) => {
    try {
      await sendMessage(prompt);
    } catch {
      Alert.alert("Error", "Unable to send message right now.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Chat</Text>
      <Text style={styles.subtitle}>Ask questions with context from your profile and match data.</Text>

      <SuggestedPrompts onSelectPrompt={(prompt) => void handlePromptSelect(prompt)} prompts={prompts} />

      <FlatList
        contentContainerStyle={styles.messagesContainer}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatBubble message={item} />}
      />

      <ChatInput isSending={isSending} onSend={sendMessage} />

      <Modal animationType="fade" onRequestClose={closeUpgradeModal} transparent visible={isUpgradeModalVisible}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Upgrade required</Text>
            <Text style={styles.modalText}>
              You have reached the daily free AI limit. Upgrade to keep asking questions.
            </Text>
            <Pressable onPress={closeUpgradeModal} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18
  },
  title: {
    color: "#222222",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4
  },
  subtitle: {
    color: "#555555",
    marginBottom: 14
  },
  messagesContainer: {
    flexGrow: 1,
    paddingBottom: 10
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 18,
    width: "100%"
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8
  },
  modalText: {
    color: "#555555",
    marginBottom: 16
  },
  modalButton: {
    alignItems: "center",
    backgroundColor: "#006341",
    borderRadius: 8,
    paddingVertical: 12
  },
  modalButtonText: {
    color: "#ffffff",
    fontWeight: "600"
  }
});
