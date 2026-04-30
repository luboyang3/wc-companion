import Svg, { Rect } from "react-native-svg";

const FLAG_COLORS: Record<string, [string, string]> = {
  BRA: ["#009b3a", "#fedf00"],
  FRA: ["#0055a4", "#ef4135"],
  ARG: ["#75aadb", "#ffffff"],
  ENG: ["#ffffff", "#ce1124"],
  ESP: ["#aa151b", "#f1bf00"],
  USA: ["#3c3b6e", "#b22234"],
  MEX: ["#006847", "#ce1126"],
  GER: ["#000000", "#dd0000"],
  POR: ["#006600", "#ff0000"],
  NED: ["#ae1c28", "#21468b"],
  JPN: ["#ffffff", "#bc002d"],
  KOR: ["#ffffff", "#003478"]
};

interface FlagProps {
  code: string;
  width?: number;
  height?: number;
}

export function Flag({ code, width = 22, height = 16 }: FlagProps): JSX.Element {
  const [a, b] = FLAG_COLORS[code] ?? ["#cccccc", "#999999"];
  return (
    <Svg width={width} height={height} viewBox="0 0 22 16">
      <Rect x={0} y={0} width={22} height={8} fill={a} />
      <Rect x={0} y={8} width={22} height={8} fill={b} />
    </Svg>
  );
}
