import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AIPill } from "../../components/design/AIPill";
import { Flag } from "../../components/design/Flag";
import { ChevronRightIcon, SearchIcon, SparkleIcon } from "../../components/design/Icons";
import { colors, radii } from "../../theme/tokens";

interface MatchRowSpec {
  home: string;
  away: string;
  hScore?: string;
  aScore?: string;
  status: string;
  live?: boolean;
}

const DAYS = ["Sun", "Mon", "Today", "Wed", "Thu", "Fri", "Sat"];
const TODAY_INDEX = 2;

const LIVE_MATCHES: MatchRowSpec[] = [
  { home: "FRA", away: "BRA", hScore: "2", aScore: "1", status: "74'", live: true },
  { home: "ARG", away: "ENG", hScore: "0", aScore: "0", status: "32'", live: true }
];

const UPCOMING_MATCHES: MatchRowSpec[] = [
  { home: "USA", away: "MEX", status: "19:00" },
  { home: "ESP", away: "POR", status: "22:00" },
  { home: "GER", away: "JPN", status: "Tom" }
];

export default function MatchesTab(): JSX.Element {
  const askAIAboutSlate = () => router.push("/(tabs)/chat");

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.brand}>
            WC<Text style={styles.brandAccent}>26</Text>
          </Text>
          <View style={styles.headerActions}>
            <View style={styles.liveCount}>
              <View style={styles.liveDot} />
              <Text style={styles.liveCountText}>
                Live · <Text style={styles.bold}>4</Text>
              </Text>
            </View>
            <Pressable style={styles.iconButton}>
              <SearchIcon size={16} color={colors.ink} />
            </Pressable>
          </View>
        </View>

        <View style={styles.daysRow}>
          {DAYS.map((d, i) => (
            <View key={d} style={styles.dayCell}>
              <Text style={[styles.dayText, i === TODAY_INDEX ? styles.dayTextActive : null]}>{d}</Text>
              {i === TODAY_INDEX ? <View style={styles.dayUnderline} /> : null}
            </View>
          ))}
        </View>

        <Pressable onPress={askAIAboutSlate} style={({ pressed }) => [styles.aiNudge, pressed ? styles.pressed : null]}>
          <SparkleIcon size={20} color={colors.accent} />
          <View style={styles.aiNudgeBody}>
            <Text style={styles.aiNudgeTitle}>Ask the AI about today's slate</Text>
            <Text style={styles.aiNudgeSubtitle}>"Who should I watch in BRA vs FRA?"</Text>
          </View>
          <ChevronRightIcon size={16} color={colors.accent} />
        </Pressable>

        <SectionHeading>● Live now</SectionHeading>
        <View style={styles.matchGroup}>
          <LeagueHeader name="Group B · Matchday 2" flag="BRA" />
          {LIVE_MATCHES.map((m) => (
            <MatchRow key={`${m.home}-${m.away}`} match={m} />
          ))}
        </View>

        <SectionHeading>Upcoming</SectionHeading>
        <View style={styles.matchGroup}>
          <LeagueHeader name="Group A" flag="USA" />
          {UPCOMING_MATCHES.map((m) => (
            <MatchRow key={`${m.home}-${m.away}`} match={m} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeading({ children }: { children: string }): JSX.Element {
  return <Text style={styles.sectionHeading}>{children}</Text>;
}

function LeagueHeader({ name, flag }: { name: string; flag: string }): JSX.Element {
  return (
    <View style={styles.leagueHeader}>
      <Flag code={flag} width={18} height={13} />
      <Text style={styles.leagueName}>{name}</Text>
    </View>
  );
}

function MatchRow({ match }: { match: MatchRowSpec }): JSX.Element {
  const askAI = () => router.push("/(tabs)/chat");
  const scoreColor = match.live ? colors.accent : colors.ink;
  const statusColor = match.live ? colors.live : colors.ink3;
  const hScore = match.hScore ?? "–";
  const aScore = match.aScore ?? "–";

  return (
    <View style={styles.matchRow}>
      <View style={styles.matchStatus}>
        {match.live ? <View style={styles.liveStatusDot} /> : null}
        <Text style={[styles.matchStatusText, { color: statusColor }]}>{match.status}</Text>
      </View>

      <View style={styles.matchHome}>
        <Text style={styles.matchTeam}>{match.home}</Text>
        <Flag code={match.home} />
      </View>

      <Text style={[styles.matchScore, { color: scoreColor }]}>
        {hScore}–{aScore}
      </Text>

      <View style={styles.matchAway}>
        <Flag code={match.away} />
        <Text style={styles.matchTeam}>{match.away}</Text>
      </View>

      <AIPill label={match.live ? "Ask AI" : "AI Preview"} filled={match.live} onPress={askAI} />
    </View>
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
  brand: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5
  },
  brandAccent: {
    color: colors.accent
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  liveCount: {
    alignItems: "center",
    borderColor: colors.lineSoft,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  liveDot: {
    backgroundColor: colors.live,
    borderRadius: 3,
    height: 6,
    width: 6
  },
  liveCountText: {
    color: colors.ink,
    fontSize: 11
  },
  bold: { fontWeight: "700" },
  iconButton: {
    alignItems: "center",
    borderColor: colors.lineSoft,
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  daysRow: {
    flexDirection: "row",
    gap: 18,
    marginBottom: 12
  },
  dayCell: {
    alignItems: "flex-start"
  },
  dayText: {
    color: colors.ink3,
    fontSize: 14
  },
  dayTextActive: {
    color: colors.ink,
    fontWeight: "700"
  },
  dayUnderline: {
    backgroundColor: colors.accent,
    height: 2,
    marginTop: 2,
    width: "100%"
  },
  aiNudge: {
    alignItems: "center",
    borderColor: colors.accent,
    borderRadius: radii.md,
    borderStyle: "dashed",
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    padding: 10
  },
  aiNudgeBody: {
    flex: 1
  },
  aiNudgeTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700"
  },
  aiNudgeSubtitle: {
    color: colors.ink3,
    fontSize: 12,
    marginTop: 1
  },
  sectionHeading: {
    color: colors.ink3,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 4,
    marginTop: 4,
    textTransform: "uppercase"
  },
  matchGroup: {
    borderColor: colors.lineMuted,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden"
  },
  leagueHeader: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderBottomColor: colors.lineMuted,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  leagueName: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "600"
  },
  matchRow: {
    alignItems: "center",
    borderTopColor: colors.lineDim,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  matchStatus: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    width: 48
  },
  liveStatusDot: {
    backgroundColor: colors.live,
    borderRadius: 3,
    height: 6,
    width: 6
  },
  matchStatusText: {
    fontSize: 11
  },
  matchHome: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "flex-end"
  },
  matchTeam: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "600"
  },
  matchScore: {
    fontVariant: ["tabular-nums"],
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 4,
    textAlign: "center",
    width: 48
  },
  matchAway: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 6
  },
  pressed: {
    opacity: 0.85
  }
});
