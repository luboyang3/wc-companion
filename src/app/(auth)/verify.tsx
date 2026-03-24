import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../../hooks/useAuth";

export default function VerifyScreen(): JSX.Element {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { confirmOTP } = useAuth();
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!email) {
      setErrorMessage("Missing email context. Please register again.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    try {
      await confirmOTP({ email, otp });
      router.replace("/(auth)/login");
    } catch {
      setErrorMessage("Invalid verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.subtitle}>Enter the code sent to {email ?? "your email"}.</Text>

      <TextInput
        keyboardType="number-pad"
        onChangeText={setOtp}
        placeholder="6-digit code"
        style={styles.input}
        testID="otp-input"
        value={otp}
      />

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={isLoading}
        onPress={() => void handleVerify()}
        style={({ pressed }) => [
          styles.submitButton,
          pressed ? styles.submitButtonPressed : null,
          isLoading ? styles.submitButtonDisabled : null
        ]}
      >
        <Text style={styles.submitLabel}>{isLoading ? "Verifying..." : "Verify code"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24
  },
  title: {
    color: "#222222",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8
  },
  subtitle: {
    color: "#555555",
    marginBottom: 16
  },
  input: {
    borderColor: "#d4d4d4",
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  errorText: {
    color: "#b00020",
    marginBottom: 12
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
