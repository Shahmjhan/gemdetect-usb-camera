import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, List, Divider } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { colors } from '../styles/theme';

const { width, height } = Dimensions.get('window');

export default function HelpSupportScreen({ navigation }) {
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

  const handleContactSupport = useCallback(async () => {
    try {
      await Linking.openURL('mailto:support@gemdetect.com?subject=GemDetect Support Request');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      Alert.alert('Error', 'Could not open email app. Please contact support@gemdetect.com');
    }
  }, []);

  const handleFAQ = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Frequently Asked Questions',
      'Coming soon! We are working on a comprehensive FAQ section.',
      [{ text: 'OK' }]
    );
  }, []);

  const handleLiveChat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Live Chat',
      'Live chat support will be available soon! For now, please use email support.',
      [{ text: 'OK' }]
    );
  }, []);

  const handleReportBug = useCallback(async () => {
    try {
      await Linking.openURL('mailto:bugs@gemdetect.com?subject=Bug Report - GemDetect App');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      Alert.alert('Error', 'Could not open email app. Please contact bugs@gemdetect.com');
    }
  }, []);

  const handleFeatureRequest = useCallback(async () => {
    try {
      await Linking.openURL('mailto:features@gemdetect.com?subject=Feature Request - GemDetect App');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      Alert.alert('Error', 'Could not open email app. Please contact features@gemdetect.com');
    }
  }, []);

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
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Help & Support</Text>
            <Text style={styles.headerSubtitle}>
              We're here to help you
            </Text>
          </View>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderQuickHelp = () => (
    <Animated.View
      style={[
        styles.quickHelpContainer,
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
              <Icon name="help" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Quick Help</Text>
            </View>
            
            <View style={styles.helpGrid}>
              <TouchableOpacity
                style={styles.helpItem}
                onPress={handleFAQ}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.helpItemGradient}
                >
                  <Icon name="question-answer" size={32} color="#FFFFFF" />
                  <Text style={styles.helpItemText}>FAQ</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.helpItem}
                onPress={handleLiveChat}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.secondary, '#1976d2']}
                  style={styles.helpItemGradient}
                >
                  <Icon name="chat" size={32} color="#FFFFFF" />
                  <Text style={styles.helpItemText}>Live Chat</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </LinearGradient>
      </Card>
    </Animated.View>
  );

  const renderContactOptions = () => (
    <Animated.View
      style={[
        styles.contactOptionsContainer,
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
              <Icon name="contact-support" size={24} color={colors.secondary} />
              <Text style={styles.sectionTitle}>Contact Options</Text>
            </View>
            
            <List.Item
              title="Email Support"
              description="Get help via email"
              left={props => <List.Icon {...props} icon="email" color={colors.primary} />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={handleContactSupport}
              style={styles.listItem}
            />
            
            <Divider style={styles.divider} />
            
            <List.Item
              title="Report a Bug"
              description="Found an issue? Let us know"
              left={props => <List.Icon {...props} icon="bug-report" color={colors.error} />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={handleReportBug}
              style={styles.listItem}
            />
            
            <Divider style={styles.divider} />
            
            <List.Item
              title="Feature Request"
              description="Suggest new features"
              left={props => <List.Icon {...props} icon="lightbulb" color={colors.warning} />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={handleFeatureRequest}
              style={styles.listItem}
            />
          </Card.Content>
        </LinearGradient>
      </Card>
    </Animated.View>
  );

  const renderAppInfo = () => (
    <Animated.View
      style={[
        styles.appInfoContainer,
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
              <Icon name="info" size={24} color={colors.success} />
              <Text style={styles.sectionTitle}>App Information</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Build</Text>
              <Text style={styles.infoValue}>2024.1.0</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Platform</Text>
              <Text style={styles.infoValue}>{Platform.OS === 'ios' ? 'iOS' : 'Android'}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Support Email</Text>
              <Text style={styles.infoValue}>support@gemdetect.com</Text>
            </View>
          </Card.Content>
        </LinearGradient>
      </Card>
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
        {renderQuickHelp()}
        {renderContactOptions()}
        {renderAppInfo()}
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
  quickHelpContainer: {
    marginBottom: 20,
  },
  contactOptionsContainer: {
    marginBottom: 20,
  },
  appInfoContainer: {
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
  helpGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  helpItem: {
    width: (width - 80) / 2,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
  },
  helpItemGradient: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpItemText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  listItem: {
    paddingVertical: 5,
  },
  divider: {
    marginVertical: 5,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  infoLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
}); 