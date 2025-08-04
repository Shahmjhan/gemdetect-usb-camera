import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../styles/theme';

export default function ResultDisplay({ results }) {
  const getIcon = (type) => {
    switch (type) {
      case 'Natural':
        return 'eco';
      case 'Synthetic':
        return 'science';
      default:
        return 'help-outline';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Icon name="access-time" size={20} color={colors.textSecondary} />
        <Text style={styles.label}>Analysis Time:</Text>
        <Text style={styles.value}>
          {new Date(results.timestamp).toLocaleString()}
        </Text>
      </View>

      <View style={styles.row}>
        <Icon name={getIcon(results.predicted_class)} size={20} color={colors.textSecondary} />
        <Text style={styles.label}>Classification:</Text>
        <Text style={[styles.value, styles.bold]}>{results.predicted_class}</Text>
      </View>

      <View style={styles.row}>
        <Icon name="analytics" size={20} color={colors.textSecondary} />
        <Text style={styles.label}>Confidence Score:</Text>
        <Text style={[styles.value, styles.bold]}>
          {(results.confidence * 100).toFixed(2)}%
        </Text>
      </View>

      <View style={styles.row}>
        <Icon name="security" size={20} color={colors.textSecondary} />
        <Text style={styles.label}>Reliability:</Text>
        <Text style={styles.value}>{results.confidence_analysis.level}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 10,
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  bold: {
    fontWeight: 'bold',
  },
});