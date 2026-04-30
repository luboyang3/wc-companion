import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../../theme/tokens";
import type { ChartInstruction } from "../../types/ai";
import { ChartRenderer } from "./ChartRenderer";

interface FullScreenChartProps {
  chart: ChartInstruction | null;
  visible: boolean;
  onClose: () => void;
}

export function FullScreenChart({ chart, visible, onClose }: FullScreenChartProps): JSX.Element {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{chart?.title ?? "Chart"}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
          {chart ? <ChartRenderer chart={chart} height={380} /> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    flex: 1,
    justifyContent: "center",
    padding: 16
  },
  card: {
    backgroundColor: colors.paper2,
    borderColor: colors.lineSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    maxHeight: "90%",
    padding: 12,
    width: "100%"
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  title: {
    color: colors.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    marginRight: 12
  },
  closeButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  closeButtonText: {
    color: "#000000",
    fontWeight: "700"
  }
});
