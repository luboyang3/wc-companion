import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AuthField } from "../../components/auth/AuthField";
import { AuthScaffold } from "../../components/auth/AuthScaffold";
import { useAuth } from "../../hooks/useAuth";
import { colors, radii } from "../../theme/tokens";

export default function LoginScreen(): JSX.Element {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setErrorMessage(null);
    if (!email || !password) {
      setErrorMessage("Please enter email and password.");
      return;
    }
    setIsLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace("/(tabs)/chat");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to login. Please check your credentials."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScaffold mode="login">
      <AuthField
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        placeholder="alex@email.com"
        testID="auth-email-input"
        value={email}
      />
      <AuthField
        autoCapitalize="none"
        autoComplete="current-password"
        label="Password"
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        testID="auth-password-input"
        value={password}
      />

      <View style={styles.forgotRow}>
        <Pressable accessibilityRole="link" hitSlop={6}>
          <Text style={styles.forgot}>Forgot password?</Text>
        </Pressable>
      </View>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={isLoading}
        onPress={() => void handleLogin()}
        style={({ pressed }) => [
          styles.submit,
          pressed ? styles.pressed : null,
          isLoading ? styles.disabled : null
        ]}
        testID="auth-submit-button"
      >
        <Text style={styles.submitLabel}>{isLoading ? "Please wait…" : "Log in"}</Text>
      </Pressable>

      <View style={styles.spacer} />

      <View style={styles.footer}>
        <Text style={styles.footerMuted}>New to WC26? </Text>
        <Pressable accessibilityRole="link" hitSlop={6} onPress={() => router.replace("/(auth)/register")}>
          <Text style={styles.footerLink}>Create account</Text>
        </Pressable>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  forgotRow: {
    alignItems: "flex-end",
    marginBottom: 14,
    marginTop: -4
  },
  forgot: {
    color: colors.accent,
    fontSize: 11
  },
  error: {
    color: colors.live,
    fontSize: 12,
    marginBottom: 10
  },
  submit: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 13
  },
  submitLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700"
  },
  pressed: {
    opacity: 0.85
  },
  disabled: {
    opacity: 0.6
  },
  spacer: {
    flex: 1
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12
  },
  footerMuted: {
    color: colors.ink3,
    fontSize: 12
  },
  footerLink: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700"
  }
});
