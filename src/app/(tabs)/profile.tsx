import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SparkleIcon } from "../../components/design/Icons";
import { PersonalizationBar } from "../../components/onboarding/PersonalizationBar";
import { ProfileCard } from "../../components/onboarding/ProfileCard";
import { useAuth } from "../../hooks/useAuth";
import { useUserProfile } from "../../hooks/useUserProfile";
import { useProfileStore } from "../../store/profileStore";
import { colors, radii } from "../../theme/tokens";
import type { ScoredField } from "../../utils/profile";

const SETTINGS_ROWS: { key: string; label: string; value: string; isAction?: boolean }[] = [
  { key: "favorites", label: "Favorite teams", value: "3 teams · 4 players" },
  { key: "notifications", label: "Notifications", value: "Goals & red cards" },
  { key: "language", label: "Language", value: "English" },
  { key: "history", label: "AI history", value: "24 chats" }
];

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

  const isPaid = Boolean(profile?.isPaidUser);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.langSwitch}>EN · ES · 中文</Text>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.email?.split("@")[0] ?? "Guest"}</Text>
            <Text style={styles.userMeta}>
              {user?.email ?? "no email"} · {isPaid ? "Tournament Pass" : "Free tier"}
            </Text>
          </View>
        </View>

        <PersonalizationBar score={profileScore} />

        {!isPaid ? (
          <Pressable style={({ pressed }) => [styles.passCard, pressed ? styles.pressed : null]}>
            <SparkleIcon size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.passTitle}>Tournament Pass · $9.99</Text>
              <Text style={styles.passSub}>Unlimited AI · Live broadcast mode</Text>
            </View>
            <Text style={styles.passCta}>Upgrade →</Text>
          </Pressable>
        ) : null}

        <ProfileCard
          initialField={initialField}
          isSaving={profileLoading}
          onSaveField={updateProfile}
          profile={profile}
        />

        <View style={styles.settingsList}>
          {SETTINGS_ROWS.map((row, i) => (
            <Pressable
              key={row.key}
              style={[styles.settingsRow, i === 0 ? null : styles.settingsRowDivider]}
            >
              <Text style={styles.settingsLabel}>{row.label}</Text>
              <Text style={styles.settingsValue}>{row.value} ›</Text>
            </Pressable>
          ))}
          <Pressable
            disabled={signOutLoading}
            onPress={() => void handleSignOut()}
            style={[styles.settingsRow, styles.settingsRowDivider]}
          >
            <Text style={[styles.settingsLabel, styles.signOutLabel]}>
              {signOutLoading ? "Signing out..." : "Sign out"}
            </Text>
            <Text style={styles.settingsValue}>›</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.paper,
    flex: 1
  },
  scroll: {
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 12
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800"
  },
  langSwitch: {
    color: colors.ink3,
    fontSize: 11
  },
  profileRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 12
  },
  avatar: {
    backgroundColor: colors.lineMuted,
    borderRadius: 28,
    height: 56,
    width: 56
  },
  userName: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700"
  },
  userMeta: {
    color: colors.ink3,
    fontSize: 11,
    marginTop: 2
  },
  passCard: {
    alignItems: "center",
    backgroundColor: colors.accentGhost,
    borderColor: colors.accent,
    borderRadius: radii.md,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    padding: 12
  },
  passTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700"
  },
  passSub: {
    color: colors.ink3,
    fontSize: 11,
    marginTop: 2
  },
  passCta: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700"
  },
  settingsList: {
    marginTop: 12
  },
  settingsRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12
  },
  settingsRowDivider: {
    borderTopColor: colors.lineMuted,
    borderTopWidth: 1
  },
  settingsLabel: {
    color: colors.ink,
    fontSize: 13
  },
  signOutLabel: {
    color: colors.live
  },
  settingsValue: {
    color: colors.ink3,
    fontSize: 12
  },
  pressed: {
    opacity: 0.85
  }
});
