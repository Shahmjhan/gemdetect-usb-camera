import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Image,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Camera, CameraType } from 'expo-camera';
import { colors } from '../../styles/theme';

// Safely import microscope manager with error handling
let usbMicroscopeManager = null;
let MicroscopeUtils = null;

try {
  const microscopeModule = require('../../../utils/microscope');
  usbMicroscopeManager = microscopeModule.default;
  MicroscopeUtils = microscopeModule.MicroscopeUtils;
  console.log('✅ USB microscope manager imported successfully');
} catch (error) {
  console.log('❌ Failed to import microscope manager:', error.message);
  // Create mock objects to prevent crashes
  usbMicroscopeManager = {
    initialize: () => Promise.resolve(false),
    getConnectionStatus: () => ({ isConnected: false, isInitialized: false }),
    setOnDeviceConnected: () => {},
    setOnDeviceDisconnected: () => {},
    setOnFrameReceived: () => {},
    cleanup: () => {},
    captureImage: () => Promise.reject(new Error('Microscope not available')),
    setSettings: () => Promise.resolve()
  };
  MicroscopeUtils = {
    getDeviceInfo: () => ({ name: 'Unavailable' }),
    frameToBase64: () => 'data:image/svg+xml;base64,PHN2Zz48dGV4dD5FcnJvcjwvdGV4dD48L3N2Zz4='
  };
}

const { width, height } = Dimensions.get('window');

export default function MicroscopeView({ 
  isConnected, 
  onImageCaptured, 
  onConnectionChange,
  onSettingsChange 
}) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [brightness, setBrightness] = useState(50);
  const [contrast, setContrast] = useState(50);
  const [focus, setFocus] = useState(50);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [hasPermission, setHasPermission] = useState(null);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [useRealCamera, setUseRealCamera] = useState(false);
  const [currentCameraType, setCurrentCameraType] = useState(CameraType.back);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const streamAnim = useRef(new Animated.Value(0)).current;
  const captureAnim = useRef(new Animated.Value(1)).current;
  const cameraRef = useRef(null);

  useEffect(() => {
    initializeMicroscope();
    checkCameraPermissions();
    return () => {
      cleanupMicroscope();
    };
  }, []);

  useEffect(() => {
    if (isConnected) {
      startPulseAnimation();
      startStreamAnimation();
    } else {
      stopAnimations();
    }
  }, [isConnected]);

  const checkCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    
    if (status === 'granted') {
      await enumerateCameraDevices();
    }
  };

  const enumerateCameraDevices = async () => {
    try {
      // Try to get all available camera devices
      const devices = await Camera.getAvailableCameraTypesAsync();
      console.log('📹 Available camera devices:', devices);
      
      // Force real camera mode since user confirmed USB microscope is connected
      console.log('🔬 USB microscope connected - enabling REAL camera feed');
      setUseRealCamera(true);
      
      // Check all available camera types
      const availableTypes = [];
      if (devices.includes(CameraType.external) || devices.includes('external')) {
        console.log('✅ EXTERNAL USB CAMERA CONFIRMED');
        availableTypes.push('external');
        setCurrentCameraType(CameraType.external);
      }
      if (devices.includes(CameraType.back) || devices.includes('back')) {
        availableTypes.push('back');
      }
      if (devices.includes(CameraType.front) || devices.includes('front')) {
        availableTypes.push('front');  
      }
      
      // If we have more than 2 cameras, assume additional ones might be USB
      if (devices.length > 2) {
        console.log('🔍 Additional cameras detected beyond front/back:', devices.length);
        availableTypes.push('external');
        // Try external camera first for USB microscope
        setCurrentCameraType(CameraType.external);
      }
      
      setAvailableDevices(availableTypes.length > 0 ? availableTypes : ['back', 'front', 'external']);
      
      console.log('🔬 Available camera types for USB microscope:', availableTypes);
      
    } catch (error) {
      console.log('❌ Error enumerating cameras, using fallback modes:', error);
      // Force real camera mode anyway since user confirmed hardware is connected
      setUseRealCamera(true);
      setAvailableDevices(['external', 'back', 'front']);  
      // Start with external for USB microscope
      setCurrentCameraType(CameraType.external);
    }
  };

  const initializeMicroscope = async () => {
    try {
      console.log('🔬 Initializing USB microscope manager...');
      
      if (!usbMicroscopeManager) {
        console.log('❌ USB microscope manager not available');
        return;
      }

      // Set up event listeners safely
      if (usbMicroscopeManager.setOnDeviceConnected) {
        usbMicroscopeManager.setOnDeviceConnected(handleDeviceConnected);
      }
      if (usbMicroscopeManager.setOnDeviceDisconnected) {
        usbMicroscopeManager.setOnDeviceDisconnected(handleDeviceDisconnected);
      }
      if (usbMicroscopeManager.setOnFrameReceived) {
        usbMicroscopeManager.setOnFrameReceived(handleFrameReceived);
      }

      // Initialize the microscope manager
      const initialized = await usbMicroscopeManager.initialize();
      
      if (initialized) {
        console.log('✅ USB microscope initialized successfully');
      } else {
        console.log('⚠️ USB microscope initialization failed, using fallback mode');
      }
    } catch (error) {
      console.error('❌ Error initializing microscope:', error);
      // Don't throw error, just log it to prevent app crash
    }
  };

  const cleanupMicroscope = () => {
    try {
      if (usbMicroscopeManager && usbMicroscopeManager.cleanup) {
        usbMicroscopeManager.cleanup();
        console.log('✅ USB microscope cleaned up');
      }
    } catch (error) {
      console.log('⚠️ Error during microscope cleanup:', error.message);
    }
  };

  const handleDeviceConnected = (device) => {
    try {
      console.log('Device connected:', device);
      if (MicroscopeUtils && MicroscopeUtils.getDeviceInfo) {
        setDeviceInfo(MicroscopeUtils.getDeviceInfo(device));
      }
      setConnectionStatus('connected');
      setIsStreaming(true);
      
      if (onConnectionChange) {
        onConnectionChange(true, device);
      }
    } catch (error) {
      console.log('⚠️ Error handling device connection:', error.message);
    }
  };

  const handleDeviceDisconnected = () => {
    console.log('Device disconnected');
    setDeviceInfo(null);
    setConnectionStatus('disconnected');
    setIsStreaming(false);
    setCurrentFrame(null);
    
    if (onConnectionChange) {
      onConnectionChange(false, null);
    }
  };

  const handleFrameReceived = (frameData) => {
    try {
      // Convert frame data to displayable format
      if (MicroscopeUtils && MicroscopeUtils.frameToBase64) {
        const imageUri = MicroscopeUtils.frameToBase64(frameData);
        setCurrentFrame(imageUri);
        setIsStreaming(true);
      }
    } catch (error) {
      console.log('⚠️ Error handling frame data:', error.message);
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

  const startStreamAnimation = () => {
    Animated.loop(
      Animated.timing(streamAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  };

  const stopAnimations = () => {
    pulseAnim.stopAnimation();
    streamAnim.stopAnimation();
  };

  const handleZoomIn = async () => {
    if (zoomLevel < 5) {
      const newZoom = zoomLevel + 0.5;
      setZoomLevel(newZoom);
      await updateMicroscopeSettings({ zoom: newZoom });
    }
  };

  const handleZoomOut = async () => {
    if (zoomLevel > 0.5) {
      const newZoom = zoomLevel - 0.5;
      setZoomLevel(newZoom);
      await updateMicroscopeSettings({ zoom: newZoom });
    }
  };

  const handleBrightnessChange = async (newBrightness) => {
    setBrightness(newBrightness);
    await updateMicroscopeSettings({ brightness: newBrightness });
  };

  const handleContrastChange = async (newContrast) => {
    setContrast(newContrast);
    await updateMicroscopeSettings({ contrast: newContrast });
  };

  const handleFocusChange = async (newFocus) => {
    setFocus(newFocus);
    await updateMicroscopeSettings({ focus: newFocus });
  };

  const updateMicroscopeSettings = async (settings) => {
    try {
      await usbMicroscopeManager.setSettings(settings);
      if (onSettingsChange) {
        onSettingsChange(settings);
      }
    } catch (error) {
      console.error('Error updating microscope settings:', error);
    }
  };

  const captureImage = async () => {
    if (!isConnected || isCapturing) return;

    setIsCapturing(true);
    
    // Capture animation
    Animated.sequence([
      Animated.timing(captureAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(captureAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      let imageData;
      
      if (useRealCamera && cameraRef.current) {
        // Try to capture from real camera
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
          base64: true,
        });
        imageData = `data:image/jpeg;base64,${photo.base64}`;
      } else {
        // Use simulated capture
        imageData = await usbMicroscopeManager.captureImage();
      }
      
      if (onImageCaptured) {
        onImageCaptured(imageData);
      }
      
      Alert.alert('Success', 'Image captured successfully!');
    } catch (error) {
      console.error('Error capturing image:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const connectMicroscope = async () => {
    try {
      const status = usbMicroscopeManager.getConnectionStatus();
      if (!status.isConnected) {
        Alert.alert(
          'Connect Microscope',
          'Please ensure your USB microscope is connected via OTG cable and try again.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Retry', 
              onPress: () => usbMicroscopeManager.startDeviceDiscovery() 
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error connecting microscope:', error);
    }
  };

  const renderRealCamera = () => {
    console.log('🔬 renderRealCamera called - hasPermission:', hasPermission);
    console.log('🔬 availableDevices:', availableDevices);
    
    if (!hasPermission) {
      console.log('❌ No camera permission - showing permission request');
      return (
        <View style={styles.noStreamContainer}>
          <Text style={styles.noStreamText}>Camera permission required for USB microscope</Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={checkCameraPermissions}
          >
            <Text style={styles.permissionButtonText}>Grant Camera Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Try different camera types for USB microscope
    const cameraTypes = [CameraType.external, CameraType.back, CameraType.front];

    try {
      console.log('✅ Rendering USB microscope camera with type:', currentCameraType);
      return (
        <View style={styles.cameraContainer}>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            type={currentCameraType}
            ratio="16:9"
            zoom={zoomLevel}
            onCameraReady={() => {
              console.log('📹 USB Microscope camera ready with type:', currentCameraType);
            }}
            onMountError={(error) => {
              console.log('❌ Camera mount error with type:', currentCameraType, 'Error:', error);
              
              // Try next available camera type automatically
              const availableTypes = [CameraType.external, CameraType.back, CameraType.front];
              const currentIndex = availableTypes.findIndex(type => type === currentCameraType);
              const nextIndex = (currentIndex + 1) % availableTypes.length;
              const nextType = availableTypes[nextIndex];
              
              console.log('🔄 Auto-switching from', currentCameraType, 'to', nextType);
              setCurrentCameraType(nextType);
              
              // Show a brief message to user about the switch
              setTimeout(() => {
                console.log('✅ Switched to camera type:', nextType);
              }, 1000);
            }}
          >
            <View style={styles.cameraOverlay}>
              <Text style={styles.cameraText}>● USB MICROSCOPE LIVE</Text>
              <Text style={styles.cameraSubText}>
                {currentCameraType === CameraType.external ? 'USB MICROSCOPE CAMERA' : 
                 currentCameraType === CameraType.back ? 'FALLBACK: BACK CAMERA' :
                 'FALLBACK: FRONT CAMERA'}
              </Text>
              <Text style={styles.cameraStatusText}>
                {currentCameraType === CameraType.external ? '✅ CONNECTED' : '⚠️ FALLBACK MODE'}
              </Text>
            </View>
          </Camera>
          
          {/* Camera type switcher */}
          <View style={styles.cameraTypeButtons}>
            <TouchableOpacity 
              style={[
                styles.cameraTypeButton,
                currentCameraType === CameraType.external && styles.cameraTypeButtonActive
              ]}
              onPress={() => {
                console.log('🔄 Manual switch to USB microscope camera');
                setCurrentCameraType(CameraType.external);
              }}
            >
              <Text style={styles.cameraTypeButtonText}>🔬 USB</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.cameraTypeButton,
                currentCameraType === CameraType.back && styles.cameraTypeButtonActive
              ]}
              onPress={() => {
                console.log('🔄 Manual switch to back camera fallback');
                setCurrentCameraType(CameraType.back);
              }}
            >
              <Text style={styles.cameraTypeButtonText}>📱 Back</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.cameraTypeButton,
                currentCameraType === CameraType.front && styles.cameraTypeButtonActive
              ]}
              onPress={() => {
                console.log('🔄 Manual switch to front camera fallback');
                setCurrentCameraType(CameraType.front);
              }}
            >
              <Text style={styles.cameraTypeButtonText}>🤳 Front</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    } catch (error) {
      console.log('❌ Error rendering camera:', error);
      return (
        <View style={styles.noStreamContainer}>
          <Text style={styles.noStreamText}>USB Microscope Camera Error</Text>
          <Text style={styles.errorText}>{error.message}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              console.log('🔄 Retrying camera initialization');
              checkCameraPermissions();
            }}
          >
            <Text style={styles.retryButtonText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  const renderLiveStream = () => {
    // ALWAYS use real camera for USB microscope (no simulations)
    console.log('🔬 Rendering USB microscope stream - Camera permission:', hasPermission);
    
    if (hasPermission === true) {
      console.log('✅ Camera permission granted - showing USB microscope camera');
      return renderRealCamera();
    }
    
    if (hasPermission === false) {
      console.log('❌ Camera permission denied');
      return (
        <View style={styles.noStreamContainer}>
          <Text style={styles.noStreamText}>Camera Permission Required</Text>
          <Text style={styles.subText}>Enable camera access for USB microscope</Text>
          <TouchableOpacity 
            style={styles.connectButton}
            onPress={checkCameraPermissions}
          >
            <Text style={styles.connectButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (hasPermission === null) {
      console.log('⏳ Camera permission check in progress');
      return (
        <View style={styles.noStreamContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.noStreamText}>Checking camera permissions...</Text>
        </View>
      );
    }

    // If we have a current frame, show the stream regardless of connection status
    if (currentFrame && isStreaming) {
      return (
        <Animated.View style={[styles.streamContainer, { opacity: streamAnim }]}>
          <Image 
            source={{ uri: currentFrame }} 
            style={styles.streamImage}
            resizeMode="contain"
          />
          <View style={styles.streamOverlay}>
            <Text style={styles.streamText}>LIVE</Text>
          </View>
          <View style={styles.streamInfo}>
            <Text style={styles.streamInfoText}>Zoom: {zoomLevel.toFixed(1)}x</Text>
            <Text style={styles.streamInfoText}>Brightness: {brightness}%</Text>
          </View>
        </Animated.View>
      );
    }

    // If connected but no stream yet
    if (isConnected && !isStreaming) {
      return (
        <View style={styles.noStreamContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.noStreamText}>
            Initializing microscope stream...
          </Text>
        </View>
      );
    }

    // If not connected
    if (!isConnected) {
      return (
        <View style={styles.noStreamContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.noStreamText}>
            Waiting for microscope connection...
          </Text>
        </View>
      );
    }

    // Fallback
    return (
      <View style={styles.noStreamContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.noStreamText}>
          Initializing microscope...
        </Text>
      </View>
    );
  };

  const renderDeviceInfo = () => {
    if (!deviceInfo) return null;

    return (
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{deviceInfo.name}</Text>
        <Text style={styles.deviceDetails}>
          {deviceInfo.manufacturer} • {deviceInfo.serialNumber}
        </Text>
      </View>
    );
  };

  const renderControls = () => {
    if (!isConnected) return null;

    return (
      <View style={styles.controls}>
        <View style={styles.zoomControl}>
          <TouchableOpacity onPress={handleZoomOut} style={styles.controlButton}>
            <Icon name="zoom-out" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.zoomText}>{zoomLevel.toFixed(1)}x</Text>
          <TouchableOpacity onPress={handleZoomIn} style={styles.controlButton}>
            <Icon name="zoom-in" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.settingsRow}>
          <View style={styles.settingItem}>
            <Icon name="brightness-6" size={20} color={colors.textSecondary} />
            <Text style={styles.settingLabel}>Brightness</Text>
            <TouchableOpacity 
              style={styles.settingButton}
              onPress={() => handleBrightnessChange(Math.max(0, brightness - 10))}
            >
              <Icon name="remove" size={16} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.settingValue}>{brightness}%</Text>
            <TouchableOpacity 
              style={styles.settingButton}
              onPress={() => handleBrightnessChange(Math.min(100, brightness + 10))}
            >
              <Icon name="add" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.settingItem}>
            <Icon name="contrast" size={20} color={colors.textSecondary} />
            <Text style={styles.settingLabel}>Contrast</Text>
            <TouchableOpacity 
              style={styles.settingButton}
              onPress={() => handleContrastChange(Math.max(0, contrast - 10))}
            >
              <Icon name="remove" size={16} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.settingValue}>{contrast}%</Text>
            <TouchableOpacity 
              style={styles.settingButton}
              onPress={() => handleContrastChange(Math.min(100, contrast + 10))}
            >
              <Icon name="add" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
          onPress={captureImage}
          disabled={isCapturing}
        >
          <Animated.View style={{ transform: [{ scale: captureAnim }] }}>
            <Icon name="camera" size={32} color="#FFFFFF" />
          </Animated.View>
          <Text style={styles.captureText}>
            {isCapturing ? 'Capturing...' : 'Capture Image'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  console.log('🔬 MicroscopeView rendering - hasPermission:', hasPermission, 'isConnected:', isConnected);
  
  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.viewfinder,
          { transform: [{ scale: pulseAnim }] }
        ]}
      >
        {renderLiveStream()}
      </Animated.View>

      {renderDeviceInfo()}
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
  },
  noStreamText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 10,
    opacity: 0.7,
  },
  streamContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  streamImage: {
    width: '100%',
    height: '100%',
  },
  streamOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  streamText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  disconnectedView: {
    alignItems: 'center',
    padding: 20,
  },
  disconnectedText: {
    color: colors.textSecondary,
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructionText: {
    color: colors.textSecondary,
    fontSize: 12,
    opacity: 0.7,
    marginTop: 5,
    textAlign: 'center',
  },
  connectButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 15,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deviceInfo: {
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  deviceDetails: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
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
  settingsRow: {
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  settingLabel: {
    marginLeft: 10,
    color: colors.textSecondary,
    flex: 1,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginHorizontal: 10,
    minWidth: 40,
    textAlign: 'center',
  },
  settingButton: {
    padding: 5,
    backgroundColor: colors.background,
    borderRadius: 15,
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
  streamInfo: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 5,
    borderRadius: 5,
  },
  streamInfoText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  cameraText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cameraSubText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 5,
  },
  cameraStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 3,
    fontWeight: 'bold',
  },
  cameraContainer: {
    width: '100%',
    height: '100%',
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
  cameraTypeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cameraTypeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: '#FFFFFF',
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
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 15,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  subText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
});