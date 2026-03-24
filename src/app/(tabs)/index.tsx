import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useUserProfile } from "../../hooks/useUserProfile";

export default function HomeTab(): JSX.Element {
  const { profileScore, nextIncompleteField } = useUserProfile();
  const showNudge = profileScore < 100 && Boolean(nextIncompleteField);

  const openNextCard = () => {
    if (!nextIncompleteField) {
      return;
    }

    router.push({
      pathname: "/(tabs)/profile",
      params: { step: nextIncompleteField }
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.text}>Your companion hub for matches and AI insights.</Text>
      {showNudge ? (
        <Pressable onPress={openNextCard} style={styles.nudgeCard}>
          <Text style={styles.nudgeTitle}>Your AI is {profileScore}% personalized</Text>
          <Text style={styles.nudgeText}>Complete your next profile card to improve responses.</Text>
        </Pressable>
      ) : null}
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
  },
  nudgeCard: {
    backgroundColor: "#F2F4F5",
    borderRadius: 12,
    marginTop: 16,
    padding: 16
  },
  nudgeTitle: {
    color: "#006341",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4
  },
  nudgeText: {
    color: "#555555"
  }
});
