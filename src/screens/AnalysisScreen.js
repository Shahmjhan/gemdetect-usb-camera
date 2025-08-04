import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Alert,
  Platform,
  Dimensions,
  StatusBar,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, ProgressBar, Chip, FAB } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useApp } from '../store/appContext';
import { gemstoneAPI } from '../api/gemstone';
import { colors } from '../styles/theme';

// Load Native USB Camera with direct Android Camera2 API access
let MicroscopeView = null;
let microscopeAvailable = false;

try {
  console.log('🔬 Loading Native USB Camera Module with Camera2 API...');
  MicroscopeView = require('../components/microscope/NativeUSBCamera').default;
  microscopeAvailable = true;
  console.log('✅ Native USB Camera Module loaded - real Camera2 API access for USB microscopes');
} catch (error) {
  console.log('❌ Failed to load Native USB Camera Module:', error.message);
  console.log('🔄 Falling back to Real USB Camera...');
  try {
    MicroscopeView = require('../components/microscope/RealUSBCamera').default;
    microscopeAvailable = true;
    console.log('✅ Fallback Real USB Camera loaded');
  } catch (fallbackError) {
    console.log('❌ All USB camera modules failed:', fallbackError.message);
    microscopeAvailable = false;
  }
}

const { width, height } = Dimensions.get('window');

export default function AnalysisScreen({ navigation }) {
  const { setCurrentAnalysis, setIsAnalyzing } = useApp();
  const [selectedImage, setSelectedImage] = useState(null);
  const [isFromMicroscope, setIsFromMicroscope] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const insets = useSafeAreaInsets();
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const headerSlide = useRef(new Animated.Value(-50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const startAnimations = () => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(headerSlide, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    };

    startAnimations();

    // Pulse animation for microscope connection
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [fadeAnim, headerSlide, slideAnim, pulseAnim]);

  const connectMicroscope = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Connect Microscope',
      'Please ensure your USB microscope is connected to your device.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Connect',
          onPress: () => {
            setIsConnected(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, []);

  const captureFromMicroscope = useCallback(async () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect your microscope first.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setIsFromMicroscope(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Scale animation for image selection
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [isConnected, scaleAnim]);

  // USB Microscope Event Handlers
  const handleMicroscopeConnectionChange = useCallback((connected, device) => {
    setIsConnected(connected);
    if (connected) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('USB Microscope connected:', device);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      console.log('USB Microscope disconnected');
    }
  }, []);

  const handleMicroscopeImageCaptured = useCallback(async (imageData) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // The imageData is already in the correct format (data:image/svg+xml;base64,...)
      setSelectedImage(imageData);
      setIsFromMicroscope(true);
      
      // Scale animation for image selection
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
      
      console.log('Image captured from USB microscope');
    } catch (error) {
      console.error('Error handling microscope image:', error);
      Alert.alert('Error', 'Failed to process microscope image. Please try again.');
    }
  }, [scaleAnim]);

  const handleMicroscopeSettingsChange = useCallback((settings) => {
    console.log('Microscope settings updated:', settings);
    // You can add additional logic here to handle settings changes
  }, []);

  const pickImageFromGallery = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Check current permission status first
      const { status: currentStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
      
      let finalStatus = currentStatus;
      
      // If permission is not granted, request it
      if (currentStatus !== 'granted') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your photo gallery to select images. Please enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
        setIsFromMicroscope(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // Scale animation for image selection
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(
        'Error',
        'Failed to open gallery. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [scaleAnim]);

  const analyzeImage = useCallback(async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select or capture an image first.');
      return;
    }

    setAnalyzing(true);
    setIsAnalyzing(true);
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 0.9) {
          clearInterval(progressInterval);
          return 0.9;
        }
        return prev + 0.1;
      });
    }, 300);

    try {
      const result = await gemstoneAPI.analyzeGemstone(selectedImage, isFromMicroscope);
      
      clearInterval(progressInterval);
      setProgress(1);
      
      setTimeout(() => {
        setCurrentAnalysis(result);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.navigate('Result', { analysisId: result.analysis_id });
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      Alert.alert('Analysis Failed', error.error || 'Failed to analyze image. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setAnalyzing(false);
      setIsAnalyzing(false);
      setProgress(0);
    }
  }, [selectedImage, isFromMicroscope, setCurrentAnalysis, setIsAnalyzing, navigation]);

  const removeImage = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedImage(null);
    Animated.spring(scaleAnim, {
      toValue: 0.8,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  // Add this new function for capturing from phone camera
  const captureFromPhoneCamera = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setIsFromMicroscope(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [scaleAnim]);

  const renderMicroscopeSection = () => (
    <Animated.View
      style={[
        styles.sectionContainer,
        styles.cardSoftShadow,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Card style={[styles.card, { backgroundColor: colors.background }]}> 
        <Card.Content style={styles.cardContent}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '18' }] }>
              <Icon name="usb" size={24} color={colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.sectionTitle}>USB Digital Microscope</Text>
              <Text style={styles.sectionSubtitle}>
                Real-time analysis with USB OTG microscope
              </Text>
            </View>
            <Chip
              mode="flat"
              style={[
                styles.statusChip,
                { backgroundColor: isConnected ? colors.success + 'cc' : colors.error + 'cc' }
              ]}
              textStyle={styles.statusChipText}
            >
              {isConnected ? 'Connected' : 'Disconnected'}
            </Chip>
          </View>
          {Platform.OS === 'android' && microscopeAvailable && MicroscopeView ? (
            <MicroscopeView 
              isConnected={isConnected}
              onImageCaptured={handleMicroscopeImageCaptured}
              onConnectionChange={handleMicroscopeConnectionChange}
              onSettingsChange={handleMicroscopeSettingsChange}
            />
          ) : (
            <View style={{ marginTop: 10, alignItems: 'center', padding: 20, backgroundColor: colors.background, borderRadius: 10 }}>
              <Icon name="info" size={24} color={colors.textSecondary} style={{ marginBottom: 10 }} />
              <Text style={{ color: colors.textSecondary, marginBottom: 8, fontWeight: 'bold', fontSize: 14, textAlign: 'center' }}>
                {Platform.OS === 'ios' 
                  ? 'USB microscopes are not supported on iOS devices.'
                  : !microscopeAvailable 
                    ? 'Native USB camera module unavailable. Check build configuration.'
                    : 'USB microscope not available on this device.'
                }
              </Text>
              <TouchableOpacity style={[styles.captureButton, styles.softButton, { opacity: 0.5 }]} disabled>
                <View style={styles.buttonSimple}>
                  <Icon name="camera-alt" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>USB Microscope Not Available</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </Card.Content>
      </Card>
    </Animated.View>
  );

  const renderCameraSection = () => (
    <Animated.View
      style={[
        styles.sectionContainer,
        styles.cardSoftShadow,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Card style={[styles.card, { backgroundColor: colors.background }]}> 
        <Card.Content style={styles.cardContent}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: colors.accent + '18' }] }>
              <Icon name="camera-alt" size={24} color={colors.accent} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.sectionTitle}>Phone Camera</Text>
              <Text style={styles.sectionSubtitle}>
                Capture an image using your phone's camera
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.captureButton, styles.softButton]}
            onPress={captureFromPhoneCamera}
            activeOpacity={0.85}
          >
            <View style={styles.buttonSimple}>
              <Icon name="camera-alt" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Capture from Phone Camera</Text>
            </View>
          </TouchableOpacity>
        </Card.Content>
      </Card>
    </Animated.View>
  );

  const renderUploadSection = () => (
    <Animated.View
      style={[
        styles.sectionContainer,
        styles.cardSoftShadow,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Card style={[styles.card, { backgroundColor: colors.background }]}> 
        <Card.Content style={styles.cardContent}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: colors.secondary + '18' }] }>
              <Icon name="photo-library" size={24} color={colors.secondary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.sectionTitle}>Upload Image</Text>
              <Text style={styles.sectionSubtitle}>
                Select an image from your gallery
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.uploadButton, styles.softButton]}
            onPress={pickImageFromGallery}
            activeOpacity={0.85}
          >
            <View style={styles.buttonSimple}>
              <Icon name="image" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Choose from Gallery</Text>
            </View>
          </TouchableOpacity>
        </Card.Content>
      </Card>
    </Animated.View>
  );

  const renderImagePreview = () => (
    <Animated.View
      style={[
        styles.sectionContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <Card style={styles.card}>
        <LinearGradient
          colors={[colors.accent + '10', colors.accent + '05']}
          style={styles.cardGradient}
        >
          <Card.Content style={styles.cardContent}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <Icon name="image" size={24} color={colors.accent} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.sectionTitle}>Selected Image</Text>
                <Text style={styles.sectionSubtitle}>
                  Ready for analysis
                </Text>
              </View>
              {isFromMicroscope && (
                <Chip style={styles.sourceChip} textStyle={styles.sourceChipText}>
                  Microscope
                </Chip>
              )}
            </View>

            <View style={styles.imageContainer}>
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={removeImage}
                activeOpacity={0.8}
              >
                <Icon name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </Card.Content>
        </LinearGradient>
      </Card>
    </Animated.View>
  );

  const renderAnalysisProgress = () => (
    <Animated.View
      style={[
        styles.sectionContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Card style={styles.card}>
        <LinearGradient
          colors={[colors.primary + '15', colors.primary + '08']}
          style={styles.cardGradient}
        >
          <Card.Content style={styles.cardContent}>
            <View style={styles.progressContainer}>
              <LottieView
                source={require('../assets/animations/analyzing.json')}
                autoPlay
                loop
                style={styles.analyzingAnimation}
              />
              <Text style={styles.progressTitle}>Analyzing Gemstone</Text>
              <Text style={styles.progressSubtitle}>
                Our AI is examining your gemstone...
              </Text>
              <ProgressBar
                progress={progress}
                color={colors.primary}
                style={styles.progressBar}
              />
              <Text style={styles.progressPercentage}>{Math.round(progress * 100)}%</Text>
            </View>
          </Card.Content>
        </LinearGradient>
      </Card>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Header Section */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: headerSlide }],
          },
        ]}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark, '#1a237e']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Gemstone Analysis</Text>
              <Text style={styles.headerSubtitle}>
                Analyze your gemstones with AI precision
              </Text>
            </View>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('History')}
            >
              <Icon name="history" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === 'ios' ? insets.bottom + 120 : insets.bottom + 130 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {renderMicroscopeSection()}
        {renderCameraSection()}
        {renderUploadSection()}
        {selectedImage && renderImagePreview()}
        {analyzing && renderAnalysisProgress()}
      </ScrollView>

      {/* Analyze Button */}
      {selectedImage && !analyzing && (
        <Animated.View
          style={[
            styles.analyzeButtonContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.analyzeButton}
            onPress={analyzeImage}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.analyzeButtonGradient}
            >
              <Icon name="search" size={24} color="#FFFFFF" />
              <Text style={styles.analyzeButtonText}>Analyze Gemstone</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    marginBottom: 0,
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  card: {
    borderRadius: 20,
    elevation: 3,
  },
  cardGradient: {
    borderRadius: 20,
  },
  cardContent: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusChip: {
    height: 28,
  },
  statusChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  connectButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  captureButton: {
    borderRadius: 25,
    marginTop: 15,
    overflow: 'hidden',
  },
  uploadButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  sourceChip: {
    backgroundColor: colors.accent,
  },
  sourceChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  imageContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 280,
    borderRadius: 15,
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: colors.error,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  progressContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  analyzingAnimation: {
    width: 120,
    height: 120,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 15,
    marginBottom: 5,
  },
  progressSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 10,
    borderRadius: 5,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 15,
  },
  analyzeButtonContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 100,
    left: 20,
    right: 20,
  },
  analyzeButton: {
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 8,
  },
  analyzeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 30,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButton: {
    marginTop: 18,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  cardSoftShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  softButton: {
    marginTop: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  buttonSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
});