import { useMemo, useRef } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChatBubble } from "../../components/chat/ChatBubble";
import { ChatInput } from "../../components/chat/ChatInput";
import { SuggestedPrompts } from "../../components/chat/SuggestedPrompts";
import { ThinkingLine } from "../../components/chat/ThinkingLine";
import { CloseIcon, EditIcon, HistoryIcon } from "../../components/design/Icons";
import { useAIChat } from "../../hooks/useAIChat";
import { useProfileStore } from "../../store/profileStore";
import { colors, radii } from "../../theme/tokens";

export default function ChatTab(): JSX.Element {
  const { profile } = useProfileStore();
  const { messages, isSending, isUpgradeModalVisible, sendMessage, closeUpgradeModal } = useAIChat();
  const listRef = useRef<FlatList>(null);

  const prompts = useMemo(() => {
    const favoriteNationalTeam = profile?.favoriteNationalTeams?.[0];
    return [
      favoriteNationalTeam
        ? `Who starts for ${favoriteNationalTeam} today?`
        : "Compare Mbappé and Vinicius Jr. tonight",
      "Predict the ARG vs ENG winner",
      "Who is the top scorer so far?"
    ];
  }, [profile?.favoriteNationalTeams]);

  const handlePromptSelect = async (prompt: string) => {
    try {
      await sendMessage(prompt);
    } catch {
      Alert.alert("Error", "Unable to send message right now.");
    }
  };

  const isEmpty = messages.length === 0;
  // We're "thinking" when a user message is the latest entry and a request is in flight,
  // or when the placeholder AI message exists but hasn't streamed any tokens yet.
  const lastMessage = messages[messages.length - 1];
  const isThinking =
    isSending &&
    (lastMessage?.role === "user" || (lastMessage?.role === "ai" && !lastMessage.content));

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ChatHeader />

      {isEmpty ? (
        <View style={styles.emptyContainer}>
          <View style={styles.heroBlock}>
            <Text style={styles.hero}>See what's happening in the World Cup today</Text>
          </View>
          <View style={styles.promptsBlock}>
            <SuggestedPrompts onSelectPrompt={(p) => void handlePromptSelect(p)} prompts={prompts} />
          </View>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.messagesContainer}
          data={messages}
          keyExtractor={(item) => item.id}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ref={listRef}
          renderItem={({ item }) => <ChatBubble message={item} />}
          ListFooterComponent={isThinking ? <ThinkingLine text="Pulling live match stats" /> : null}
        />
      )}

      <ChatInput isSending={isSending} onSend={sendMessage} />

      <Modal animationType="fade" onRequestClose={closeUpgradeModal} transparent visible={isUpgradeModalVisible}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>You've used your free questions today</Text>
            <Text style={styles.modalText}>
              Resets at midnight — or unlock unlimited + live broadcast mode with Tournament Pass.
            </Text>
            <Pressable onPress={closeUpgradeModal} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ChatHeader(): JSX.Element {
  return (
    <View style={styles.header}>
      <Pressable accessibilityLabel="Close" style={styles.headerSide}>
        <CloseIcon size={20} color={colors.ink} />
      </Pressable>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>WC Companion</Text>
        <Text style={styles.headerSubtitle}>World Cup · Live</Text>
      </View>
      <View style={styles.headerSideRight}>
        <Pressable accessibilityLabel="History" hitSlop={8} style={styles.headerIcon}>
          <HistoryIcon size={20} color={colors.ink} />
        </Pressable>
        <Pressable accessibilityLabel="New chat" hitSlop={8} style={styles.headerIcon}>
          <EditIcon size={18} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.paper,
    flex: 1
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 12
  },
  headerSide: {
    width: 32
  },
  headerCenter: {
    alignItems: "center",
    flex: 1
  },
  headerTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700"
  },
  headerSubtitle: {
    color: colors.ink3,
    fontSize: 11,
    marginTop: 1
  },
  headerSideRight: {
    flexDirection: "row",
    gap: 12,
    width: 64,
    justifyContent: "flex-end"
  },
  headerIcon: {
    alignItems: "center",
    justifyContent: "center"
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 16
  },
  heroBlock: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  hero: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
    maxWidth: 260,
    textAlign: "center"
  },
  promptsBlock: {
    paddingBottom: 8
  },
  messagesContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 4
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  modalCard: {
    backgroundColor: colors.paper2,
    borderColor: colors.lineSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 18,
    width: "100%"
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8
  },
  modalText: {
    color: colors.ink2,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16
  },
  modalButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: 12
  },
  modalButtonText: {
    color: "#000000",
    fontWeight: "700"
  }
});
