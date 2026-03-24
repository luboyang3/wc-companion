import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ProfileCard } from "../../components/onboarding/ProfileCard";
import { PersonalizationBar } from "../../components/onboarding/PersonalizationBar";
import { useUserProfile } from "../../hooks/useUserProfile";
import { useAuth } from "../../hooks/useAuth";
import { useProfileStore } from "../../store/profileStore";
import type { ScoredField } from "../../utils/profile";

export default function ProfileTab(): JSX.Element {
  const { signOut, user } = useAuth();
  const { step } = useLocalSearchParams<{ step?: string }>();
  const { isLoading: profileLoading, profileScore, updateProfile } = useUserProfile();
  const { profile } = useProfileStore();
  const [signOutLoading, setSignOutLoading] = useState(false);
  const initialField = (step as ScoredField | undefined) ?? null;

  const handleSignOut = async () => {
    setSignOutLoading(true);
    try {
      await signOut();
    } finally {
      setSignOutLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.emailText}>{user?.email ?? "No email found"}</Text>

      <PersonalizationBar score={profileScore} />
      <ProfileCard
        initialField={initialField}
        isSaving={profileLoading}
        onSaveField={updateProfile}
        profile={profile}
      />

      <Pressable
        accessibilityRole="button"
        disabled={signOutLoading}
        onPress={() => void handleSignOut()}
        style={({ pressed }) => [
          styles.signOutButton,
          pressed ? styles.signOutButtonPressed : null,
          signOutLoading ? styles.signOutButtonDisabled : null
        ]}
      >
        <Text style={styles.signOutLabel}>{signOutLoading ? "Signing out..." : "Sign out"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    padding: 24
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8
  },
  emailText: {
    color: "#555555",
    marginBottom: 4
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
