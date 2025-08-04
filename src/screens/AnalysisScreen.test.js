import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

// Minimal test version of AnalysisScreen to isolate the black screen issue
export default function AnalysisScreenTest({ navigation }) {
  console.log('🧪 AnalysisScreenTest: Component rendered');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test Analysis Screen</Text>
      <Text style={styles.subtitle}>This is a minimal test version</Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => {
          console.log('Test button pressed');
          navigation.goBack();
        }}
      >
        <Text style={styles.buttonText}>Go Back</Text>
      </TouchableOpacity>
      
      <Text style={styles.info}>
        If you can see this, the navigation works.
        The issue is in the full AnalysisScreen component.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 30,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  info: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    lineHeight: 20,
  },
});