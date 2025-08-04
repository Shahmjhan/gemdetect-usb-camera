import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useApp } from '../store/appContext';
import { colors } from '../styles/theme';

// Test importing MicroscopeView components step by step
let MicroscopeView = null;
let microscopeImportError = null;

// First test: Just try importing without using it
console.log('🧪 Step 1: Testing MicroscopeView dependencies...');

// Test importing Camera from expo-camera (used by MicroscopeView)
let cameraImportError = null;
try {
  console.log('🧪 Testing expo-camera import...');
  const { Camera, CameraType } = require('expo-camera');
  console.log('✅ expo-camera imported successfully');
} catch (error) {
  console.log('❌ Failed to import expo-camera:', error.message);
  cameraImportError = error.message;
}

// TEMPORARILY DISABLED - this line causes black screen
// MicroscopeView = require('../components/microscope/MicroscopeView').default;

const { width, height } = Dimensions.get('window');

export default function AnalysisScreenDebug({ navigation }) {
  console.log('🧪 AnalysisScreenDebug: Starting render...');
  
  const { setCurrentAnalysis, setIsAnalyzing } = useApp();
  const [selectedImage, setSelectedImage] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const insets = useSafeAreaInsets();
  
  console.log('🧪 AnalysisScreenDebug: State initialized');

  useEffect(() => {
    console.log('🧪 AnalysisScreenDebug: useEffect running');
    // Basic effect without complex animations
  }, []);

  const handleImagePicker = useCallback(() => {
    console.log('🧪 Image picker called');
    Alert.alert('Debug', 'Image picker would open here');
  }, []);

  const handleMicroscopeConnectionChange = useCallback((connected, device) => {
    console.log('🧪 Microscope connection change:', connected);
    setIsConnected(connected);
  }, []);

  console.log('🧪 AnalysisScreenDebug: About to render JSX');

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={styles.header}
      >
        <View style={[styles.headerContent, { paddingTop: insets.top }]}>
          <Text style={styles.title}>Debug Analysis Screen</Text>
          <Text style={styles.subtitle}>Testing step by step</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Debug Info</Text>
            <Text>Selected Image: {selectedImage ? 'Yes' : 'No'}</Text>
            <Text>Microscope Connected: {isConnected ? 'Yes' : 'No'}</Text>
            <Text>Analyzing: {analyzing ? 'Yes' : 'No'}</Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Image Upload</Text>
            <Button 
              mode="contained" 
              onPress={handleImagePicker}
              style={styles.button}
            >
              <Icon name="photo-camera" size={20} color="#fff" />
              Test Image Picker
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Microscope Status</Text>
            <Text>Connection Status: {isConnected ? '✅ Connected' : '❌ Disconnected'}</Text>
            {microscopeImportError && (
              <Text style={styles.errorText}>
                Microscope Import Error: {microscopeImportError}
              </Text>
            )}
            {cameraImportError && (
              <Text style={styles.errorText}>
                Camera Import Error: {cameraImportError}
              </Text>
            )}
            <Button 
              mode="outlined" 
              onPress={() => handleMicroscopeConnectionChange(!isConnected)}
              style={styles.button}
            >
              Toggle Connection
            </Button>
          </Card.Content>
        </Card>

        {MicroscopeView && Platform.OS === 'android' && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>USB Microscope Test</Text>
              <View style={styles.microscopeContainer}>
                <MicroscopeView 
                  isConnected={isConnected}
                  onImageCaptured={(imageData) => {
                    console.log('🧪 Image captured in debug screen');
                  }}
                  onConnectionChange={handleMicroscopeConnectionChange}
                  onSettingsChange={(settings) => {
                    console.log('🧪 Settings changed:', settings);
                  }}
                />
              </View>
            </Card.Content>
          </Card>
        )}

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Go Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingBottom: 20,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    marginBottom: 15,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.text,
  },
  button: {
    marginTop: 10,
  },
  backButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 5,
  },
  microscopeContainer: {
    height: 300,
    marginTop: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
});