import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../styles/theme';

const { width, height } = Dimensions.get('window');

// Safe Camera import with fallback
let Camera = null;
let CameraType = null;
let cameraAvailable = false;

try {
  const cameraModule = require('expo-camera');
  Camera = cameraModule.Camera;
  CameraType = cameraModule.CameraType;
  cameraAvailable = true;
  console.log('✅ Camera module loaded successfully');
} catch (error) {
  console.log('⚠️ Camera module not available:', error.message);
  cameraAvailable = false;
}

export default function MicroscopeViewSafe({ 
  isConnected, 
  onImageCaptured, 
  onConnectionChange,
  onSettingsChange 
}) {
  const [hasPermission, setHasPermission] = useState(null);
  const [currentCameraType, setCurrentCameraType] = useState('back');
  const [isCapturing, setIsCapturing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  const cameraRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    checkCameraPermissions();
    startPulseAnimation();
  }, []);

  const checkCameraPermissions = async () => {
    if (!cameraAvailable || !Camera) {
      console.log('⚠️ Camera not available, cannot check permissions');
      setHasPermission(false);
      return;
    }

    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      console.log('📹 Camera permission status:', status);
    } catch (error) {
      console.log('❌ Error checking camera permissions:', error.message);
      setHasPermission(false);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const captureImage = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    
    try {
      console.log('📸 Capturing image from camera...');
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: true,
      });
      
      const imageData = `data:image/jpeg;base64,${photo.base64}`;
      
      if (onImageCaptured) {
        onImageCaptured(imageData);
      }
      
      Alert.alert('Success', 'Image captured successfully!');
    } catch (error) {
      console.error('❌ Error capturing image:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const renderCamera = () => {
    if (!cameraAvailable || !Camera || !CameraType) {
      return (
        <View style={styles.noStreamContainer}>
          <Icon name="camera-alt" size={48} color={colors.textSecondary} />
          <Text style={styles.noStreamText}>Camera not available</Text>
          <Text style={styles.subText}>Please check device compatibility</Text>
        </View>
      );
    }

    if (hasPermission === false) {
      return (
        <View style={styles.noStreamContainer}>
          <Icon name="camera-alt" size={48} color={colors.textSecondary} />
          <Text style={styles.noStreamText}>Camera Permission Required</Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={checkCameraPermissions}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (hasPermission === null) {
      return (
        <View style={styles.noStreamContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.noStreamText}>Checking camera permissions...</Text>
        </View>
      );
    }

    // Available camera types based on the currentCameraType state
    const getCameraType = () => {
      if (currentCameraType === 'front') return CameraType.front;
      if (currentCameraType === 'external') return CameraType.external || CameraType.back;
      return CameraType.back;
    };

    return (
      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={getCameraType()}
          ratio="16:9"
          zoom={zoomLevel}
          onCameraReady={() => {
            console.log('📹 Camera ready with type:', currentCameraType);
          }}
          onMountError={(error) => {
            console.log('❌ Camera mount error:', error);
            // Try fallback to back camera
            if (currentCameraType !== 'back') {
              console.log('🔄 Falling back to back camera');
              setCurrentCameraType('back');
            }
          }}
        >
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraText}>● USB MICROSCOPE</Text>
            <Text style={styles.cameraSubText}>
              {currentCameraType === 'external' ? '🔬 USB CAMERA' : 
               currentCameraType === 'back' ? '📱 BACK CAMERA' : 
               '🤳 FRONT CAMERA'}
            </Text>
          </View>
        </Camera>
        
        {/* Camera switcher buttons */}
        <View style={styles.cameraTypeButtons}>
          <TouchableOpacity 
            style={[
              styles.cameraTypeButton,
              currentCameraType === 'external' && styles.cameraTypeButtonActive
            ]}
            onPress={() => setCurrentCameraType('external')}
          >
            <Text style={styles.cameraTypeButtonText}>🔬 USB</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.cameraTypeButton,
              currentCameraType === 'back' && styles.cameraTypeButtonActive
            ]}
            onPress={() => setCurrentCameraType('back')}
          >
            <Text style={styles.cameraTypeButtonText}>📱 Back</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.cameraTypeButton,
              currentCameraType === 'front' && styles.cameraTypeButtonActive
            ]}
            onPress={() => setCurrentCameraType('front')}
          >
            <Text style={styles.cameraTypeButtonText}>🤳 Front</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderControls = () => {
    if (!hasPermission) return null;

    return (
      <View style={styles.controls}>
        <View style={styles.zoomControl}>
          <TouchableOpacity 
            onPress={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.5))} 
            style={styles.controlButton}
          >
            <Icon name="zoom-out" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.zoomText}>{zoomLevel.toFixed(1)}x</Text>
          <TouchableOpacity 
            onPress={() => setZoomLevel(Math.min(3, zoomLevel + 0.5))} 
            style={styles.controlButton}
          >
            <Icon name="zoom-in" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
          onPress={captureImage}
          disabled={isCapturing}
        >
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Icon name="camera" size={32} color="#FFFFFF" />
          </Animated.View>
          <Text style={styles.captureText}>
            {isCapturing ? 'Capturing...' : 'Capture Image'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View style={styles.viewfinder}>
        {renderCamera()}
      </Animated.View>
      {renderControls()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  viewfinder: {
    height: 300,
    backgroundColor: '#000000',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  noStreamContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noStreamText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 15,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cameraContainer: {
    width: '100%',
    height: '100%',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  cameraOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cameraText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cameraSubText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 2,
  },
  cameraTypeButtons: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  cameraTypeButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  cameraTypeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: '#FFFFFF',
  },
  cameraTypeButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  controls: {
    marginTop: 15,
  },
  zoomControl: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  controlButton: {
    padding: 10,
    backgroundColor: colors.background,
    borderRadius: 20,
    marginHorizontal: 15,
  },
  zoomText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    minWidth: 50,
    textAlign: 'center',
  },
  captureButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 25,
    marginHorizontal: 20,
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});