import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  TouchableOpacity,
  Share,
  Alert,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Button, Chip, ProgressBar, FAB } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useApp } from '../store/appContext';
import { historyAPI } from '../api/history';
import { colors } from '../styles/theme';
import ResultDisplay from '../components/analysis/ResultDisplay';
import CertificateView from '../components/analysis/CertificateView';
import * as SecureStore from 'expo-secure-store';
import client from '../api/client';

// React Native compatible base64 encoder
const toBase64 = (str) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  
  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : 0;
    const c = i < str.length ? str.charCodeAt(i++) : 0;
    
    const packed = (a << 16) | (b << 8) | c;
    
    result += chars.charAt((packed >> 18) & 63);
    result += chars.charAt((packed >> 12) & 63);
    result += chars.charAt((packed >> 6) & 63);
    result += chars.charAt(packed & 63);
  }
  
  const paddingLength = (3 - ((str.length) % 3)) % 3;
  return result.slice(0, result.length - paddingLength) + '='.repeat(paddingLength);
};

const { width, height } = Dimensions.get('window');

export default function ResultScreen({ route, navigation }) {
  const { currentAnalysis } = useApp();
  const [analysis, setAnalysis] = useState(currentAnalysis);
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCertificate, setShowCertificate] = useState(false);
  const [generatingCert, setGeneratingCert] = useState(false);
  const [certificateData, setCertificateData] = useState(null);
  const insets = useSafeAreaInsets();
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const headerSlide = useRef(new Animated.Value(-50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    async function fetchAnalysisIfNeeded() {
      const analysisId = route?.params?.analysisId;
      if (!analysisId) {
        setAnalysis(currentAnalysis);
        return;
      }
      // If currentAnalysis matches, use it
      if (currentAnalysis && (currentAnalysis.analysis_id === analysisId || currentAnalysis.id === analysisId)) {
        setAnalysis(currentAnalysis);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Try to fetch the analysis by ID from backend
        const response = await historyAPI.getUserAnalyses({ id: analysisId });
        // Some APIs return an array, some a single object
        let found = null;
        if (Array.isArray(response.analyses)) {
          found = response.analyses.find(a => a.id == analysisId || a.analysis_id == analysisId);
        } else if (response.analysis) {
          found = response.analysis;
        } else if (response.id == analysisId || response.analysis_id == analysisId) {
          found = response;
        }
        if (found) {
          setAnalysis(found);
        } else {
          setError('Analysis not found.');
        }
      } catch (err) {
        setError('Failed to load analysis.');
      } finally {
        setLoading(false);
      }
    }
    fetchAnalysisIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.analysisId, currentAnalysis]);

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

      // Scale animation for result header
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Rotate animation for result icon
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();

      // Pulse animation for confidence
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startAnimations();
  }, [fadeAnim, headerSlide, slideAnim, scaleAnim, rotateAnim, pulseAnim]);

  const generateCertificate = useCallback(async () => {
    const normalizedAnalysis = normalizeAnalysisData(analysis);
    if (!normalizedAnalysis?.analysis_id) return;

    setGeneratingCert(true);
    try {
      const result = await historyAPI.generateCertificate(normalizedAnalysis.analysis_id);
      setCertificateData(result);
      setShowCertificate(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate certificate. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setGeneratingCert(false);
    }
  }, [analysis, normalizeAnalysisData]);

  const shareCertificate = useCallback(async () => {
    if (!certificateData) return;
    const normalizedAnalysis = normalizeAnalysisData(analysis);

    try {
      await Share.share({
        message: `Gemstone Authentication Certificate\n\nType: ${normalizedAnalysis.results.predicted_class}\nConfidence: ${(normalizedAnalysis.results.confidence * 100).toFixed(1)}%\n\nCertificate ID: ${certificateData.certificate_id}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, [certificateData, analysis, normalizeAnalysisData]);

  // Helper function to normalize analysis data structure
  const normalizeAnalysisData = useCallback((analysis) => {
    if (!analysis) return null;
    
    // If analysis has results property (from direct analysis), use it
    if (analysis.results) {
      return {
        ...analysis,
        analysis_id: analysis.analysis_id || analysis.id,
        results: analysis.results
      };
    }
    
    // If analysis has analysis_data (from history), extract results
    if (analysis.analysis_data) {
      return {
        ...analysis,
        analysis_id: analysis.id,
        results: analysis.analysis_data
      };
    }
    
    // Fallback to original structure
    return {
      ...analysis,
      analysis_id: analysis.analysis_id || analysis.id,
      results: analysis
    };
  }, []);

  const downloadCertificate = useCallback(async () => {
    const normalizedAnalysis = normalizeAnalysisData(analysis);
    if (!normalizedAnalysis?.analysis_id) {
      console.error('No analysis ID found:', normalizedAnalysis);
      Alert.alert('Error', 'No analysis ID found. Please try again.');
      return;
    }

    // Check if certificate has been generated (either in current session or previously)
    const hasCertificateInSession = !!certificateData;
    const hasCertificateInDatabase = !!analysis?.certificate_path;
    
    if (!hasCertificateInSession && !hasCertificateInDatabase) {
      Alert.alert(
        'Certificate Not Generated', 
        'Please generate a certificate first before downloading.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Generate Certificate', onPress: generateCertificate }
        ]
      );
      return;
    }

    let timeoutId;
    let didTimeout = false;
    
    // Ensure loading state is properly managed
    if (downloadLoading) {
      console.log('Download already in progress, returning...');
      return;
    }
    try {
      setDownloadLoading(true);
      // Timeout after 30 seconds for iOS (longer timeout)
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          didTimeout = true;
          reject(new Error('Download timed out. Please check your connection and try again.'));
        }, Platform.OS === 'ios' ? 30000 : 20000);
      });

      // Get the download URL
      const downloadUrl = `${client.defaults.baseURL}/certificate/download/${normalizedAnalysis.analysis_id}`;
      console.log('Download URL:', downloadUrl);
      console.log('Certificate in session:', hasCertificateInSession);
      console.log('Certificate in database:', hasCertificateInDatabase);
      console.log('Certificate path:', analysis?.certificate_path);
      
      // Get auth token
      const token = await SecureStore.getItemAsync('access_token');
      console.log('Auth token available:', !!token);
      
      // Create filename with proper path handling for iOS
      const filename = `gemstone_certificate_${normalizedAnalysis.analysis_id}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      console.log('File URI:', fileUri);
      console.log('Platform:', Platform.OS);
      
      // For iOS, use a different approach to handle potential issues
      if (Platform.OS === 'ios') {
        // iOS: Use FileSystem.downloadAsync with additional error handling
        console.log('iOS: Using FileSystem.downloadAsync with enhanced error handling...');
        
        try {
          const downloadPromise = FileSystem.downloadAsync(
            downloadUrl,
            fileUri,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
              // Add additional options for iOS
              md5: false,
              cache: false,
            }
          );
          
          const downloadResult = await Promise.race([downloadPromise, timeoutPromise]);
          clearTimeout(timeoutId);
          
          console.log('iOS Download result:', downloadResult);
          
          if (downloadResult.status !== 200) {
            throw new Error(`Download failed with status: ${downloadResult.status}`);
          }
        } catch (iosError) {
          console.log('iOS primary download method failed, trying fallback...', iosError);
          
          try {
            // Fallback: Try using fetch API
            console.log('iOS: Attempting fetch fallback...');
            const response = await fetch(downloadUrl, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            
            console.log('iOS: Fetch response status:', response.status);
            console.log('iOS: Fetch response ok:', response.ok);
            
            if (!response.ok) {
              throw new Error(`Download failed with status: ${response.status}`);
            }
            
            console.log('iOS: Converting response to blob...');
            const blob = await response.blob();
            console.log('iOS: Blob size:', blob.size);
            
            console.log('iOS: Converting blob to array buffer...');
            const arrayBuffer = await blob.arrayBuffer();
            console.log('iOS: Array buffer size:', arrayBuffer.byteLength);
            
            console.log('iOS: Converting to base64...');
            const base64 = toBase64(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            console.log('iOS: Base64 length:', base64.length);
            
            console.log('iOS: Writing file...');
            await FileSystem.writeAsStringAsync(fileUri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            console.log('iOS: Fallback download method successful');
          } catch (fallbackError) {
            console.error('iOS: Fallback method also failed:', fallbackError);
            throw fallbackError;
          }
        }
      } else {
        // Android: Use the original FileSystem.downloadAsync approach
        console.log('Android: Using FileSystem.downloadAsync...');
        const downloadPromise = FileSystem.downloadAsync(
          downloadUrl,
          fileUri,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );
        const downloadResult = await Promise.race([downloadPromise, timeoutPromise]);
        clearTimeout(timeoutId);
        
        console.log('Download result:', downloadResult);
        
        if (downloadResult.status !== 200) {
          throw new Error(`Download failed with status: ${downloadResult.status}`);
        }
      }
      
      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      console.log('File info:', fileInfo);
      
      if (fileInfo.exists) {
        console.log('File exists, size:', fileInfo.size);
        
        // For iOS, show a success message first to confirm download worked
        if (Platform.OS === 'ios') {
          Alert.alert(
            'Download Successful', 
            'Certificate downloaded successfully! Opening share dialog...',
            [{ text: 'OK', onPress: async () => {
              try {
                // Share the file
                const isAvailable = await Sharing.isAvailableAsync();
                console.log('Sharing available:', isAvailable);
                
                if (isAvailable) {
                  await Sharing.shareAsync(fileUri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Save Gemstone Certificate',
                  });
                } else {
                  Alert.alert('Success', 'Certificate saved to device! You can find it in your Files app.');
                }
                
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (shareError) {
                console.error('Sharing error:', shareError);
                Alert.alert('Success', 'Certificate saved to device! You can find it in your Files app.');
              }
            }}]
          );
        } else {
          // Android: Use the original approach
          const isAvailable = await Sharing.isAvailableAsync();
          console.log('Sharing available:', isAvailable);
          
          if (isAvailable) {
            try {
              await Sharing.shareAsync(fileUri, {
                mimeType: 'application/pdf',
                dialogTitle: 'Save Gemstone Certificate',
              });
            } catch (shareError) {
              console.error('Sharing error:', shareError);
              Alert.alert('Success', 'Certificate saved to device! You can find it in your Files app.');
            }
          } else {
            Alert.alert('Success', 'Certificate saved to device! You can find it in your Files app.');
          }
          
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        throw new Error('File was not saved properly');
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Download error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Platform:', Platform.OS);
      console.error('Loading state before error:', loading);
      
      if (didTimeout) {
        Alert.alert('Timeout', 'Download timed out. Please check your connection and try again.');
        setDownloadLoading(false);
        return;
      }
      
      if (error.message.includes('404') || error.message.includes('not found')) {
        Alert.alert('Certificate Not Found', 'Please generate a certificate first before downloading.');
      } else {
        Alert.alert('Error', error.message || 'Failed to download certificate. Please try again.');
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      console.log('Setting download loading to false in finally block');
      setDownloadLoading(false);
    }
  }, [analysis, normalizeAnalysisData, certificateData, generateCertificate]);

  const getResultColor = useCallback((resultType) => {
    switch (resultType) {
      case 'Natural':
        return colors.natural;
      case 'Synthetic':
        return colors.synthetic;
      case 'Undefined':
        return colors.undefined;
      default:
        return colors.undefined;
    }
  }, []);

  const getResultIcon = useCallback((resultType) => {
    switch (resultType) {
      case 'Natural':
        return 'nature';
      case 'Synthetic':
        return 'science';
      case 'Undefined':
        return 'help';
      default:
        return 'help';
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.errorContainer}>
        <LinearGradient
          colors={[colors.primary + '20', colors.primary + '10']}
          style={styles.errorGradient}
        >
          <Icon name="hourglass-empty" size={80} color={colors.primary} />
          <Text style={styles.errorTitle}>Loading...</Text>
        </LinearGradient>
      </View>
    );
  }
  
  const normalizedAnalysis = normalizeAnalysisData(analysis);
  
  if (!normalizedAnalysis || error || !normalizedAnalysis.results) {
    return (
      <View style={styles.errorContainer}>
        <LinearGradient
          colors={[colors.primary + '20', colors.primary + '10']}
          style={styles.errorGradient}
        >
          <Icon name="error" size={80} color={colors.primary} />
          <Text style={styles.errorTitle}>{error || 'No Analysis Results'}</Text>
          <Text style={styles.errorText}>No analysis results available for this record.</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Go Back</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  const { results } = normalizedAnalysis;
  const resultColor = getResultColor(results.predicted_class);
  const resultIcon = getResultIcon(results.predicted_class);

  const renderResultHeader = () => (
    <Animated.View
      style={[
        styles.resultHeader,
        {
          opacity: fadeAnim,
          transform: [{ translateY: headerSlide }, { scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={[resultColor, resultColor + '80', resultColor + '60']}
        style={styles.resultGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.resultContent}>
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [{
                  rotate: rotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg']
                  })
                }]
              }
            ]}
          >
            <Icon name={resultIcon} size={60} color="#FFFFFF" />
          </Animated.View>
          
          <View style={styles.resultInfo}>
            <Text style={styles.resultType}>{results.predicted_class}</Text>
            <Text style={styles.resultSubtitle}>Gemstone Classification</Text>
          </View>
          
          <Animated.View
            style={[
              styles.confidenceContainer,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Text style={styles.confidenceLabel}>Confidence</Text>
            <Text style={styles.confidenceValue}>
              {(results.confidence * 100).toFixed(1)}%
            </Text>
            <Chip 
              style={[styles.confidenceChip, { backgroundColor: results.confidence_analysis.color }]}
              textStyle={styles.confidenceChipText}
            >
              {results.confidence_analysis.level}
            </Chip>
          </Animated.View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderAnalysisDetails = () => (
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
          colors={[colors.primary + '10', colors.primary + '05']}
          style={styles.cardGradient}
        >
          <Card.Content style={styles.cardContent}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <Icon name="analytics" size={24} color={colors.primary} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.sectionTitle}>Analysis Details</Text>
                <Text style={styles.sectionSubtitle}>
                  Detailed breakdown of the analysis
                </Text>
              </View>
            </View>
            <ResultDisplay results={results} />
          </Card.Content>
        </LinearGradient>
      </Card>
    </Animated.View>
  );

  const renderProbabilityBreakdown = () => (
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
          colors={[colors.secondary + '10', colors.secondary + '05']}
          style={styles.cardGradient}
        >
          <Card.Content style={styles.cardContent}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <Icon name="pie-chart" size={24} color={colors.secondary} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.sectionTitle}>Probability Breakdown</Text>
                <Text style={styles.sectionSubtitle}>
                  AI confidence for each classification
                </Text>
              </View>
            </View>
            
            {Object.entries(results.probabilities).map(([type, prob], index) => (
              <Animated.View 
                key={type} 
                style={[
                  styles.probabilityItem,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <View style={styles.probabilityHeader}>
                  <View style={styles.probabilityLabelContainer}>
                    <View style={[styles.probabilityDot, { backgroundColor: getResultColor(type) }]} />
                    <Text style={styles.probabilityLabel}>{type}</Text>
                  </View>
                  <Text style={styles.probabilityValue}>{(prob * 100).toFixed(1)}%</Text>
                </View>
                <ProgressBar
                  progress={prob}
                  color={getResultColor(type)}
                  style={styles.probabilityBar}
                />
              </Animated.View>
            ))}
          </Card.Content>
        </LinearGradient>
      </Card>
    </Animated.View>
  );

  const renderRecommendation = () => (
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
          colors={[colors.warning + '10', colors.warning + '05']}
          style={styles.cardGradient}
        >
          <Card.Content style={styles.cardContent}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <Icon name="lightbulb" size={24} color={colors.warning} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.sectionTitle}>Recommendation</Text>
                <Text style={styles.sectionSubtitle}>
                  Expert advice based on results
                </Text>
              </View>
            </View>
            <Text style={styles.recommendationText}>
              {results.confidence_analysis.recommendation}
            </Text>
          </Card.Content>
        </LinearGradient>
      </Card>
    </Animated.View>
  );

  const renderActions = () => {
    const hasCertificateInSession = !!certificateData;
    const hasCertificateInDatabase = !!analysis?.certificate_path;
    const hasCertificate = hasCertificateInSession || hasCertificateInDatabase;

    return (
      <Animated.View
        style={[
          styles.actionsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {!hasCertificate ? (
          // Show Generate Certificate button if no certificate exists
          <TouchableOpacity
            style={styles.generateButton}
            onPress={generateCertificate}
            disabled={generatingCert}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.buttonGradient}
            >
              {generatingCert ? (
                <LottieView
                  source={require('../assets/animations/loading.json')}
                  autoPlay
                  loop
                  style={styles.loadingAnimation}
                />
              ) : (
                <Icon name="verified" size={24} color="#FFFFFF" />
              )}
              <Text style={styles.buttonText}>
                {generatingCert ? 'Generating...' : 'Generate Certificate'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          // Show Download Certificate button if certificate exists
          <TouchableOpacity
            style={styles.generateButton}
            onPress={downloadCertificate}
            disabled={downloadLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.success, '#4CAF50']}
              style={styles.buttonGradient}
            >
              {downloadLoading ? (
                <LottieView
                  source={require('../assets/animations/loading.json')}
                  autoPlay
                  loop
                  style={styles.loadingAnimation}
                />
              ) : (
                <Icon name="download" size={24} color="#FFFFFF" />
              )}
              <Text style={styles.buttonText}>
                {downloadLoading ? 'Downloading...' : 'Download Certificate'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            });
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.secondary, '#1976d2']}
            style={styles.buttonGradient}
          >
            <Icon name="home" size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>Back to Home</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={resultColor} />
      
      {/* Header Section */}
      {renderResultHeader()}

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === 'ios' ? insets.bottom + 120 : insets.bottom + 130 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {renderAnalysisDetails()}
        {renderProbabilityBreakdown()}
        {renderRecommendation()}
        {renderActions()}
      </ScrollView>

      {/* FAB for sharing */}
      <FAB
        icon="share"
        style={[styles.fab, { bottom: Platform.OS === 'ios' ? insets.bottom + 80 : insets.bottom + 80 }]}
        onPress={shareCertificate}
        disabled={!certificateData && !analysis?.certificate_path}
      />

      {/* Certificate Modal */}
      {showCertificate && certificateData && (
        <CertificateView
          visible={showCertificate}
          onDismiss={() => setShowCertificate(false)}
          certificateData={certificateData}
          analysisData={normalizedAnalysis}
          onDownload={downloadCertificate}
          onShare={shareCertificate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorGradient: {
    padding: 40,
    borderRadius: 25,
    alignItems: 'center',
    width: width - 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  errorButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  resultHeader: {
    marginBottom: 0,
  },
  resultGradient: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 20,
  },
  resultType: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  confidenceContainer: {
    alignItems: 'center',
  },
  confidenceLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  confidenceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  confidenceChip: {
    height: 24,
  },
  confidenceChipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
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
  headerText: {
    flex: 1,
    marginLeft: 15,
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
  probabilityItem: {
    marginBottom: 20,
  },
  probabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  probabilityLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  probabilityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  probabilityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  probabilityValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  probabilityBar: {
    height: 10,
    borderRadius: 5,
  },
  recommendationText: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  actionsContainer: {
    marginTop: 20,
  },
  generateButton: {
    borderRadius: 30,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 5,
  },
  homeButton: {
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 3,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 30,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  loadingAnimation: {
    width: 24,
    height: 24,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    backgroundColor: colors.secondary,
  },
});