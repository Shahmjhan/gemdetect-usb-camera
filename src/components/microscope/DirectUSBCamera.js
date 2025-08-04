import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  NativeModules,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Camera } from 'react-native-vision-camera';
import { colors } from '../../styles/theme';

const { width, height } = Dimensions.get('window');

export default function DirectUSBCamera({ 
  isConnected, 
  onImageCaptured, 
  onConnectionChange,
  onSettingsChange 
}) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [isActive, setIsActive] = useState(false);
  
  const cameraRef = useRef(null);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      console.log('📹 Checking camera permissions...');
      
      // Check if react-native-vision-camera is available
      const cameraPermission = await Camera.requestCameraPermission();
      console.log('📱 Camera permission status:', cameraPermission);
      
      if (cameraPermission === 'authorized') {
        setHasPermission(true);
        await enumerateCameras();
      } else {
        setHasPermission(false);
        Alert.alert(
          'Camera Permission Required',
          'Please grant camera access to use the USB microscope feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Grant Permission', onPress: checkPermissions }
          ]
        );
      }
    } catch (error) {
      console.log('❌ Vision Camera not available, falling back to basic approach');
      // Fallback to basic camera enumeration
      await fallbackCameraDetection();
    }
  };

  const enumerateCameras = async () => {
    try {
      console.log('🔍 Enumerating available cameras...');
      const devices = await Camera.getAvailableCameraDevices();
      console.log('📹 Found cameras:', devices.map(d => ({ id: d.id, position: d.position })));
      
      setCameras(devices);
      
      // Look for external/USB camera
      const usbCamera = devices.find(device => 
        device.position === 'external' || 
        device.id.toLowerCase().includes('usb') ||
        device.id.toLowerCase().includes('external')
      );
      
      if (usbCamera) {
        console.log('✅ USB Camera detected:', usbCamera.id);
        setSelectedCamera(usbCamera);
        if (onConnectionChange) {
          onConnectionChange(true, { name: `USB Camera (${usbCamera.id})`, type: 'USB' });
        }
      } else {
        // Use back camera as default
        const backCamera = devices.find(device => device.position === 'back');
        if (backCamera) {
          setSelectedCamera(backCamera);
          console.log('📱 Using back camera as fallback:', backCamera.id);
        }
      }
      
    } catch (error) {
      console.log('❌ Error enumerating cameras:', error.message);
      await fallbackCameraDetection();
    }
  };

  const fallbackCameraDetection = async () => {
    console.log('🔄 Using fallback camera detection...');
    
    // Create mock camera objects for manual selection
    const mockCameras = [
      { id: 'back', position: 'back', name: '📱 Phone Camera (Back)' },
      { id: 'front', position: 'front', name: '🤳 Phone Camera (Front)' },
      { id: 'external', position: 'external', name: '🔬 USB Microscope (External)' },
    ];
    
    setCameras(mockCameras);
    setSelectedCamera(mockCameras[2]); // Default to USB microscope
    setHasPermission(true);
  };

  const switchCamera = (camera) => {
    console.log('🔄 Switching to camera:', camera.id);
    setSelectedCamera(camera);
    setIsActive(false);
    
    setTimeout(() => {
      setIsActive(true);
    }, 100);
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;
    
    setIsCapturing(true);
    
    try {
      console.log('📸 Capturing photo from:', selectedCamera?.id);
      
      const photo = await cameraRef.current.takePhoto({
        quality: 100,
        enableAutoRedEyeReduction: true,
      });
      
      console.log('✅ Photo captured:', photo.path);
      
      // Convert to base64 for compatibility
      const imageUri = `file://${photo.path}`;
      
      if (onImageCaptured) {
        onImageCaptured(imageUri);
      }
      
      Alert.alert('Success', `Image captured from ${selectedCamera?.name || 'camera'}!`);
      
    } catch (error) {
      console.error('❌ Error capturing photo:', error);
      Alert.alert('Capture Failed', 'Failed to capture image. Try switching cameras or check USB connection.');
    } finally {
      setIsCapturing(false);
    }
  };

  const renderCamera = () => {
    if (!hasPermission) {
      return (
        <View style={styles.noPermissionContainer}>
          <Icon name="camera-alt" size={48} color={colors.textSecondary} />
          <Text style={styles.noPermissionText}>Camera Permission Required</Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={checkPermissions}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!selectedCamera) {
      return (
        <View style={styles.noPermissionContainer}>
          <Icon name="camera-alt" size={48} color={colors.textSecondary} />
          <Text style={styles.noPermissionText}>No Camera Selected</Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={enumerateCameras}
          >
            <Text style={styles.permissionButtonText}>Detect Cameras</Text>
          </TouchableOpacity>
        </View>
      );
    }

    try {
      return (
        <View style={styles.cameraContainer}>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            device={selectedCamera}
            isActive={isActive && hasPermission}
            photo={true}
            onInitialized={() => {
              console.log('📹 Camera initialized:', selectedCamera.id);
            }}
            onError={(error) => {
              console.log('❌ Camera error:', error);
            }}
          />
          
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraText}>
              {selectedCamera.position === 'external' ? '● USB MICROSCOPE' : '● PHONE CAMERA'}
            </Text>
            <Text style={styles.cameraSubText}>
              {selectedCamera.name || selectedCamera.id}
            </Text>
          </View>
        </View>
      );
    } catch (error) {
      console.log('❌ Error rendering camera:', error);
      return (
        <View style={styles.noPermissionContainer}>
          <Icon name="error" size={48} color={colors.error} />
          <Text style={styles.noPermissionText}>Camera Error</Text>
          <Text style={styles.errorText}>{error.message}</Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={() => setIsActive(!isActive)}
          >
            <Text style={styles.permissionButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  const renderControls = () => {
    return (
      <View style={styles.controls}>
        {/* Camera switching buttons */}
        <View style={styles.cameraButtons}>
          {cameras.map((camera) => (
            <TouchableOpacity
              key={camera.id}
              style={[
                styles.cameraButton,
                selectedCamera?.id === camera.id && styles.cameraButtonActive
              ]}
              onPress={() => switchCamera(camera)}
            >
              <Text style={styles.cameraButtonText}>
                {camera.position === 'external' ? '🔬' :
                 camera.position === 'front' ? '🤳' : '📱'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Capture button */}
        <TouchableOpacity
          style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
          onPress={capturePhoto}
          disabled={isCapturing || !selectedCamera || !isActive}
        >
          <Icon name="camera" size={32} color="#FFFFFF" />
          <Text style={styles.captureText}>
            {isCapturing ? 'Capturing...' : 'Capture Image'}
          </Text>
        </TouchableOpacity>

        {/* Status info */}
        <View style={styles.statusInfo}>
          <Text style={styles.statusText}>
            📹 {cameras.length} camera(s) detected
          </Text>
          <Text style={styles.statusText}>
            🔬 Current: {selectedCamera?.name || selectedCamera?.id || 'None'}
          </Text>
        </View>
      </View>
    );
  };

  useEffect(() => {
    if (hasPermission && selectedCamera) {
      setIsActive(true);
    }
    
    return () => {
      setIsActive(false);
    };
  }, [hasPermission, selectedCamera]);

  return (
    <View style={styles.container}>
      <View style={styles.viewfinder}>
        {renderCamera()}
      </View>
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
  noPermissionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noPermissionText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorText: {
    color: '#FF6B6B',
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
  controls: {
    marginTop: 15,
  },
  cameraButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  cameraButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: colors.primary,
    minWidth: 60,
    alignItems: 'center',
  },
  cameraButtonActive: {
    backgroundColor: colors.primary,
    borderColor: '#FFFFFF',
  },
  cameraButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  captureButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 25,
    marginHorizontal: 20,
    marginBottom: 15,
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
  statusInfo: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 20,
  },
  statusText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
});