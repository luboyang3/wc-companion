import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Flag } from "../../components/design/Flag";
import {
  BackIcon,
  ChevronRightIcon,
  CloseIcon,
  SearchIcon,
  SparkleIcon
} from "../../components/design/Icons";
import { colors, radii } from "../../theme/tokens";

type Filter = "All" | "Teams" | "Players";

const FILTERS: Filter[] = ["All", "Teams", "Players"];

interface TeamRow {
  code: string;
  name: string;
  group: string;
}

interface PlayerRow {
  name: string;
  country: string;
  position: string;
  number?: string;
}

const TEAMS: TeamRow[] = [
  { code: "BRA", name: "Brazil", group: "Group B" },
  { code: "FRA", name: "France", group: "Group B" },
  { code: "ARG", name: "Argentina", group: "Group D" },
  { code: "ENG", name: "England", group: "Group D" },
  { code: "ESP", name: "Spain", group: "Group F" },
  { code: "GER", name: "Germany", group: "Group A" }
];

const PLAYERS: PlayerRow[] = [
  { name: "Kylian Mbappé", country: "France", position: "FW", number: "10" },
  { name: "Ethan Mbappé", country: "France", position: "MF", number: "18" },
  { name: "Jude Bellingham", country: "England", position: "MF", number: "10" },
  { name: "Vinicius Júnior", country: "Brazil", position: "FW", number: "7" },
  { name: "Lionel Messi", country: "Argentina", position: "FW", number: "10" },
  { name: "Lamine Yamal", country: "Spain", position: "FW", number: "19" }
];

export default function ExploreTab(): JSX.Element {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const inputRef = useRef<TextInput>(null);
  const isSearching = query.trim().length > 0;

  const matchedTeams = useMemo(() => {
    if (!isSearching || filter === "Players") return [];
    const q = query.trim().toLowerCase();
    return TEAMS.filter(
      (t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q)
    );
  }, [query, filter, isSearching]);

  const matchedPlayers = useMemo(() => {
    if (!isSearching || filter === "Teams") return [];
    const q = query.trim().toLowerCase();
    return PLAYERS.filter((p) => p.name.toLowerCase().includes(q));
  }, [query, filter, isSearching]);

  const browseTeams = filter === "Players" ? [] : TEAMS.slice(0, 4);
  const browsePlayers = filter === "Teams" ? [] : PLAYERS.slice(0, 2);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isSearching ? (
          <View style={styles.searchHeaderRow}>
            <Pressable
              accessibilityLabel="Clear search"
              hitSlop={8}
              onPress={() => {
                setQuery("");
                inputRef.current?.blur();
              }}
            >
              <BackIcon size={20} color={colors.ink} />
            </Pressable>
            <View style={styles.searchBarActive}>
              <SearchIcon size={16} color={colors.accent} />
              <TextInput
                autoFocus
                onChangeText={setQuery}
                placeholder="Search teams, players…"
                placeholderTextColor={colors.ink3}
                ref={inputRef}
                style={styles.searchInputActive}
                value={query}
              />
              <Pressable accessibilityLabel="Clear" hitSlop={8} onPress={() => setQuery("")}>
                <CloseIcon size={14} color={colors.ink3} />
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Explore</Text>
            <Pressable
              accessibilityRole="search"
              onPress={() => inputRef.current?.focus()}
              style={styles.searchBar}
            >
              <SearchIcon size={16} color={colors.ink3} />
              <TextInput
                onChangeText={setQuery}
                placeholder="Search teams, players…"
                placeholderTextColor={colors.ink3}
                ref={inputRef}
                style={styles.searchInput}
                value={query}
              />
            </Pressable>
          </>
        )}

        <ScrollView
          contentContainerStyle={styles.filtersRow}
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
        >
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
        </ScrollView>

        {isSearching ? (
          <SearchResults
            players={matchedPlayers}
            query={query}
            teams={matchedTeams}
          />
        ) : (
          <BrowseLists players={browsePlayers} teams={browseTeams} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface BrowseListsProps {
  teams: TeamRow[];
  players: PlayerRow[];
}

function BrowseLists({ teams, players }: BrowseListsProps): JSX.Element {
  return (
    <>
      {teams.length > 0 ? (
        <>
          <Text style={styles.sectionHeading}>Teams</Text>
          <View style={styles.list}>
            {teams.map((t, i) => (
              <Pressable
                key={t.code}
                style={[styles.row, i === 0 ? null : styles.rowDivider]}
              >
                <Flag code={t.code} width={26} height={18} />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{t.name}</Text>
                  <Text style={styles.rowSubtitle}>{t.group}</Text>
                </View>
                <ChevronRightIcon size={14} color={colors.ink3} />
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {players.length > 0 ? (
        <>
          <Text style={[styles.sectionHeading, { marginTop: 14 }]}>Players</Text>
          <View style={styles.list}>
            {players.map((p, i) => (
              <Pressable
                key={p.name}
                style={[styles.row, i === 0 ? null : styles.rowDivider]}
              >
                <View style={styles.avatar} />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{p.name}</Text>
                  <Text style={styles.rowSubtitle}>
                    {p.country} · {p.position}
                  </Text>
                </View>
                <ChevronRightIcon size={14} color={colors.ink3} />
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </>
  );
}

interface SearchResultsProps {
  teams: TeamRow[];
  players: PlayerRow[];
  query: string;
}

function SearchResults({ teams, players, query }: SearchResultsProps): JSX.Element {
  const total = teams.length + players.length;
  return (
    <>
      {teams.length > 0 ? (
        <>
          <Text style={styles.sectionHeading}>
            Teams · {teams.length} {teams.length === 1 ? "result" : "results"}
          </Text>
          <View style={styles.list}>
            {teams.map((t, i) => (
              <Pressable key={t.code} style={[styles.row, i === 0 ? null : styles.rowDivider]}>
                <Flag code={t.code} width={28} height={20} />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>
                    <HighlightedText text={t.name} query={query} />
                  </Text>
                  <Text style={styles.rowSubtitle}>{t.group}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {players.length > 0 ? (
        <>
          <Text style={[styles.sectionHeading, teams.length > 0 ? { marginTop: 14 } : null]}>
            Players · {players.length} {players.length === 1 ? "result" : "results"}
          </Text>
          <View style={styles.list}>
            {players.map((p, i) => (
              <Pressable key={p.name} style={[styles.row, i === 0 ? null : styles.rowDivider]}>
                <View style={styles.avatar} />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>
                    <HighlightedText text={p.name} query={query} />
                  </Text>
                  <Text style={styles.rowSubtitle}>
                    {p.country} · {p.position}
                    {p.number ? ` · #${p.number}` : ""}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {total === 0 ? (
        <Text style={styles.emptyText}>No teams or players match "{query.trim()}".</Text>
      ) : null}

      <Text style={[styles.sectionHeading, { marginTop: 14 }]}>Ask the AI</Text>
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/(tabs)/chat",
            params: { prompt: `How has ${query.trim()} performed at the World Cup?` }
          })
        }
        style={styles.aiSuggestion}
      >
        <SparkleIcon size={18} color={colors.accent} />
        <Text style={styles.aiSuggestionText}>
          "How has <Text style={styles.aiSuggestionBold}>{query.trim()}</Text> performed at the World Cup?"
        </Text>
        <ChevronRightIcon size={14} color={colors.accent} />
      </Pressable>
    </>
  );
}

interface HighlightedTextProps {
  text: string;
  query: string;
}

function HighlightedText({ text, query }: HighlightedTextProps): JSX.Element {
  const q = query.trim();
  if (!q) return <Text>{text}</Text>;
  const lowerText = text.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);
  if (idx === -1) return <Text>{text}</Text>;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <Text>
      {before}
      <Text style={styles.highlight}>{match}</Text>
      {after}
    </Text>
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
    borderColor: colors.lineMuted,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  searchInput: {
    color: colors.ink,
    flex: 1,
    fontSize: 13,
    padding: 0
  },
  searchHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 12
  },
  searchBarActive: {
    alignItems: "center",
    backgroundColor: colors.paper2,
    borderColor: colors.accent,
    borderRadius: radii.md,
    borderWidth: 1.5,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  searchInputActive: {
    color: colors.ink,
    flex: 1,
    fontSize: 13,
    padding: 0
  },
  filtersScroll: {
    flexGrow: 0,
    marginBottom: 14
  },
  filtersRow: {
    gap: 6,
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
  sectionHeading: {
    color: colors.ink3,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: "uppercase"
  },
  list: {
    paddingHorizontal: 0
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
  rowText: {
    flex: 1,
    minWidth: 0
  },
  rowTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700"
  },
  rowSubtitle: {
    color: colors.ink3,
    fontSize: 11,
    marginTop: 2
  },
  avatar: {
    backgroundColor: colors.paper2,
    borderColor: colors.lineMuted,
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    width: 28
  },
  highlight: {
    color: colors.accent
  },
  emptyText: {
    color: colors.ink3,
    fontSize: 12,
    paddingVertical: 16,
    textAlign: "center"
  },
  aiSuggestion: {
    alignItems: "center",
    borderColor: colors.accent,
    borderRadius: radii.md,
    borderStyle: "dashed",
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 8,
    padding: 10
  },
  aiSuggestionText: {
    color: colors.ink,
    flex: 1,
    fontSize: 12
  },
  aiSuggestionBold: {
    fontWeight: "700"
  }
});
