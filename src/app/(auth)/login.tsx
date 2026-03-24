import { Link, router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AuthForm } from "../../components/auth/AuthForm";
import { useAuth } from "../../hooks/useAuth";

export default function LoginScreen(): JSX.Element {
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async ({ email, password }: { email: string; password: string }) => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await signIn(email, password);
      router.replace("/(tabs)");
    } catch {
      setErrorMessage("Unable to login. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Email login</Text>
      <AuthForm errorMessage={errorMessage} isLoading={isLoading} mode="login" onSubmit={handleLogin} />

      <Link href="/(auth)/register" style={styles.link}>
        Need an account? Register
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
