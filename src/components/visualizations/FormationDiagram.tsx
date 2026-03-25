import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Line, Rect, Text as SvgText } from "react-native-svg";
import type { FormationData } from "../../types/ai";

interface FormationDiagramProps {
  title?: string;
  data: FormationData;
  height?: number;
}

export function FormationDiagram({ title, data, height = 220 }: FormationDiagramProps): JSX.Element {
  const width = 320;

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Svg height={height} viewBox={`0 0 ${width} 100`} width="100%">
        <Rect fill="#0D6B3A" height="100" rx="3" width={width} x="0" y="0" />
        <Rect fill="none" height="80" rx="2" stroke="#CDE9D8" strokeWidth="1" width={width - 20} x="10" y="10" />
        <Line stroke="#CDE9D8" strokeWidth="1" x1="10" x2={width - 10} y1="50" y2="50" />
        <Circle cx={width / 2} cy="50" fill="none" r="8" stroke="#CDE9D8" strokeWidth="1" />
        <Rect fill="none" height="12" stroke="#CDE9D8" strokeWidth="1" width="70" x={(width - 70) / 2} y="10" />
        <Rect fill="none" height="12" stroke="#CDE9D8" strokeWidth="1" width="70" x={(width - 70) / 2} y="78" />

        {data.players.map((player) => {
          const x = (player.x / 100) * width;
          const y = player.y;
          return (
            <G key={`${player.name}-${player.position}`}>
              <Circle cx={x} cy={y} fill="#F7D154" r="3.4" stroke="#113C24" strokeWidth="0.8" />
              <SvgText
                fill="#FFFFFF"
                fontSize="3.2"
                fontWeight="700"
                stroke="#113C24"
                strokeWidth="0.2"
                textAnchor="middle"
                x={x}
                y={y - 4.8}
              >
                {player.name}
              </SvgText>
            </G>
          );
        })}
      </Svg>
      <Text style={styles.caption}>Formation: {data.formation}</Text>
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
