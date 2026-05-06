import { router } from "expo-router";
import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { colors, radii } from "../../theme/tokens";

type AuthMode = "login" | "register";

interface AuthScaffoldProps {
  mode: AuthMode;
}

export function AuthScaffold({ mode, children }: PropsWithChildren<AuthScaffoldProps>): JSX.Element {
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.container}>
        <AuthBrand />
        <AuthTabToggle mode={mode} />
        <AuthSocialButtons mode={mode} />
        <AuthDivider />
        {children}
      </View>
    </SafeAreaView>
  );
}

function AuthBrand(): JSX.Element {
  return (
    <View style={styles.brand}>
      <Text style={styles.brandWordmark}>
        WC<Text style={styles.brandAccent}>26</Text> Companion
      </Text>
      <Text style={styles.brandTagline}>Your AI guide to the 2026 World Cup</Text>
    </View>
  );
}

function AuthTabToggle({ mode }: { mode: AuthMode }): JSX.Element {
  const goLogin = () => router.replace("/(auth)/login");
  const goRegister = () => router.replace("/(auth)/register");
  return (
    <View style={styles.toggle}>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: mode === "login" }}
        onPress={goLogin}
        style={[styles.toggleItem, mode === "login" ? styles.toggleItemActive : null]}
      >
        <Text style={mode === "login" ? styles.toggleLabelActive : styles.toggleLabel}>Log in</Text>
      </Pressable>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: mode === "register" }}
        onPress={goRegister}
        style={[styles.toggleItem, mode === "register" ? styles.toggleItemActive : null]}
      >
        <Text style={mode === "register" ? styles.toggleLabelActive : styles.toggleLabel}>Sign up</Text>
      </Pressable>
    </View>
  );
}

function AuthSocialButtons({ mode }: { mode: AuthMode }): JSX.Element {
  const verb = mode === "login" ? "Continue" : "Sign up";
  return (
    <View style={styles.socialColumn}>
      <SocialButton provider="google" label={`${verb} with Google`} />
      <SocialButton provider="facebook" label={`${verb} with Facebook`} />
    </View>
  );
}

interface SocialButtonProps {
  provider: "google" | "facebook";
  label: string;
}

function SocialButton({ provider, label }: SocialButtonProps): JSX.Element {
  const onPress = () => {
    // SSO is not yet wired to Cognito Hosted UI; placeholder no-op.
  };
  const palette =
    provider === "google"
      ? { bg: "#ffffff", fg: "#1a1a1a", border: "#e0e0e0" }
      : { bg: "#1877f2", fg: "#ffffff", border: "#1877f2" };
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.socialButton,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed ? styles.pressed : null
      ]}
    >
      {provider === "google" ? <GoogleGlyph /> : <FacebookGlyph />}
      <Text style={[styles.socialLabel, { color: palette.fg }]}>{label}</Text>
    </Pressable>
  );
}

function GoogleGlyph(): JSX.Element {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <Path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z" />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </Svg>
  );
}

function FacebookGlyph(): JSX.Element {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="#ffffff">
      <Path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12z" />
    </Svg>
  );
}

function AuthDivider(): JSX.Element {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerLabel}>or with email</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.paper,
    flex: 1
  },
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 16
  },
  brand: {
    alignItems: "center",
    gap: 6,
    marginBottom: 18
  },
  brandWordmark: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5
  },
  brandAccent: {
    color: colors.accent
  },
  brandTagline: {
    color: colors.ink3,
    fontSize: 12
  },
  toggle: {
    backgroundColor: colors.paper2,
    borderColor: colors.lineMuted,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    marginBottom: 16,
    padding: 4
  },
  toggleItem: {
    alignItems: "center",
    borderRadius: 7,
    flex: 1,
    paddingVertical: 8
  },
  toggleItemActive: {
    backgroundColor: colors.accent
  },
  toggleLabel: {
    color: colors.ink3,
    fontSize: 12,
    fontWeight: "500"
  },
  toggleLabelActive: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600"
  },
  socialColumn: {
    gap: 8,
    marginBottom: 14
  },
  socialButton: {
    alignItems: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  socialLabel: {
    fontSize: 13,
    fontWeight: "600"
  },
  divider: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 14
  },
  dividerLine: {
    backgroundColor: colors.lineMuted,
    flex: 1,
    height: 1
  },
  dividerLabel: {
    color: colors.ink3,
    fontSize: 11
  },
  pressed: {
    opacity: 0.85
  }
});

export type { AuthMode };
