import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../styles/theme';

const { width, height } = Dimensions.get('window');

export default function BasicCameraView({ 
  isConnected, 
  onImageCaptured, 
  onConnectionChange,
  onSettingsChange 
}) {
  const [isCapturing, setIsCapturing] = useState(false);

  // Use ImagePicker as camera alternative until expo-camera is fixed
  const captureFromCamera = async () => {
    if (isCapturing) return;
    
    setIsCapturing(true);
    
    try {
      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to capture images.');
        return;
      }

      console.log('📸 Opening camera for USB microscope...');
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [16, 9],
        quality: 1,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const imageData = `data:image/jpeg;base64,${result.assets[0].base64}`;
        
        if (onImageCaptured) {
          onImageCaptured(imageData);
        }
        
        Alert.alert('Success', 'Image captured from camera!');
      }
    } catch (error) {
      console.error('❌ Error capturing from camera:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const captureFromGallery = async () => {
    if (isCapturing) return;
    
    setIsCapturing(true);
    
    try {
      // Request media library permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Gallery permission is required to select images.');
        return;
      }

      console.log('🖼️ Opening gallery for microscope image...');
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [16, 9],
        quality: 1,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const imageData = `data:image/jpeg;base64,${result.assets[0].base64}`;
        
        if (onImageCaptured) {
          onImageCaptured(imageData);
        }
        
        Alert.alert('Success', 'Image selected from gallery!');
      }
    } catch (error) {
      console.error('❌ Error selecting from gallery:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.viewfinder}>
        <View style={styles.microscopeContainer}>
          <Icon name="camera-alt" size={64} color={colors.primary} />
          <Text style={styles.title}>USB Digital Microscope</Text>
          <Text style={styles.subtitle}>Camera Interface</Text>
          
          <View style={styles.statusContainer}>
            <Icon name="usb" size={20} color={colors.primary} />
            <Text style={styles.statusText}>Ready for Capture</Text>
          </View>
          
          <Text style={styles.instructionText}>
            Connect your USB microscope via OTG cable, then use the camera to capture images
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.captureButton, styles.cameraButton, isCapturing && styles.captureButtonDisabled]}
            onPress={captureFromCamera}
            disabled={isCapturing}
          >
            <Icon name="camera" size={24} color="#FFFFFF" />
            <Text style={styles.captureText}>
              {isCapturing ? 'Opening...' : '📱 Camera'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.captureButton, styles.galleryButton, isCapturing && styles.captureButtonDisabled]}
            onPress={captureFromGallery}
            disabled={isCapturing}
          >
            <Icon name="photo-library" size={24} color="#FFFFFF" />
            <Text style={styles.captureText}>
              {isCapturing ? 'Opening...' : '🖼️ Gallery'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            🔬 For best results with USB microscope:
          </Text>
          <Text style={styles.infoSubText}>
            • Connect microscope via OTG cable
          </Text>
          <Text style={styles.infoSubText}>
            • Use good lighting conditions
          </Text>
          <Text style={styles.infoSubText}>
            • Hold steady when capturing
          </Text>
        </View>
      </View>
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
  microscopeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 15,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  statusText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  instructionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 15,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 10,
  },
  controls: {
    marginTop: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
    marginHorizontal: 5,
  },
  cameraButton: {
    backgroundColor: colors.primary,
  },
  galleryButton: {
    backgroundColor: colors.secondary,
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  infoContainer: {
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  infoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  infoSubText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    paddingLeft: 8,
  },
});