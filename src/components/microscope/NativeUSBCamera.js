import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  NativeModules,
  NativeEventEmitter,
  DeviceEventManager,
  PermissionsAndroid,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../styles/theme';

const { USBCameraModule } = NativeModules;

export default function NativeUSBCamera({ 
  isConnected, 
  onImageCaptured, 
  onConnectionChange,
  onSettingsChange 
}) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [cameraStatus, setCameraStatus] = useState('initializing');
  const [previewActive, setPreviewActive] = useState(false);

  const eventEmitter = useRef(null);

  useEffect(() => {
    initializeUSBCamera();
    
    return () => {
      cleanup();
    };
  }, []);

  const initializeUSBCamera = async () => {
    try {
      console.log('🔬 Initializing Native USB Camera Module...');
      
      if (!USBCameraModule) {
        console.error('❌ USBCameraModule not available');
        setCameraStatus('module_not_available');
        return;
      }

      // Set up event listeners
      setupEventListeners();
      
      // Request camera permission
      await requestCameraPermission();
      
      if (hasPermission) {
        await detectCameras();
      }
      
    } catch (error) {
      console.error('❌ Error initializing USB camera:', error);
      setCameraStatus('error');
    }
  };

  const setupEventListeners = () => {
    try {
      eventEmitter.current = new NativeEventEmitter(USBCameraModule);
      
      // Listen for USB camera events
      const cameraEventListener = eventEmitter.current.addListener(
        'USBCameraEvent',
        (event) => {
          console.log('📹 USB Camera Event:', event);
          handleCameraEvent(event);
        }
      );

      // Listen for image capture events
      const imageCaptureListener = eventEmitter.current.addListener(
        'USBCameraImageCaptured',
        (event) => {
          console.log('📸 Image captured from USB camera');
          handleImageCaptured(event);
        }
      );

      return () => {
        cameraEventListener.remove();
        imageCaptureListener.remove();
      };
    } catch (error) {
      console.error('❌ Error setting up event listeners:', error);
    }
  };

  const requestCameraPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'USB Microscope Camera Permission',
            message: 'This app needs camera access to use your USB digital microscope',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        
        const hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        setHasPermission(hasPermission);
        
        if (!hasPermission) {
          setCameraStatus('permission_denied');
        }
        
        return hasPermission;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error requesting camera permission:', error);
      setCameraStatus('permission_error');
      return false;
    }
  };

  const detectCameras = async () => {
    try {
      console.log('🔍 Detecting available cameras...');
      setCameraStatus('detecting');
      
      const availableCameras = await USBCameraModule.getAvailableCameras();
      console.log('📹 Available cameras:', availableCameras);
      
      setCameras(availableCameras);
      
      // Look for USB/external cameras first
      const usbCamera = availableCameras.find(camera => camera.isUSBCamera);
      if (usbCamera) {
        console.log('✅ USB Camera found:', usbCamera.name);
        setSelectedCamera(usbCamera);
        setCameraStatus('usb_camera_found');
        
        if (onConnectionChange) {
          onConnectionChange(true, { 
            name: usbCamera.name, 
            type: 'USB', 
            id: usbCamera.id 
          });
        }
      } else {
        console.log('⚠️ No USB camera found, using phone camera as fallback');
        const backCamera = availableCameras.find(camera => camera.type === 'back');
        if (backCamera) {
          setSelectedCamera(backCamera);
          setCameraStatus('phone_camera_only');
        } else {
          setCameraStatus('no_cameras');
        }
      }
      
    } catch (error) {
      console.error('❌ Error detecting cameras:', error);
      setCameraStatus('detection_error');
      Alert.alert('Detection Error', `Failed to detect cameras: ${error.message}`);
    }
  };

  const openCamera = async (cameraId) => {
    try {
      console.log('📹 Opening camera:', cameraId);
      setCameraStatus('opening');
      
      await USBCameraModule.openCamera(cameraId);
      console.log('✅ Camera opened successfully');
      
    } catch (error) {
      console.error('❌ Error opening camera:', error);
      setCameraStatus('open_error');
      Alert.alert('Camera Error', `Failed to open camera: ${error.message}`);
    }
  };

  const startPreview = async () => {
    try {
      console.log('🎥 Starting camera preview...');
      setCameraStatus('starting_preview');
      
      await USBCameraModule.startPreview(1920, 1080); // HD resolution
      setPreviewActive(true);
      setCameraStatus('preview_active');
      
    } catch (error) {
      console.error('❌ Error starting preview:', error);
      setCameraStatus('preview_error');
      Alert.alert('Preview Error', `Failed to start preview: ${error.message}`);
    }
  };

  const captureImage = async () => {
    if (isCapturing) return;
    
    setIsCapturing(true);
    
    try {
      console.log('📸 Capturing image from USB microscope...');
      
      await USBCameraModule.captureImage();
      // Image will be received via event listener
      
    } catch (error) {
      console.error('❌ Error capturing image:', error);
      Alert.alert('Capture Error', `Failed to capture image: ${error.message}`);
      setIsCapturing(false);
    }
  };

  const handleCameraEvent = (event) => {
    console.log('📹 Camera event received:', event);
    
    switch (event.status) {
      case 'opened':
        setCameraStatus('camera_opened');
        startPreview();
        break;
      case 'disconnected':
        setCameraStatus('disconnected');
        setPreviewActive(false);
        if (onConnectionChange) {
          onConnectionChange(false, null);
        }
        break;
      case 'error':
        setCameraStatus('camera_error');
        setPreviewActive(false);
        Alert.alert('Camera Error', `Camera error occurred (code: ${event.errorCode})`);
        break;
      case 'preview_started':
        setCameraStatus('preview_active');
        setPreviewActive(true);
        break;
    }
  };

  const handleImageCaptured = (event) => {
    console.log('📸 Image captured event received');
    setIsCapturing(false);
    
    if (event.imageData && onImageCaptured) {
      onImageCaptured(event.imageData);
    }
  };

  const cleanup = async () => {
    try {
      if (eventEmitter.current) {
        eventEmitter.current.removeAllListeners('USBCameraEvent');
        eventEmitter.current.removeAllListeners('USBCameraImageCaptured');
      }
      
      if (USBCameraModule && previewActive) {
        await USBCameraModule.closeCamera();
      }
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  };

  const switchCamera = async (camera) => {
    try {
      console.log('🔄 Switching to camera:', camera.name);
      
      // Close current camera
      if (previewActive) {
        await USBCameraModule.closeCamera();
        setPreviewActive(false);
      }
      
      // Open new camera
      setSelectedCamera(camera);
      await openCamera(camera.id);
      
    } catch (error) {
      console.error('❌ Error switching camera:', error);
      Alert.alert('Switch Error', `Failed to switch camera: ${error.message}`);
    }
  };

  const getStatusMessage = () => {
    switch (cameraStatus) {
      case 'initializing': return '🔄 Initializing USB camera...';
      case 'detecting': return '🔍 Detecting cameras...';
      case 'usb_camera_found': return '✅ USB Microscope Ready';
      case 'phone_camera_only': return '📱 Using phone camera (USB not found)';
      case 'preview_active': return '🎥 Live preview active';
      case 'permission_denied': return '❌ Camera permission denied';
      case 'module_not_available': return '❌ Native module not available';
      case 'no_cameras': return '❌ No cameras detected';
      default: return '⚠️ Camera status unknown';
    }
  };

  const renderCameraInterface = () => {
    return (
      <View style={styles.cameraInterface}>
        <Icon 
          name={selectedCamera?.isUSBCamera ? "usb" : "camera-alt"} 
          size={48} 
          color={colors.primary} 
        />
        <Text style={styles.cameraTitle}>
          {selectedCamera?.name || 'USB Digital Microscope'}
        </Text>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {getStatusMessage()}
          </Text>
        </View>
        
        {previewActive && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
        
        <Text style={styles.instructionText}>
          {selectedCamera?.isUSBCamera 
            ? 'USB microscope connected and ready for capture'
            : 'Connect USB microscope via OTG cable for direct access'
          }
        </Text>
      </View>
    );
  };

  const renderControls = () => {
    if (!hasPermission) {
      return (
        <View style={styles.permissionContainer}>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={requestCameraPermission}
          >
            <Icon name="security" size={20} color="#FFFFFF" />
            <Text style={styles.permissionButtonText}>Grant Camera Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.controls}>
        <Text style={styles.controlsTitle}>📹 Camera Controls</Text>
        
        {/* Camera selection */}
        <View style={styles.cameraGrid}>
          {cameras.map((camera) => (
            <TouchableOpacity
              key={camera.id}
              style={[
                styles.cameraButton,
                selectedCamera?.id === camera.id && styles.cameraButtonActive,
                camera.isUSBCamera && styles.usbCameraButton
              ]}
              onPress={() => switchCamera(camera)}
            >
              <Text style={styles.cameraButtonText}>
                {camera.isUSBCamera ? '🔬' : camera.type === 'front' ? '🤳' : '📱'}
              </Text>
              <Text style={styles.cameraNameText}>
                {camera.isUSBCamera ? 'USB' : camera.type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Capture button */}
        <TouchableOpacity
          style={[
            styles.captureButton,
            (!selectedCamera || isCapturing) && styles.captureButtonDisabled
          ]}
          onPress={captureImage}
          disabled={!selectedCamera || isCapturing}
        >
          <Icon name="camera" size={24} color="#FFFFFF" />
          <Text style={styles.captureButtonText}>
            {isCapturing ? '📸 Capturing...' : '📸 Capture Image'}
          </Text>
        </TouchableOpacity>

        {/* Camera info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>💡 Native USB Camera Access:</Text>
          <Text style={styles.infoText}>• Direct access to Android Camera2 API</Text>
          <Text style={styles.infoText}>• Real-time USB camera detection</Text>
          <Text style={styles.infoText}>• External camera support via UVC drivers</Text>
          <Text style={styles.infoText}>• Live preview from USB microscope</Text>
          <Text style={styles.infoText}>• {cameras.length} camera(s) detected</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.viewfinder}>
        {renderCameraInterface()}
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
  cameraInterface: {
    alignItems: 'center',
    padding: 20,
  },
  cameraTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  statusContainer: {
    marginTop: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.error,
    borderRadius: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 5,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  instructionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 15,
    textAlign: 'center',
    lineHeight: 16,
  },
  controls: {
    marginTop: 15,
    paddingHorizontal: 10,
  },
  controlsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionContainer: {
    padding: 20,
    alignItems: 'center',
  },
  permissionButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cameraGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  cameraButton: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 25,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    minWidth: 60,
  },
  cameraButtonActive: {
    backgroundColor: colors.primary,
    borderColor: '#FFFFFF',
  },
  usbCameraButton: {
    borderColor: colors.success,
    borderWidth: 2,
  },
  cameraButtonText: {
    fontSize: 20,
    marginBottom: 4,
  },
  cameraNameText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: 'bold',
  },
  captureButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  infoBox: {
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    paddingLeft: 8,
  },
});