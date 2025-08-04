import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { colors } from '../styles/theme';

const { width, height } = Dimensions.get('window');

export default function PrivacyPolicyScreen({ navigation }) {
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
            <Text style={styles.headerTitle}>Privacy Policy</Text>
            <Text style={styles.headerSubtitle}>
              How we protect your data
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

  const renderSection = (title, content, icon, color) => (
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
          colors={[color + '10', color + '05']}
          style={styles.cardGradient}
        >
          <Card.Content style={styles.cardContent}>
            <View style={styles.sectionHeader}>
              <Icon name={icon} size={24} color={color} />
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            <Text style={styles.sectionContent}>{content}</Text>
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
        {renderSection(
          "Information We Collect",
          "We collect information you provide directly to us, such as when you create an account, upload images for analysis, or contact us for support. This may include your name, email address, phone number, and gemstone images you upload for authentication.",
          "data-usage",
          colors.primary
        )}

        {renderSection(
          "How We Use Your Information",
          "We use the information we collect to provide, maintain, and improve our services, process your gemstone analysis requests, send you technical notices and support messages, and respond to your comments and questions.",
          "settings",
          colors.secondary
        )}

        {renderSection(
          "Data Security",
          "We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. Your data is encrypted during transmission and storage.",
          "security",
          colors.success
        )}

        {renderSection(
          "Data Sharing",
          "We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy. We may share data with trusted service providers who assist us in operating our app.",
          "share",
          colors.warning
        )}

        {renderSection(
          "Your Rights",
          "You have the right to access, update, or delete your personal information. You can also opt out of certain communications and request a copy of your data. Contact us to exercise these rights.",
          "person",
          colors.info
        )}

        {renderSection(
          "Data Retention",
          "We retain your personal information for as long as necessary to provide our services and comply with legal obligations. Analysis results and images are stored securely and can be deleted upon request.",
          "schedule",
          colors.error
        )}

        {renderSection(
          "Contact Us",
          "If you have any questions about this Privacy Policy or our data practices, please contact us at privacy@gemdetect.com. We are committed to protecting your privacy and will respond to your inquiries promptly.",
          "contact-support",
          colors.primary
        )}

        <Animated.View
          style={[
            styles.footerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Card style={styles.footerCard}>
            <LinearGradient
              colors={[colors.background, colors.background]}
              style={styles.footerGradient}
            >
              <Card.Content style={styles.footerContent}>
                <Text style={styles.footerText}>
                  Last updated: December 2024
                </Text>
                <Text style={styles.footerText}>
                  © 2024 GemDetect. All rights reserved.
                </Text>
              </Card.Content>
            </LinearGradient>
          </Card>
        </Animated.View>
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
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 15,
  },
  sectionContent: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: 'justify',
  },
  footerContainer: {
    marginTop: 20,
  },
  footerCard: {
    borderRadius: 15,
    elevation: 2,
  },
  footerGradient: {
    borderRadius: 15,
  },
  footerContent: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 5,
  },
}); 