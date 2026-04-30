import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Flag } from "../../components/design/Flag";
import { SearchIcon, SparkleIcon, TrophyIcon } from "../../components/design/Icons";
import { colors, radii } from "../../theme/tokens";

const QUICK_FILTERS = ["Trending", "Groups", "Teams", "Players", "Stadiums"] as const;

const TRENDING_TEAMS: { code: string; name: string }[] = [
  { code: "FRA", name: "France" },
  { code: "BRA", name: "Brazil" },
  { code: "ARG", name: "Argentina" },
  { code: "ENG", name: "England" },
  { code: "ESP", name: "Spain" },
  { code: "GER", name: "Germany" }
];

const GROUPS = ["Group A", "Group B", "Group C", "Group D", "Group E", "Group F"];

export default function ExploreTab(): JSX.Element {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof QUICK_FILTERS)[number]>("Trending");

  const filteredTeams = useMemo(() => {
    if (!query) {
      return TRENDING_TEAMS;
    }
    const q = query.toLowerCase();
    return TRENDING_TEAMS.filter(
      (t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Explore</Text>

        <View style={styles.searchBar}>
          <SearchIcon size={16} color={colors.ink3} />
          <TextInput
            onChangeText={setQuery}
            placeholder="Search teams, players, stadiums…"
            placeholderTextColor={colors.ink3}
            style={styles.searchInput}
            value={query}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.filtersRow}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {QUICK_FILTERS.map((f) => {
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
        </ScrollView>

        <Pressable style={({ pressed }) => [styles.aiCard, pressed ? styles.pressed : null]}>
          <SparkleIcon size={18} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.aiCardTitle}>Ask the AI</Text>
            <Text style={styles.aiCardSubtitle}>"Top scorer Group B?"  ·  "Compare Mbappé vs Vinicius"</Text>
          </View>
        </Pressable>

        <Text style={styles.sectionHeading}>Trending teams</Text>
        <View style={styles.teamsGrid}>
          {filteredTeams.map((t) => (
            <Pressable key={t.code} style={({ pressed }) => [styles.teamCard, pressed ? styles.pressed : null]}>
              <Flag code={t.code} width={36} height={26} />
              <Text style={styles.teamCardName}>{t.name}</Text>
              <Text style={styles.teamCardCode}>{t.code}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionHeading}>Groups</Text>
        <View style={styles.groupsList}>
          {GROUPS.map((g, i) => (
            <Pressable
              key={g}
              style={[styles.groupRow, i === 0 ? null : styles.groupRowDivider]}
            >
              <TrophyIcon size={18} color={colors.ink2} />
              <Text style={styles.groupName}>{g}</Text>
              <Text style={styles.groupHint}>4 teams ›</Text>
            </Pressable>
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
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12
  },
  searchBar: {
    alignItems: "center",
    backgroundColor: colors.paper2,
    borderColor: colors.lineSoft,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  searchInput: {
    color: colors.ink,
    flex: 1,
    fontSize: 13,
    padding: 0
  },
  filtersRow: {
    gap: 6,
    paddingBottom: 4,
    paddingRight: 12
  },
  chip: {
    backgroundColor: "transparent",
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
  aiCard: {
    alignItems: "center",
    borderColor: colors.accent,
    borderRadius: radii.lg,
    borderStyle: "dashed",
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 10,
    marginVertical: 12,
    padding: 12
  },
  aiCardTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700"
  },
  aiCardSubtitle: {
    color: colors.ink3,
    fontSize: 11,
    marginTop: 2
  },
  sectionHeading: {
    color: colors.ink3,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
    textTransform: "uppercase"
  },
  teamsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16
  },
  teamCard: {
    alignItems: "center",
    borderColor: colors.lineMuted,
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: "31%",
    flexGrow: 1,
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 12
  },
  teamCardName: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "600"
  },
  teamCardCode: {
    color: colors.ink3,
    fontSize: 10,
    letterSpacing: 0.5
  },
  groupsList: {
    borderColor: colors.lineMuted,
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: "hidden"
  },
  groupRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  groupRowDivider: {
    borderTopColor: colors.lineDim,
    borderTopWidth: 1
  },
  groupName: {
    color: colors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: "600"
  },
  groupHint: {
    color: colors.ink3,
    fontSize: 11
  },
  pressed: {
    opacity: 0.85
  }
});
