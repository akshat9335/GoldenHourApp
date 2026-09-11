import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface DiagnosticTagsProps {
  diagnostics: string[];
}

export const DiagnosticTags: React.FC<DiagnosticTagsProps> = ({ diagnostics }) => {
  return (
    <View style={styles.container}>
      {diagnostics.map((diag, index) => (
        <View key={`${diag}-${index}`} style={styles.tag}>
          <Text style={styles.tagIcon}>✓</Text>
          <Text style={styles.tagText}>{diag}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: 6,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagIcon: {
    color: "#16A34A",
    fontSize: 11,
    fontWeight: "700",
    marginRight: 4,
  },
  tagText: {
    color: "#15803D",
    fontSize: 12,
    fontWeight: "600",
  },
});
