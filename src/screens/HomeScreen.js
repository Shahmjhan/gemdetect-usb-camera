import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Dimensions,
  StatusBar,
  Alert,
  FlatList,
} from 'react-native';
import { Card, Button, Avatar, Badge, Chip } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../store/authContext';
import { useApp } from '../store/appContext';
import { historyAPI } from '../api/history';
import { gemstoneAPI } from '../api/gemstone';
import { colors } from '../styles/theme';
import { getImageUrl } from '../api/client';
import { Animated as RNAnimated, Easing } from 'react-native';

const { width, height } = Dimensions.get('window');

const features = [
  {
    key: 'ai',
    icon: 'science',
    color: colors.primary,
    title: 'AI-Powered Gem Authentication',
    description: 'Leverage cutting-edge AI to verify gemstone authenticity with unmatched speed and accuracy. Trusted by professionals worldwide.',
  },
  {
    key: 'multi-method',
    icon: 'verified-user',
    color: colors.success,
    title: 'Multiple Authentication Methods',
    description: 'Authenticate gems using microscope images, camera photos, or uploads—flexible for every scenario in the gem trade.',
  },
  {
    key: 'history',
    icon: 'history',
    color: colors.secondary,
    title: 'Comprehensive Analysis History',
    description: 'Track, review, and manage every gem analysis you’ve performed. Your digital record book, always at your fingertips.',
  },
  {
    key: 'certificates',
    icon: 'assignment-turned-in',
    color: colors.natural,
    title: 'Instant Digital Certificates',
    description: 'Generate and share professional certificates for every authenticated gem—boosting trust and transparency.',
  },
  {
    key: 'support',
    icon: 'support-agent',
    color: colors.warning,
    title: 'Expert Support & Guidance',
    description: 'Access industry experts and helpful resources anytime. We’re here to support your gem business 24/7.',
  },
  {
    key: 'secure',
    icon: 'lock',
    color: colors.text,
    title: 'Enterprise-Grade Security',
    description: 'Your data and analyses are protected with state-of-the-art encryption and privacy controls.',
  },
];

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { statistics, setStatistics } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [modelHealth, setModelHealth] = useState(null);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const headerSlide = useRef(new Animated.Value(-50)).current;
  const cardSlide = useRef(new Animated.Value(50)).current;
  const [featureIndex, setFeatureIndex] = useState(0);
  const featureListRef = useRef(null);
  const featureScrollX = useRef(new RNAnimated.Value(0)).current;
  const [startGlow] = useState(new RNAnimated.Value(1));

  useEffect(() => {
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
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(cardSlide, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    loadData();
    checkModelHealth();

    // Auto-scroll effect for features
    const interval = setInterval(() => {
      setFeatureIndex(prev => {
        const next = (prev + 1) % features.length;
        featureListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3500);

    // Add pulsing glow effect for Start chip
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(startGlow, {
          toValue: 1.18,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        RNAnimated.timing(startGlow, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const stats = await historyAPI.getUserStatistics();
      setStatistics(stats.statistics);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkModelHealth = async () => {
    try {
      const health = await gemstoneAPI.checkModelHealth();
      setModelHealth(health);
    } catch (error) {
      console.error('Error checking model health:', error);
    }
  };

  const handleAnalyze = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Analysis');
  };

  const handleQuickStats = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('History');
  };

  const renderStatCard = (title, value, icon, color, subtitle) => (
    <Animated.View 
      style={[
        styles.statCard,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={[color, color + 'CC']}
        style={styles.statGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.statIconContainer}>
          <Icon name={icon} size={28} color="#FFFFFF" />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </LinearGradient>
    </Animated.View>
  );

  const renderFeatureCard = (title, description, icon, color, onPress) => (
    <Animated.View 
      style={[
        styles.featureCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: cardSlide }],
        },
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <LinearGradient
          colors={[color + '20', color + '10']}
          style={styles.featureGradient}
        >
          <View style={styles.featureIconContainer}>
            <Icon name={icon} size={32} color={color} />
          </View>
          <Text style={styles.featureTitle}>{title}</Text>
          <Text style={styles.featureDescription}>{description}</Text>
          <Icon name="arrow-forward" size={20} color={color} style={styles.featureArrow} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadData} />
        }
      >
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
              <View style={styles.userInfo}>
                <Text style={styles.greeting}>Welcome back,</Text>
                <Text style={styles.username}>{user?.username || 'User'}</Text>
                <Text style={styles.dateText}>
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                {user?.profile_image ? (
                  <Avatar.Image
                    size={60}
                    source={{ uri: getImageUrl(user.profile_image) || user.profile_image }}
                    style={styles.avatar}
                  />
                ) : (
                  <Avatar.Icon 
                    size={60} 
                    icon="account" 
                    style={styles.avatar}
                  />
                )}
              </TouchableOpacity>
            </View>
            {/* Model Status */}
            <View style={styles.modelStatusContainer}>
              <View style={styles.modelStatus}>
                <Icon 
                  name="check-circle" 
                  size={20} 
                  color={modelHealth?.model_loaded ? '#4CAF50' : '#F44336'} 
                />
                <Text style={styles.modelStatusText}>
                  AI Model: {modelHealth?.model_loaded ? 'Ready' : 'Loading...'}
                </Text>
                <Badge 
                  style={[
                    styles.statusBadge,
                    { backgroundColor: modelHealth?.model_loaded ? '#4CAF50' : '#F44336' }
                  ]}
                >
                  {modelHealth?.model_loaded ? 'Online' : 'Offline'}
                </Badge>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Feature Carousel */}
        <View style={styles.carouselContainer}>
          <FlatList
            ref={featureListRef}
            data={features}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.key}
            onScroll={RNAnimated.event(
              [{ nativeEvent: { contentOffset: { x: featureScrollX } } }],
              { useNativeDriver: false }
            )}
            renderItem={({ item }) => {
              console.log('Rendering feature:', item);
              return (
                <View style={styles.featureSlide}>
                  <LinearGradient
                    colors={[item.color + 'CC', item.color + '66']}
                    style={styles.featureSlideGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.featureSlideIconWrap}>
                      <Icon name={item.icon} size={38} color="#fff" style={styles.featureSlideIcon} />
                    </View>
                    <Text style={styles.featureSlideTitle}>{item.title}</Text>
                    <Text style={styles.featureSlideDesc}>{item.description}</Text>
                  </LinearGradient>
                </View>
              );
            }}
            style={{ flexGrow: 0 }}
            snapToInterval={width - 60}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 20 }}
            getItemLayout={(_, i) => ({ length: width - 60, offset: (width - 60) * i, index: i })}
          />
          {features.length === 0 && (
            <Text style={{ color: 'red', textAlign: 'center', marginTop: 20 }}>
              No features to display. Please check your features array.
            </Text>
          )}
          {/* Dots Indicator */}
          <View style={styles.carouselDots}>
            {features.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.carouselDot,
                  featureIndex === i && styles.carouselDotActive
                ]}
              />
            ))}
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Quick Actions */}
          <Animated.View 
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <TouchableOpacity onPress={handleQuickStats}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.analyzeCard}
              onPress={handleAnalyze}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[colors.secondary, colors.primary, '#7c4dff']}
                style={styles.analyzeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.analyzeContent}>
                  <View style={styles.analyzeLeft}>
                    <View style={styles.analyzeIconWrap}>
                      <Icon name="diamond" size={44} color="#fff" style={styles.analyzeIcon} />
                    </View>
                    <View style={styles.analyzeTextContainer}>
                      <Text style={styles.analyzeTitle}>Analyze Gemstone</Text>
                      <Text style={styles.analyzeSubtitle}>
                        Start a new AI-powered gemstone authentication
                      </Text>
                    </View>
                  </View>
                  <View style={styles.analyzeRight}>
                    <Icon name="arrow-forward" size={30} color="#FFFFFF" />
                    <RNAnimated.View style={{
                      transform: [{ scale: startGlow }],
                      shadowColor: colors.primary,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.7,
                      shadowRadius: 16,
                      elevation: 8,
                    }}>
                      <Chip style={styles.analyzeChip} textStyle={styles.analyzeChipText}>
                        Start
                      </Chip>
                    </RNAnimated.View>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Statistics */}
          <Animated.View 
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>Your Statistics</Text>
            
            <View style={styles.statsGrid}>
              {renderStatCard(
                'Total Analyses',
                statistics?.total_analyses || 0,
                'analytics',
                colors.primary,
                'All time'
              )}
              {renderStatCard(
                'Natural',
                statistics?.by_type?.Natural || 0,
                'eco',
                colors.natural,
                'Authentic'
              )}
              {renderStatCard(
                'Synthetic',
                statistics?.by_type?.Synthetic || 0,
                'science',
                colors.synthetic,
                'Lab-grown'
              )}
              {renderStatCard(
                'High Confidence',
                statistics?.high_confidence_count || 0,
                'verified',
                colors.success,
                'Reliable'
              )}
            </View>
          </Animated.View>

          {/* Features Grid */}
          <Animated.View 
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>Quick Access</Text>
            
            <View style={styles.featuresGrid}>
              {renderFeatureCard(
                'History',
                'View all your analyses',
                'history',
                colors.primary,
                () => navigation.navigate('History')
              )}
              {renderFeatureCard(
                'Profile',
                'Manage your account',
                'person',
                colors.secondary,
                () => navigation.navigate('Profile')
              )}
              {renderFeatureCard(
                'USB Microscope Test',
                'Test USB microscope connection',
                'usb',
                colors.success,
                () => navigation.navigate('USBMicroscopeTest')
              )}
              {renderFeatureCard(
                'Help',
                'Get support & guides',
                'help',
                colors.warning,
                () => navigation.navigate('HelpSupport')
              )}
              {renderFeatureCard(
                'Settings',
                'App preferences',
                'settings',
                colors.natural,
                () => Alert.alert('Settings', 'Settings coming soon!')
              )}
            </View>
          </Animated.View>

          {/* Tips Card */}
          <Animated.View 
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Card style={styles.tipsCard}>
              <Card.Content>
                <View style={styles.tipsHeader}>
                  <Icon name="lightbulb" size={24} color={colors.primary} />
                  <Text style={styles.tipsTitle}>Pro Tips</Text>
                </View>
                <View style={styles.tipsList}>
                  <View style={styles.tipItem}>
                    <Icon name="check-circle" size={16} color={colors.success} />
                    <Text style={styles.tipText}>Ensure your microscope is properly connected via USB</Text>
                  </View>
                  <View style={styles.tipItem}>
                    <Icon name="check-circle" size={16} color={colors.success} />
                    <Text style={styles.tipText}>Clean the lens before capturing images</Text>
                  </View>
                  <View style={styles.tipItem}>
                    <Icon name="check-circle" size={16} color={colors.success} />
                    <Text style={styles.tipText}>Use proper lighting for accurate results</Text>
                  </View>
                  <View style={styles.tipItem}>
                    <Icon name="check-circle" size={16} color={colors.success} />
                    <Text style={styles.tipText}>Keep gemstones stable during capture</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    paddingBottom: 100, // Add padding for the dark navigation bar
  },
  header: {
    marginBottom: 20,
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  username: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  dateText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.7,
    marginTop: 4,
  },
  avatar: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  modelStatusContainer: {
    alignItems: 'center',
  },
  modelStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignSelf: 'flex-start',
  },
  modelStatusText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    marginLeft: 10,
  },
  content: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  seeAllText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  analyzeCard: {
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    marginBottom: 24,
    marginTop: 10,
  },
  analyzeGradient: {
    padding: 32,
    borderRadius: 28,
  },
  analyzeContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    width: '100%',
  },
  analyzeLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  analyzeIconWrap: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 32,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeIcon: {
    alignSelf: 'center',
  },
  analyzeTextContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  analyzeSubtitle: {
    fontSize: 15,
    color: '#e0e0e0',
    opacity: 0.92,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  analyzeRight: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    flexDirection: 'column',
    gap: 6,
  },
  analyzeChip: {
    backgroundColor: '#fff',
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  analyzeChipText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 50) / 2,
    marginBottom: 15,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  statGradient: {
    padding: 20,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  statTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 2,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: (width - 50) / 2,
    marginBottom: 15,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  featureGradient: {
    padding: 20,
    alignItems: 'center',
    position: 'relative',
  },
  featureIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 5,
  },
  featureDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  featureArrow: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
  tipsCard: {
    borderRadius: 20,
    elevation: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  tipsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 10,
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  carouselContainer: {
    marginTop: 20,
    marginBottom: 10,
    height: 270,
    backgroundColor: '#181A20',
    borderRadius: 28,
    overflow: 'hidden',
    marginHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  featureSlide: {
    width: width - 80,
    alignSelf: 'center',
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    height: 230,
    marginHorizontal: 10,
  },
  featureSlideGradient: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  featureSlideIconWrap: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 32,
    padding: 12,
    marginBottom: 10,
  },
  featureSlideIcon: {
    alignSelf: 'center',
  },
  featureSlideTitle: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  featureSlideDesc: {
    fontSize: 15,
    color: '#e0e0e0',
    opacity: 0.92,
    textAlign: 'center',
    marginBottom: 2,
    letterSpacing: 0.1,
  },
  carouselDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  carouselDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 4,
  },
  carouselDotActive: {
    backgroundColor: '#fff',
    width: 16,
  },
});