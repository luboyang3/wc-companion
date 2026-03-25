import type { BarData, ChartInstruction, FormationData, RadarData } from "../../types/ai";
import { BarChartView } from "./BarChartView";
import { FormationDiagram } from "./FormationDiagram";
import { PlayerRadarChart } from "./PlayerRadarChart";

interface ChartRendererProps {
  chart: ChartInstruction;
  height?: number;
}

export function ChartRenderer({ chart, height }: ChartRendererProps): JSX.Element | null {
  switch (chart.chartType) {
    case "formation":
      return <FormationDiagram data={chart.data as FormationData} height={height} title={chart.title} />;
    case "player_radar":
      return <PlayerRadarChart data={chart.data as RadarData} height={height} title={chart.title} />;
    case "bar":
      return <BarChartView data={chart.data as BarData} height={height} title={chart.title} />;
    default:
      return null;
  }
}
