import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type AuthMode = "login" | "register";

interface AuthFormProps {
  mode: AuthMode;
  isLoading?: boolean;
  errorMessage?: string | null;
  onSubmit: (args: { email: string; password: string }) => Promise<void>;
}

export function AuthForm({
  mode,
  isLoading = false,
  errorMessage,
  onSubmit
}: AuthFormProps): JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const submitLabel = useMemo(() => (mode === "login" ? "Login" : "Create account"), [mode]);

  const handleSubmit = async () => {
    setLocalError(null);

    if (!email || !password) {
      setLocalError("Please enter email and password.");
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }

    await onSubmit({
      email: email.trim(),
      password
    });
  };

  return (
    <View style={styles.container}>
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        style={styles.input}
        testID="auth-email-input"
        value={email}
      />
      <TextInput
        autoCapitalize="none"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        testID="auth-password-input"
        value={password}
      />
      {mode === "register" ? (
        <TextInput
          autoCapitalize="none"
          autoComplete="new-password"
          onChangeText={setConfirmPassword}
          placeholder="Confirm password"
          secureTextEntry
          style={styles.input}
          testID="auth-confirm-password-input"
          value={confirmPassword}
        />
      ) : null}

      {localError ? <Text style={styles.errorText}>{localError}</Text> : null}
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={isLoading}
        onPress={() => void handleSubmit()}
        style={({ pressed }) => [
          styles.submitButton,
          pressed ? styles.submitButtonPressed : null,
          isLoading ? styles.submitButtonDisabled : null
        ]}
        testID="auth-submit-button"
      >
        <Text style={styles.submitLabel}>{isLoading ? "Please wait..." : submitLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12
  },
  input: {
    borderColor: "#d4d4d4",
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  errorText: {
    color: "#b00020",
    fontSize: 14
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: "#006341",
    borderRadius: 8,
    paddingVertical: 14
  },
  submitButtonPressed: {
    opacity: 0.85
  },
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitLabel: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600"
  }
});

export type { AuthMode, AuthFormProps };
