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

// Safe import of Camera components
let Camera = null;
let CameraType = null;
let cameraModuleAvailable = false;

try {
  const cameraModule = require('expo-camera');
  Camera = cameraModule.Camera;
  CameraType = cameraModule.CameraType;
  cameraModuleAvailable = true;
  console.log('✅ Expo Camera module imported successfully');
  console.log('📹 Available CameraType values:', CameraType);
} catch (error) {
  console.log('❌ Failed to import expo-camera:', error.message);
  cameraModuleAvailable = false;
}

const { width, height } = Dimensions.get('window');

export default function SmartMicroscopeView({ 
  isConnected, 
  onImageCaptured, 
  onConnectionChange,
  onSettingsChange 
}) {
  const [hasPermission, setHasPermission] = useState(null);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0); // Start with phone camera (0)
  const [availableCameras, setAvailableCameras] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [cameraReady, setCameraReady] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  
  const cameraRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    initializeCamera();
    startPulseAnimation();
  }, []);

  useEffect(() => {
    // Auto-detect USB microscope when cameras change
    detectUSBMicroscope();
  }, [availableCameras]);

  const initializeCamera = async () => {
    console.log('📹 Initializing smart camera system...');
    setIsRequestingPermission(true);
    
    if (!cameraModuleAvailable || !Camera) {
      console.log('❌ Camera module not available');
      setHasPermission(false);
      setIsRequestingPermission(false);
      Alert.alert('Camera Not Available', 'Camera module is not properly installed. Please check your development build configuration.');
      return;
    }
    
    try {
      console.log('📱 Requesting camera permission...');
      // Request camera permission
      const { status } = await Camera.requestCameraPermissionsAsync();
      console.log('📱 Camera permission status:', status);
      
      setHasPermission(status === 'granted');
      
      if (status === 'granted') {
        console.log('✅ Camera permission granted - enumerating cameras...');
        await enumerateCameras();
      } else {
        console.log('❌ Camera permission denied');
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access in your device settings to use the microscope feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // On Android, we can't directly open settings, but we can show instructions
              Alert.alert(
                'Enable Camera Permission',
                'Go to Settings > Apps > GemDetect > Permissions > Camera and enable it.'
              );
            }}
          ]
        );
      }
    } catch (error) {
      console.log('❌ Error initializing camera:', error.message);
      setHasPermission(false);
      Alert.alert('Error', 'Failed to request camera permission: ' + error.message);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const enumerateCameras = async () => {
    try {
      console.log('🔍 Detecting available cameras...');
      
      // Get available camera types
      const cameraTypes = await Camera.getAvailableCameraTypesAsync();
      console.log('📹 Available camera types:', cameraTypes);
      
      // Map camera types to our camera list
      const cameras = [];
      
      // Always add back camera as camera 0 (phone camera)
      if (cameraTypes.includes('back') || (CameraType && cameraTypes.includes(CameraType.back))) {
        cameras.push({
          index: 0,
          type: CameraType?.back || 'back',
          name: '📱 Phone Camera (Back)',
          isUSB: false
        });
      }
      
      // Add front camera as option
      if (cameraTypes.includes('front') || (CameraType && cameraTypes.includes(CameraType.front))) {
        cameras.push({
          index: cameras.length,
          type: CameraType?.front || 'front',
          name: '🤳 Phone Camera (Front)', 
          isUSB: false
        });
      }
      
      // Check for external/USB cameras (index 1+)
      if (cameraTypes.includes('external') || (CameraType && cameraTypes.includes(CameraType.external))) {
        cameras.push({
          index: cameras.length,
          type: CameraType?.external || 'external',
          name: '🔬 USB Digital Microscope',
          isUSB: true
        });
        console.log('✅ USB Digital Microscope detected!');
      }
      
      // If we have more than 2 cameras, assume additional ones are USB devices
      if (cameraTypes.length > 2) {
        console.log('🔍 Additional cameras detected - likely USB devices');
        for (let i = 2; i < cameraTypes.length; i++) {
          cameras.push({
            index: cameras.length,
            type: cameraTypes[i] || CameraType?.back || 'back',
            name: `🔬 USB Device ${i-1}`,
            isUSB: true
          });
        }
      }
      
      setAvailableCameras(cameras);
      console.log('📹 Camera enumeration complete:', cameras);
      
    } catch (error) {
      console.log('❌ Error enumerating cameras:', error.message);
      // Fallback to basic camera setup
      setAvailableCameras([
        { index: 0, type: CameraType?.back || 'back', name: '📱 Phone Camera', isUSB: false }
      ]);
    }
  };

  const detectUSBMicroscope = () => {
    // Auto-switch to USB microscope if detected
    const usbCamera = availableCameras.find(cam => cam.isUSB);
    if (usbCamera && currentCameraIndex === 0) {
      console.log('🔬 USB Digital Microscope detected - auto-switching...');
      setCurrentCameraIndex(usbCamera.index);
      
      // Notify parent component about USB connection
      if (onConnectionChange) {
        onConnectionChange(true, { name: usbCamera.name, type: 'USB' });
      }
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

  const getCurrentCamera = () => {
    return availableCameras.find(cam => cam.index === currentCameraIndex) || availableCameras[0];
  };

  const switchCamera = (targetIndex) => {
    console.log(`🔄 Switching to camera ${targetIndex}`);
    setCurrentCameraIndex(targetIndex);
    setCameraReady(false);
    
    const camera = availableCameras.find(cam => cam.index === targetIndex);
    if (camera?.isUSB && onConnectionChange) {
      onConnectionChange(true, { name: camera.name, type: 'USB' });
    }
  };

  const captureImage = async () => {
    if (!cameraRef.current || isCapturing || !cameraReady) return;

    setIsCapturing(true);
    
    try {
      console.log('📸 Capturing image from camera index:', currentCameraIndex);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: true,
      });
      
      const imageData = `data:image/jpeg;base64,${photo.base64}`;
      
      if (onImageCaptured) {
        onImageCaptured(imageData);
      }
      
      const currentCam = getCurrentCamera();
      Alert.alert('Success', `Image captured from ${currentCam?.name || 'camera'}!`);
    } catch (error) {
      console.error('❌ Error capturing image:', error);
      Alert.alert('Error', 'Failed to capture image. Try switching cameras.');
    } finally {
      setIsCapturing(false);
    }
  };

  const renderCamera = () => {
    if (hasPermission === false) {
      return (
        <View style={styles.noStreamContainer}>
          <Icon name="camera-alt" size={48} color={colors.textSecondary} />
          <Text style={styles.noStreamText}>Camera Permission Required</Text>
          <TouchableOpacity 
            style={[styles.permissionButton, isRequestingPermission && styles.permissionButtonDisabled]}
            onPress={initializeCamera}
            disabled={isRequestingPermission}
          >
            {isRequestingPermission && (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.permissionButtonText}>
              {isRequestingPermission ? 'Requesting...' : 'Grant Permission'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (hasPermission === null) {
      return (
        <View style={styles.noStreamContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.noStreamText}>Initializing camera system...</Text>
        </View>
      );
    }

    if (availableCameras.length === 0) {
      return (
        <View style={styles.noStreamContainer}>
          <Icon name="camera-alt" size={48} color={colors.textSecondary} />
          <Text style={styles.noStreamText}>No cameras available</Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={enumerateCameras}
          >
            <Text style={styles.permissionButtonText}>Retry Detection</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const currentCamera = getCurrentCamera();
    
    return (
      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={currentCamera?.type || CameraType?.back || 'back'}
          ratio="16:9"
          zoom={zoomLevel}
          onCameraReady={() => {
            console.log('📹 Camera ready:', currentCamera?.name);
            setCameraReady(true);
          }}
          onMountError={(error) => {
            console.log('❌ Camera mount error:', error);
            setCameraReady(false);
            
            // Try next available camera
            const nextIndex = (currentCameraIndex + 1) % availableCameras.length;
            if (nextIndex !== currentCameraIndex) {
              console.log('🔄 Auto-switching to next camera...');
              setTimeout(() => switchCamera(nextIndex), 1000);
            }
          }}
        >
          {/* Status overlay */}
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraText}>
              {currentCamera?.isUSB ? '● USB MICROSCOPE' : '● PHONE CAMERA'}
            </Text>
            <Text style={styles.cameraSubText}>
              {currentCamera?.name || 'Camera'}
            </Text>
            <Text style={styles.cameraStatusText}>
              {cameraReady ? '✅ READY' : '⏳ LOADING...'}
            </Text>
          </View>
        </Camera>
        
        {/* Camera switcher buttons */}
        <View style={styles.cameraTypeButtons}>
          {availableCameras.map((camera) => (
            <TouchableOpacity 
              key={camera.index}
              style={[
                styles.cameraTypeButton,
                currentCameraIndex === camera.index && styles.cameraTypeButtonActive
              ]}
              onPress={() => switchCamera(camera.index)}
            >
              <Text style={styles.cameraTypeButtonText}>
                {camera.isUSB ? '🔬' : camera.type === (CameraType?.front || 'front') ? '🤳' : '📱'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderControls = () => {
    if (!hasPermission || !cameraReady) return null;

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
          disabled={isCapturing || !cameraReady}
        >
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Icon name="camera" size={32} color="#FFFFFF" />
          </Animated.View>
          <Text style={styles.captureText}>
            {isCapturing ? 'Capturing...' : cameraReady ? 'Capture Image' : 'Camera Loading...'}
          </Text>
        </TouchableOpacity>
        
        {availableCameras.length > 1 && (
          <View style={styles.infoText}>
            <Text style={styles.infoTextSmall}>
              📋 {availableCameras.length} cameras detected • Currently using: {getCurrentCamera()?.name}
            </Text>
          </View>
        )}
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
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionButtonDisabled: {
    opacity: 0.6,
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
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cameraText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cameraSubText: {
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 2,
    opacity: 0.9,
  },
  cameraStatusText: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 2,
    opacity: 0.8,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.primary,
    minWidth: 40,
    alignItems: 'center',
  },
  cameraTypeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: '#FFFFFF',
  },
  cameraTypeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
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
  infoText: {
    marginTop: 10,
    alignItems: 'center',
  },
  infoTextSmall: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});