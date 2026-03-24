import { Redirect, Slot, useSegments } from "expo-router";
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from "react-native";
import { AuthProvider, useAuth } from "../hooks/useAuth";
import { configureAmplify } from "../services/amplify";

configureAmplify();

function RootNavigator(): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const inAuthGroup = segments[0] === "(auth)";

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated && !inAuthGroup) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (isAuthenticated && inAuthGroup) {
    return <Redirect href="/(tabs)" />;
  }

  return <Slot />;
}

export default function Layout(): JSX.Element {
  return (
    <AuthProvider>
      <View style={styles.root}>
        <RootNavigator />
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  loadingContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  }
});
