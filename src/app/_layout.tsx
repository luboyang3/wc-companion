import { Slot } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AuthProvider } from "../hooks/useAuth";
import { configureAmplify } from "../services/amplify";

configureAmplify();

export default function Layout(): JSX.Element {
  return (
    <AuthProvider>
      <View style={styles.root}>
        <Slot />
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  }
});
