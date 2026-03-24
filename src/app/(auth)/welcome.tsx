import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function WelcomeScreen(): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>World Cup Companion</Text>
      <Text style={styles.subtitle}>Sign in or create an account to continue.</Text>

      <Link href="/(auth)/login" style={styles.primaryButton}>
        Login with email
      </Link>
      <Link href="/(auth)/register" style={styles.secondaryButton}>
        Register with email
      </Link>
      <Text style={styles.helper}>SSO will be added in a later feature.</Text>
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
    color: "#222222",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8
  },
  subtitle: {
    color: "#555555",
    fontSize: 16,
    marginBottom: 24
  },
  primaryButton: {
    backgroundColor: "#006341",
    borderRadius: 8,
    color: "#ffffff",
    fontSize: 16,
    marginBottom: 12,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlign: "center"
  },
  secondaryButton: {
    borderColor: "#006341",
    borderRadius: 8,
    borderWidth: 1,
    color: "#006341",
    fontSize: 16,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlign: "center"
  },
  helper: {
    color: "#555555",
    fontSize: 13,
    marginTop: 16
  }
});
