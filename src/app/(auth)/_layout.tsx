import { Redirect, Slot } from "expo-router";
import { ActivityIndicator, SafeAreaView, StyleSheet } from "react-native";
import { useAuth } from "../../hooks/useAuth";

export default function AuthLayout(): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/chat" />;
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  }
});
