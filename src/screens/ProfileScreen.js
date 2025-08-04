import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Avatar, Button, List, Divider, Switch } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../store/authContext';
import { useApp } from '../store/appContext';
import { colors } from '../styles/theme';
import { PieChart } from 'react-native-chart-kit';
import { getImageUrl } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
  const { user, logout, checkAuthStatus } = useAuth();
  const { statistics } = useApp();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const headerSlide = useRef(new Animated.Value(-50)).current;

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
  }, [fadeAnim, headerSlide, slideAnim]);

  useFocusEffect(
    React.useCallback(() => {
      checkAuthStatus(); // Refresh user data from backend on screen focus
    }, [])
  );

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const chartData = statistics ? [
    {
      name: 'Natural',
      count: statistics.by_type?.Natural || 0,
      color: colors.natural,
      legendFontColor: colors.text,
      legendFontSize: 14,
    },
    {
      name: 'Synthetic',
      count: statistics.by_type?.Synthetic || 0,
      color: colors.synthetic,
      legendFontColor: colors.text,
      legendFontSize: 14,
    },
    {
      name: 'Undefined',
      count: statistics.by_type?.Undefined || 0,
      color: colors.undefined,
      legendFontColor: colors.text,
      legendFontSize: 14,
    },
  ] : [];

  const renderHeader = () => (
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
                  <View style={styles.profileInfo}>
          {user?.profile_image ? (
            <Avatar.Image 
              size={80} 
              source={{ uri: getImageUrl(user.profile_image) || user.profile_image }} 
              style={styles.avatar}
              onError={(error) => {
                console.log('Avatar image error:', error);
                // If the image fails to load, we could set a fallback here
              }}
            />
          ) : (
            <Avatar.Icon 
              size={80} 
              icon="account" 
              style={styles.avatar}
            />
          )}
          <View style={styles.userInfo}>
            <Text style={styles.username}>{user?.username || 'User'}</Text>
            <Text style={styles.email}>{user?.email || 'user@example.com'}</Text>
            <View style={styles.statusBadge}>
              <Icon name="verified" size={16} color="#FFFFFF" />
              <Text style={styles.statusText}>Verified User</Text>
            </View>
          </View>
        </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderStatistics = () => (
    <Animated.View
      style={[
        styles.statisticsContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {statistics && statistics.total_analyses > 0 && (
        <Card style={styles.card}>
          <LinearGradient
            colors={[colors.primary + '10', colors.primary + '05']}
            style={styles.cardGradient}
          >
            <Card.Content style={styles.cardContent}>
              <View style={styles.sectionHeader}>
                <Icon name="analytics" size={24} color={colors.primary} />
                <Text style={styles.sectionTitle}>Analysis Statistics</Text>
              </View>
              
              <View style={styles.chartContainer}>
                <PieChart
                  data={chartData}
                  width={280}
                  height={180}
                  chartConfig={{
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  }}
                  accessor="count"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
              </View>
              
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Icon name="assessment" size={24} color={colors.primary} />
                  <Text style={styles.statValue}>{statistics.total_analyses}</Text>
                  <Text style={styles.statLabel}>Total Analyses</Text>
                </View>
                <View style={styles.statCard}>
                  <Icon name="trending-up" size={24} color={colors.success} />
                  <Text style={styles.statValue}>
                    {statistics.average_confidence ? 
                      `${(statistics.average_confidence * 100).toFixed(1)}%` : 
                      'N/A'
                    }
                  </Text>
                  <Text style={styles.statLabel}>Avg Confidence</Text>
                </View>
              </View>
            </Card.Content>
          </LinearGradient>
        </Card>
      )}
    </Animated.View>
  );

  const renderSettings = () => (
    <Animated.View
      style={[
        styles.settingsContainer,
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
              <Icon name="settings" size={24} color={colors.secondary} />
              <Text style={styles.sectionTitle}>App Settings</Text>
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Icon name="notifications" size={24} color={colors.primary} />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Notifications</Text>
                  <Text style={styles.settingDescription}>Receive analysis updates</Text>
                </View>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                color={colors.primary}
              />
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Icon name="dark-mode" size={24} color={colors.warning} />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Dark Mode</Text>
                  <Text style={styles.settingDescription}>Coming soon</Text>
                </View>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                color={colors.primary}
                disabled
              />
            </View>
            
            <Divider style={styles.divider} />
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert(
                  'About GemDetect',
                  'AI-Powered Gemstone Authentication System\n\nVersion 1.0.0\n\n© 2024 GemDetect',
                  [{ text: 'OK' }]
                );
              }}
            >
              <View style={styles.settingLeft}>
                <Icon name="info" size={24} color={colors.info} />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>About</Text>
                  <Text style={styles.settingDescription}>Version 1.0.0</Text>
                </View>
              </View>
              <Icon name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </Card.Content>
        </LinearGradient>
      </Card>
    </Animated.View>
  );

  const renderAccountActions = () => (
    <Animated.View
      style={[
        styles.accountActionsContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Card style={styles.card}>
        <LinearGradient
          colors={[colors.success + '10', colors.success + '05']}
          style={styles.cardGradient}
        >
          <Card.Content style={styles.cardContent}>
            <View style={styles.sectionHeader}>
              <Icon name="account-circle" size={24} color={colors.success} />
              <Text style={styles.sectionTitle}>Account Management</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.accountItem} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('EditProfile');
              }}
            >
              <View style={styles.accountItemLeft}>
                <Icon name="edit" size={20} color={colors.primary} />
                <Text style={styles.accountItemText}>Edit Profile</Text>
              </View>
              <Icon name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.accountItem} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('ChangePassword');
              }}
            >
              <View style={styles.accountItemLeft}>
                <Icon name="lock" size={20} color={colors.primary} />
                <Text style={styles.accountItemText}>Change Password</Text>
              </View>
              <Icon name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.accountItem} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('HelpSupport');
              }}
            >
              <View style={styles.accountItemLeft}>
                <Icon name="help" size={20} color={colors.primary} />
                <Text style={styles.accountItemText}>Help & Support</Text>
              </View>
              <Icon name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.accountItem} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('PrivacyPolicy');
              }}
            >
              <View style={styles.accountItemLeft}>
                <Icon name="policy" size={20} color={colors.primary} />
                <Text style={styles.accountItemText}>Privacy Policy</Text>
              </View>
              <Icon name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </Card.Content>
        </LinearGradient>
      </Card>
    </Animated.View>
  );

  const renderLogoutButton = () => (
    <Animated.View
      style={[
        styles.logoutContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[colors.error, '#d32f2f']}
          style={styles.logoutButtonGradient}
        >
          <Icon name="logout" size={24} color="#FFFFFF" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {renderHeader()}

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === 'ios' ? insets.bottom + 120 : insets.bottom + 130 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {renderStatistics()}
        {renderSettings()}
        {renderAccountActions()}
        {renderLogoutButton()}
      </ScrollView>
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
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerContent: {
    alignItems: 'center',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  avatar: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: 20,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 5,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  statisticsContainer: {
    marginBottom: 20,
  },
  settingsContainer: {
    marginBottom: 20,
  },
  accountActionsContainer: {
    marginBottom: 20,
  },
  logoutContainer: {
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 15,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 15,
    minWidth: 100,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 15,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    marginVertical: 5,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  accountItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountItemText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 15,
    fontWeight: '500',
  },
  logoutButton: {
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 5,
  },
  logoutButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 30,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});