import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AIPill } from "../../components/design/AIPill";
import { Flag } from "../../components/design/Flag";
import { SearchIcon } from "../../components/design/Icons";
import { LivePill } from "../../components/design/LivePill";
import { colors, radii } from "../../theme/tokens";

const FILTERS = ["Teams", "Players", "Matches"] as const;

interface TeamSpec {
  code: string;
  name: string;
  sub: string;
  live?: boolean;
  liveLabel?: string;
}

interface PlayerSpec {
  name: string;
  meta: string;
  goals: number;
}

const TEAMS: TeamSpec[] = [
  { code: "FRA", name: "France", sub: "Plays today · 19:00" },
  { code: "BRA", name: "Brazil", sub: "Live · 74'", live: true, liveLabel: "74'" },
  { code: "ARG", name: "Argentina", sub: "Tom · 22:00" }
];

const PLAYERS: PlayerSpec[] = [
  { name: "Mbappé", meta: "France · FW", goals: 2 },
  { name: "Vinicius Jr.", meta: "Brazil · FW", goals: 1 },
  { name: "Bellingham", meta: "England · MF", goals: 0 }
];

export default function FollowingTab(): JSX.Element {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Teams");
  const askAI = () => router.push("/(tabs)/chat");

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Following</Text>
          <Pressable style={styles.iconButton}>
            <SearchIcon size={18} color={colors.ink} />
          </Pressable>
        </View>

        <View style={styles.filtersRow}>
          {FILTERS.map((f) => {
            const active = f === filter;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.chip, active ? styles.chipActive : null]}
              >
                <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{f}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionHeading}>National teams</Text>
        <View style={styles.list}>
          {TEAMS.map((t, i) => (
            <View key={t.code} style={[styles.row, i === 0 ? null : styles.rowDivider]}>
              <Flag code={t.code} width={28} height={20} />
              <View style={styles.rowBody}>
                <Text style={styles.rowName}>{t.name}</Text>
                <Text style={styles.rowSub}>{t.sub}</Text>
              </View>
              {t.live ? <LivePill label={t.liveLabel ?? "LIVE"} /> : null}
              <AIPill label={t.live ? "Ask AI" : "AI Preview"} filled={t.live} onPress={askAI} />
            </View>
          ))}
        </View>

        <Text style={styles.sectionHeading}>Players</Text>
        <View style={styles.list}>
          {PLAYERS.map((p, i) => (
            <View key={p.name} style={[styles.row, i === 0 ? null : styles.rowDivider]}>
              <View style={styles.avatar} />
              <View style={styles.rowBody}>
                <Text style={styles.rowName}>{p.name}</Text>
                <Text style={styles.rowSub}>{p.meta}</Text>
              </View>
              {p.goals > 0 ? <Text style={styles.goalCount}>⚽ {p.goals}</Text> : null}
              <AIPill label="Ask AI" onPress={askAI} />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.paper,
    flex: 1
  },
  scroll: {
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 12
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800"
  },
  iconButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32
  },
  filtersRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 16
  },
  chip: {
    borderColor: colors.lineSoft,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5
  },
  chipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  chipText: {
    color: colors.ink,
    fontSize: 12
  },
  chipTextActive: {
    color: colors.paper
  },
  sectionHeading: {
    color: colors.ink3,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 4,
    textTransform: "uppercase"
  },
  list: {
    marginBottom: 14
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10
  },
  rowDivider: {
    borderTopColor: colors.lineMuted,
    borderTopWidth: 1
  },
  rowBody: {
    flex: 1,
    minWidth: 0
  },
  rowName: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700"
  },
  rowSub: {
    color: colors.ink3,
    fontSize: 11,
    marginTop: 1
  },
  avatar: {
    backgroundColor: colors.lineMuted,
    borderRadius: 14,
    height: 28,
    width: 28
  },
  goalCount: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600"
  }
});
