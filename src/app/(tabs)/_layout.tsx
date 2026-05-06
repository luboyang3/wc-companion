import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, SafeAreaView, StyleSheet } from "react-native";
import { WCTabBar } from "../../components/design/WCTabBar";
import { useAuth } from "../../hooks/useAuth";
import { useUserProfile } from "../../hooks/useUserProfile";
import { colors } from "../../theme/tokens";

export default function TabsLayout(): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  useUserProfile();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      initialRouteName="chat"
      screenOptions={{
        headerShown: false
      }}
      tabBar={(props) => <WCTabBar {...props} />}
    >
      <Tabs.Screen name="matches" options={{ title: "Matches" }} />
      <Tabs.Screen name="explore" options={{ title: "Explore" }} />
      <Tabs.Screen name="chat" options={{ title: "AI" }} />
      <Tabs.Screen name="following" options={{ title: "Following" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: "center",
    backgroundColor: colors.paper,
    flex: 1,
    justifyContent: "center"
  }
});
