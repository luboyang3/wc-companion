/**
 * Design tokens for World Cup Companion.
 *
 * Adopted from the Claude Design handoff bundle (`world-cup-companion`).
 * Dark-first palette with a single FIFA-y green spot accent.
 *
 * Font families fall back to platform system fonts; the design originally
 * specified Inter / Kalam / Caveat / JetBrains Mono. These can be swapped in
 * later via expo-font without changing consumer code.
 */

export const colors = {
  paper: "#0e0e10",
  paper2: "#18181b",
  surface: "#1a1a1d",
  surfaceMuted: "#141417",

  ink: "#f0efeb",
  ink2: "#c9c7c1",
  ink3: "#8a8884",
  ink4: "#5a5854",

  line: "#c9c7c1",
  lineSoft: "#3a3a3d",
  lineMuted: "#2a2a2d",
  lineDim: "#1f1f22",

  accent: "#00c853",
  accentSoft: "rgba(0, 200, 83, 0.15)",
  accentGhost: "rgba(0, 200, 83, 0.06)",
  accentShadow: "rgba(0, 200, 83, 0.35)",

  live: "#d12028",
  liveSoft: "rgba(255, 0, 40, 0.1)",
  liveBorder: "rgba(209, 32, 40, 0.3)",

  compare: "#5aa9ff"
} as const;

export const fonts = {
  sans: "System",
  hand: "System",
  display: "System",
  mono: "Menlo"
} as const;

export const radii = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  pill: 99
} as const;

export const spacing = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24
} as const;

export const shadows = {
  fab: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8
  }
} as const;
