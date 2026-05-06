import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { AuthField } from "../../components/auth/AuthField";
import { AuthScaffold } from "../../components/auth/AuthScaffold";
import { useAuth } from "../../hooks/useAuth";
import { colors, radii } from "../../theme/tokens";

export default function RegisterScreen(): JSX.Element {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    setErrorMessage(null);
    if (!email || !password) {
      setErrorMessage("Please enter email and password.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (!agreed) {
      setErrorMessage("Please accept the Terms and Privacy Policy.");
      return;
    }

    setIsLoading(true);
    try {
      await signUp({ email: email.trim(), password });
      router.push({ pathname: "/(auth)/verify", params: { email: email.trim() } });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to register. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScaffold mode="register">
      <AuthField label="Name" onChangeText={setName} placeholder="Your name" value={name} />
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
        autoComplete="new-password"
        hint="At least 8 characters"
        label="Password"
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        testID="auth-password-input"
        value={password}
      />

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
        onPress={() => setAgreed((v) => !v)}
        style={styles.termsRow}
      >
        <View style={[styles.checkbox, agreed ? styles.checkboxChecked : styles.checkboxEmpty]}>
          {agreed ? (
            <Svg width={10} height={10} viewBox="0 0 12 12" fill="none">
              <Path
                d="M2 6 L5 9 L10 3"
                stroke="#ffffff"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          ) : null}
        </View>
        <Text style={styles.termsText}>
          I agree to the <Text style={styles.termsLink}>Terms</Text> and{" "}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </Pressable>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={isLoading}
        onPress={() => void handleRegister()}
        style={({ pressed }) => [
          styles.submit,
          pressed ? styles.pressed : null,
          isLoading ? styles.disabled : null
        ]}
        testID="auth-submit-button"
      >
        <Text style={styles.submitLabel}>{isLoading ? "Please wait…" : "Create account"}</Text>
      </Pressable>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  termsRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    marginTop: 4
  },
  checkbox: {
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1.5,
    height: 16,
    justifyContent: "center",
    marginTop: 1,
    width: 16
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  checkboxEmpty: {
    backgroundColor: "transparent",
    borderColor: colors.accent
  },
  termsText: {
    color: colors.ink3,
    flex: 1,
    fontSize: 11,
    lineHeight: 16
  },
  termsLink: {
    color: colors.accent
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
  }
});
