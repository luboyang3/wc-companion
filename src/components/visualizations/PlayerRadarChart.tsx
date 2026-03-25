import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polygon, Text as SvgText } from "react-native-svg";
import type { RadarData } from "../../types/ai";

interface PlayerRadarChartProps {
  title?: string;
  data: RadarData;
  height?: number;
}

const AXES: Array<keyof RadarData["attributes"]> = [
  "pace",
  "shooting",
  "passing",
  "dribbling",
  "defending",
  "physical"
];

export function PlayerRadarChart({ title, data, height = 220 }: PlayerRadarChartProps): JSX.Element {
  const size = 240;
  const center = size / 2;
  const maxRadius = 74;

  const points = AXES.map((axis, idx) => {
    const angle = (Math.PI * 2 * idx) / AXES.length - Math.PI / 2;
    const value = Math.max(0, Math.min(100, data.attributes[axis]));
    const radius = (value / 100) * maxRadius;
    return {
      axis,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
      axisX: center + Math.cos(angle) * (maxRadius + 16),
      axisY: center + Math.sin(angle) * (maxRadius + 16),
      edgeX: center + Math.cos(angle) * maxRadius,
      edgeY: center + Math.sin(angle) * maxRadius
    };
  });

  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Svg height={height} viewBox={`0 0 ${size} ${size}`} width="100%">
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <Circle
            key={ratio}
            cx={center}
            cy={center}
            fill="none"
            r={maxRadius * ratio}
            stroke="#D9DEE2"
            strokeWidth={1}
          />
        ))}

        {points.map((p) => (
          <Line key={`${p.axis}-line`} stroke="#C6CDD2" strokeWidth={1} x1={center} x2={p.edgeX} y1={center} y2={p.edgeY} />
        ))}

        <Polygon fill="rgba(0,99,65,0.25)" points={polygonPoints} stroke="#006341" strokeWidth={2} />

        {points.map((p) => (
          <SvgText key={`${p.axis}-label`} fill="#555555" fontSize="10" fontWeight="600" textAnchor="middle" x={p.axisX} y={p.axisY}>
            {p.axis}
          </SvgText>
        ))}
      </Svg>
      <Text style={styles.caption}>{data.playerName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6
  },
  title: {
    color: "#222222",
    fontSize: 13,
    fontWeight: "600"
  },
  caption: {
    color: "#555555",
    fontSize: 12
  }
});
