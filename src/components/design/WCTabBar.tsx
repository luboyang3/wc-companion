import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, shadows } from "../../theme/tokens";
import {
  ChatIcon,
  MatchesIcon,
  SearchIcon,
  SparkleIcon,
  StarIcon,
  UserIcon
} from "./Icons";

type TabId = "index" | "explore" | "chat" | "following" | "profile";

interface TabSpec {
  id: TabId;
  label: string;
  routeName: string;
}

const TAB_ORDER: TabSpec[] = [
  { id: "index", label: "Matches", routeName: "index" },
  { id: "explore", label: "Explore", routeName: "explore" },
  { id: "chat", label: "AI", routeName: "chat" },
  { id: "following", label: "Following", routeName: "following" },
  { id: "profile", label: "Profile", routeName: "profile" }
];

function renderIcon(id: TabId, color: string, active: boolean): JSX.Element {
  switch (id) {
    case "index":
      return <MatchesIcon size={22} color={color} />;
    case "explore":
      return <SearchIcon size={22} color={color} />;
    case "chat":
      return <ChatIcon size={22} color={color} fill={active ? color : "none"} />;
    case "following":
      return <StarIcon size={22} color={color} fill={active ? color : "none"} />;
    case "profile":
      return <UserIcon size={22} color={color} />;
  }
}

export function WCTabBar({ state, navigation }: BottomTabBarProps): JSX.Element {
  const insets = useSafeAreaInsets();
  const activeRouteName = state.routes[state.index]?.name;
  const left = TAB_ORDER.slice(0, 2);
  const right = TAB_ORDER.slice(3);
  const aiTab = TAB_ORDER[2];

  const handlePress = (routeName: string) => {
    const event = navigation.emit({
      type: "tabPress",
      target: routeName,
      canPreventDefault: true
    });
    if (!event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + 4 }]}>
      {left.map((tab) => (
        <SideTab key={tab.id} tab={tab} active={activeRouteName === tab.routeName} onPress={handlePress} />
      ))}

      <View style={styles.center}>
        <Pressable
          accessibilityLabel="AI chat"
          accessibilityRole="button"
          onPress={() => handlePress(aiTab.routeName)}
          style={({ pressed }) => [styles.fab, pressed ? styles.fabPressed : null]}
        >
          <ChatIcon size={24} color="#ffffff" fill="#ffffff" />
          <View style={styles.fabBadge}>
            <SparkleIcon size={10} color={colors.accent} />
          </View>
        </Pressable>
      </View>

      {right.map((tab) => (
        <SideTab key={tab.id} tab={tab} active={activeRouteName === tab.routeName} onPress={handlePress} />
      ))}
    </View>
  );
}

interface SideTabProps {
  tab: TabSpec;
  active: boolean;
  onPress: (routeName: string) => void;
}

function SideTab({ tab, active, onPress }: SideTabProps): JSX.Element {
  const color = active ? colors.ink : colors.ink3;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => onPress(tab.routeName)}
      style={styles.tab}
    >
      <View style={styles.tabIcon}>{renderIcon(tab.id, color, active)}</View>
      <Text style={[styles.tabLabel, { color, fontWeight: active ? "700" : "400" }]}>
        {tab.label}
      </Text>
      {active ? <View style={[styles.activeIndicator, { backgroundColor: color }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: "flex-end",
    backgroundColor: colors.paper,
    borderTopColor: colors.lineSoft,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 4,
    paddingTop: 8
  },
  tab: {
    alignItems: "center",
    flex: 1,
    gap: 3,
    paddingVertical: 4,
    position: "relative"
  },
  tabIcon: {
    height: 24,
    justifyContent: "center"
  },
  tabLabel: {
    fontSize: 11
  },
  activeIndicator: {
    borderRadius: 1,
    bottom: -2,
    height: 2,
    position: "absolute",
    width: 18
  },
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  fab: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderColor: colors.paper,
    borderRadius: radii.pill,
    borderWidth: 2,
    height: 56,
    justifyContent: "center",
    marginTop: -22,
    width: 56,
    ...shadows.fab
  },
  fabPressed: {
    opacity: 0.85
  },
  fabBadge: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 7,
    height: 14,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    top: -2,
    width: 14
  }
});
