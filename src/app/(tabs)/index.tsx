import { StyleSheet, Text, View } from "react-native";

export default function HomeTab(): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.text}>Feature 1 complete: authenticated users can access tabs.</Text>
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
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8
  },
  text: {
    color: "#555555",
    fontSize: 16
  }
});
