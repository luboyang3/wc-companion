import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
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
    backgroundColor: "rgba(0,0,0,0.5)",
    flex: 1,
    justifyContent: "center",
    padding: 16
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
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
    color: "#222222",
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    marginRight: 12
  },
  closeButton: {
    backgroundColor: "#006341",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontWeight: "600"
  }
});
