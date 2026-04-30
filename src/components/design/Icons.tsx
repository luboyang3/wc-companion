/**
 * Icon set ported from the Claude Design handoff (`shared.jsx`).
 *
 * Each icon is a small SVG that accepts `size` and `color`. Icons are stroke-
 * based unless noted (e.g., sparkle / send are filled).
 */

import Svg, { Circle, Path, Rect } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
}

interface FillIconProps extends IconProps {
  fill?: string;
}

const DEFAULT_SIZE = 22;
const DEFAULT_COLOR = "currentColor";

export function MatchesIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }: IconProps): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3.5} y={5} width={17} height={14} rx={2} />
      <Rect x={6.5} y={8.5} width={11} height={2.2} rx={0.6} fill={color} stroke="none" />
      <Rect x={6.5} y={13.3} width={11} height={2.2} rx={0.6} fill={color} stroke="none" />
    </Svg>
  );
}

export function SearchIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }: IconProps): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round">
      <Circle cx={11} cy={11} r={6.5} />
      <Path d="M16 16 L21 21" />
    </Svg>
  );
}

export function ChatIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, fill = "none" }: FillIconProps): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={1.5} strokeLinejoin="round">
      <Path d="M4 5 H20 V16 H13 L8 20 V16 H4 Z" />
    </Svg>
  );
}

export function StarIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, fill = "none" }: FillIconProps): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={1.5} strokeLinejoin="round">
      <Path d="M12 3 L14.5 9 L21 9.5 L16 13.5 L17.5 20 L12 16.5 L6.5 20 L8 13.5 L3 9.5 L9.5 9 Z" />
    </Svg>
  );
}

export function UserIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }: IconProps): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round">
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 21 C 4 16, 8 14, 12 14 S 20 16, 20 21" />
    </Svg>
  );
}

export function SparkleIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }: IconProps): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <Path d="M12 2 L13.2 9.5 L20.5 11 L13.2 12.5 L12 20 L10.8 12.5 L3.5 11 L10.8 9.5 Z" />
      <Path d="M19 3 L19.5 5.5 L22 6 L19.5 6.5 L19 9 L18.5 6.5 L16 6 L18.5 5.5 Z" />
    </Svg>
  );
}

export function SendIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }: IconProps): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <Path d="M3 12 L21 4 L17 21 L12 13 Z" />
    </Svg>
  );
}

export function MicIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }: IconProps): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round">
      <Rect x={9} y={3} width={6} height={12} rx={3} />
      <Path d="M5 12 C 5 16, 8 19, 12 19 S 19 16, 19 12 M12 19 V 22" />
    </Svg>
  );
}

export function CloseIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }: IconProps): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round">
      <Path d="M5 5 L19 19 M19 5 L5 19" />
    </Svg>
  );
}

export function HistoryIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }: IconProps): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round">
      <Path d="M3 12 a9 9 0 1 0 3-6.7 M3 4 V8 H7" />
      <Path d="M12 7 V12 L15 14" />
    </Svg>
  );
}

export function EditIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }: IconProps): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 20 H8 L19 9 L15 5 L4 16 Z" />
    </Svg>
  );
}

export function BellIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }: IconProps): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 16 V11 a6 6 0 0 1 12 0 V16 L20 18 H4 Z M10 21 H14" />
    </Svg>
  );
}

export function TrophyIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }: IconProps): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M7 4 H17 V10 a5 5 0 0 1 -10 0 Z M7 6 H4 V8 a3 3 0 0 0 3 3 M17 6 H20 V8 a3 3 0 0 1 -3 3 M10 15 H14 V20 H10 Z M8 20 H16" />
    </Svg>
  );
}

export function BackIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }: IconProps): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 5 L8 12 L15 19" />
    </Svg>
  );
}

export function PlusIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }: IconProps): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Path d="M12 5 V19 M5 12 H19" />
    </Svg>
  );
}

export function ChevronRightIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }: IconProps): JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 6 L15 12 L9 18" />
    </Svg>
  );
}
