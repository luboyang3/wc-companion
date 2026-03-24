import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../hooks/useAuth";

export default function ProfileTab(): JSX.Element {
  const { signOut, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.emailText}>{user?.email ?? "No email found"}</Text>

      <Pressable
        accessibilityRole="button"
        disabled={isLoading}
        onPress={() => void handleSignOut()}
        style={({ pressed }) => [
          styles.signOutButton,
          pressed ? styles.signOutButtonPressed : null,
          isLoading ? styles.signOutButtonDisabled : null
        ]}
      >
        <Text style={styles.signOutLabel}>{isLoading ? "Signing out..." : "Sign out"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8
  },
  emailText: {
    color: "#555555",
    marginBottom: 16
  },
  signOutButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#8B0000",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  signOutButtonPressed: {
    opacity: 0.85
  },
  signOutButtonDisabled: {
    opacity: 0.6
  },
  signOutLabel: {
    color: "#ffffff",
    fontWeight: "600"
  }
});
