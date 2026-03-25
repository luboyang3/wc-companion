import { StyleSheet, Text, View } from "react-native";
import Svg, { G, Rect, Text as SvgText } from "react-native-svg";
import type { BarData } from "../../types/ai";

interface BarChartViewProps {
  title?: string;
  data: BarData;
  height?: number;
}

export function BarChartView({ title, data, height = 220 }: BarChartViewProps): JSX.Element {
  const width = 320;
  const chartHeight = 110;
  const maxValue = Math.max(1, ...data.items.map((item) => item.value));
  const barWidth = Math.max(20, (width - 28) / Math.max(1, data.items.length) - 8);

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Svg height={height} viewBox={`0 0 ${width} 170`} width="100%">
        <Rect fill="#F6F8F9" height={chartHeight + 18} rx="8" width={width - 16} x="8" y="22" />
        {data.items.map((item, index) => {
          const normalized = item.value / maxValue;
          const barHeight = normalized * chartHeight;
          const x = 16 + index * (barWidth + 8);
          const y = 22 + chartHeight - barHeight;
          return (
            <G key={`${item.label}-${index}`}>
              <Rect fill="#006341" height={barHeight} rx="4" width={barWidth} x={x} y={y} />
              <SvgText fill="#222222" fontSize="9" fontWeight="700" textAnchor="middle" x={x + barWidth / 2} y={y - 4}>
                {item.value}
              </SvgText>
              <SvgText fill="#555555" fontSize="8.5" textAnchor="middle" x={x + barWidth / 2} y={22 + chartHeight + 12}>
                {item.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
      {data.unit ? <Text style={styles.caption}>Unit: {data.unit}</Text> : null}
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
