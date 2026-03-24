import { Link, router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AuthForm } from "../../components/auth/AuthForm";
import { useAuth } from "../../hooks/useAuth";

export default function RegisterScreen(): JSX.Element {
  const { signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async ({ email, password }: { email: string; password: string }) => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await signUp({ email, password });
      router.push({
        pathname: "/(auth)/verify",
        params: { email }
      });
    } catch {
      setErrorMessage("Unable to register. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create account</Text>
      <AuthForm errorMessage={errorMessage} isLoading={isLoading} mode="register" onSubmit={handleRegister} />

      <Link href="/(auth)/login" style={styles.link}>
        Already have an account? Login
      </Link>
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
    marginBottom: 16
  },
  link: {
    color: "#004D99",
    marginTop: 16
  }
});
