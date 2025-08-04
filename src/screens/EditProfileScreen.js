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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, TextInput, Button, Avatar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../store/authContext';
import { colors } from '../styles/theme';

const { width, height } = Dimensions.get('window');

export default function EditProfileScreen({ navigation }) {
  const { user, updateProfile, uploadProfileImage } = useAuth();
  const insets = useSafeAreaInsets();
  
  // Form state
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileImage, setProfileImage] = useState(user?.profile_image || null);
  const [isLoading, setIsLoading] = useState(false);
  
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

  const pickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your photo gallery to select a profile image.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImageUri = result.assets[0].uri;
        setProfileImage(selectedImageUri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        // Upload the image immediately
        try {
          const uploadResult = await uploadProfileImage(selectedImageUri);
          if (!uploadResult.success) {
            Alert.alert('Error', uploadResult.error || 'Failed to upload image. Please try again.');
            setProfileImage(user?.profile_image || null);
          }
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          Alert.alert('Error', 'Failed to upload image. Please try again.');
          setProfileImage(user?.profile_image || null);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  }, [uploadProfileImage, user?.profile_image]);

  const handleSave = useCallback(async () => {
    if (!username.trim() || !email.trim()) {
      Alert.alert('Error', 'Username and email are required.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await updateProfile({
        username: username.trim(),
        email: email.trim(),
        full_name: fullName.trim(),
        phone: phone.trim(),
        // Don't include profile_image here since it's handled separately
      });
      
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'Profile updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to update profile. Please try again.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update profile. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [username, email, fullName, phone, updateProfile, navigation]);

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
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <Text style={styles.headerSubtitle}>
              Update your personal information
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

  const renderProfileImage = () => (
    <Animated.View
      style={[
        styles.profileImageContainer,
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
            <View style={styles.imageSection}>
              <TouchableOpacity
                style={styles.imageContainer}
                onPress={pickImage}
                activeOpacity={0.8}
              >
                {profileImage ? (
                  <Avatar.Image
                    size={100}
                    source={{ uri: profileImage }}
                    style={styles.profileImage}
                  />
                ) : (
                  <Avatar.Icon
                    size={100}
                    icon="account"
                    style={styles.profileImage}
                  />
                )}
                <View style={styles.imageOverlay}>
                  <Icon name="camera-alt" size={24} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <Text style={styles.imageText}>Tap to change photo</Text>
            </View>
          </Card.Content>
        </LinearGradient>
      </Card>
    </Animated.View>
  );

  const renderForm = () => (
    <Animated.View
      style={[
        styles.formContainer,
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
              <Icon name="person" size={24} color={colors.secondary} />
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>
            
            <TextInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              style={styles.input}
              mode="outlined"
              left={<TextInput.Icon icon="account" />}
            />
            
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              mode="outlined"
              keyboardType="email-address"
              left={<TextInput.Icon icon="email" />}
            />
            
            <TextInput
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
              mode="outlined"
              left={<TextInput.Icon icon="badge" />}
            />
            
            <TextInput
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              style={styles.input}
              mode="outlined"
              keyboardType="phone-pad"
              left={<TextInput.Icon icon="phone" />}
            />
          </Card.Content>
        </LinearGradient>
      </Card>
    </Animated.View>
  );

  const renderActions = () => (
    <Animated.View
      style={[
        styles.actionsContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.buttonGradient}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Icon name="save" size={24} color="#FFFFFF" />
          )}
          <Text style={styles.buttonText}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[colors.secondary, '#1976d2']}
          style={styles.buttonGradient}
        >
          <Icon name="cancel" size={24} color="#FFFFFF" />
          <Text style={styles.buttonText}>Cancel</Text>
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
        {renderProfileImage()}
        {renderForm()}
        {renderActions()}
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
  profileImageContainer: {
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
  imageSection: {
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    backgroundColor: colors.primary,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  imageText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  formContainer: {
    marginBottom: 20,
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
  input: {
    marginBottom: 15,
    backgroundColor: colors.background,
  },
  actionsContainer: {
    marginTop: 20,
  },
  saveButton: {
    borderRadius: 30,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 5,
  },
  cancelButton: {
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
}); 