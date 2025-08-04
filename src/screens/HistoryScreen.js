import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Chip, FAB, Searchbar, Menu, Divider, Badge } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useApp } from '../store/appContext';
import { historyAPI } from '../api/history';
import { colors } from '../styles/theme';
import ShimmerPlaceholder from 'react-native-shimmer-placeholder';
import { getImageUrl } from '../api/client';

const { width, height } = Dimensions.get('window');

export default function HistoryScreen({ navigation }) {
  const { analysisHistory, setAnalysisHistory } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [menuVisible, setMenuVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
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
    loadHistory();
  }, [filterType, fadeAnim, headerSlide, slideAnim]);

  const loadHistory = useCallback(async (refresh = false) => {
    if (refresh) {
      setPage(1);
      setHasMore(true);
    }

    try {
      // Always send page and per_page for proper pagination
      const filters = { page, per_page: 10 };
      if (filterType !== 'all') filters.result_type = filterType;
      const response = await historyAPI.getUserAnalyses(filters);
      
      if (refresh) {
        setAnalysisHistory(response.analyses);
      } else {
        setAnalysisHistory(prev => {
          const ids = new Set(prev.map(item => item.id));
          const newItems = response.analyses.filter(item => !ids.has(item.id));
          return [...prev, ...newItems];
        });
      }
      
      setHasMore(response.analyses.length === 10);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [filterType, setAnalysisHistory, page]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadHistory(true);
  }, [loadHistory]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      setPage(prev => prev + 1);
      loadHistory();
    }
  }, [hasMore, isLoading, loadHistory]);

  const filteredHistory = useMemo(() => {
    return analysisHistory.filter(item => {
      if (searchQuery) {
        return item.result_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
               item.id.toString().includes(searchQuery);
      }
      return true;
    });
  }, [analysisHistory, searchQuery]);

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

  const renderHistoryItem = useCallback(({ item, index }) => {
    const resultColor = getResultColor(item.result_type);
    const resultIcon = getResultIcon(item.result_type);
    const confidence = (item.confidence_score * 100).toFixed(1);

    return (
      <Animated.View
        style={[
          styles.historyItemContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('Result', { analysisId: item.id });
          }}
          activeOpacity={0.9}
        >
          <Card style={styles.historyCard}>
            <LinearGradient
              colors={[resultColor + '10', resultColor + '05']}
              style={styles.cardGradient}
            >
              <Card.Content style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <View style={styles.imageContainer}>
                    {item.image_path ? (
                      <Image 
                        source={{ uri: getImageUrl(item.image_path) }} 
                        style={styles.thumbnail}
                      />
                    ) : (
                      <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
                        <Icon name="image" size={30} color={colors.textSecondary} />
                      </View>
                    )}
                    <View style={styles.imageOverlay}>
                      <Icon name={resultIcon} size={16} color="#FFFFFF" />
                    </View>
                  </View>
                  
                  <View style={styles.cardInfo}>
                    <View style={styles.resultRow}>
                      <Chip
                        style={[styles.resultChip, { backgroundColor: resultColor }]}
                        textStyle={styles.resultChipText}
                        icon={resultIcon}
                      >
                        {item.result_type}
                      </Chip>
                      <View style={styles.confidenceContainer}>
                        <Text style={styles.confidenceLabel}>Confidence</Text>
                        <Text style={[styles.confidenceText, { color: resultColor }]}>
                          {confidence}%
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={styles.dateText}>
                      {format(new Date(item.created_at), 'MMM dd, yyyy • hh:mm a')}
                    </Text>
                    
                    <View style={styles.idRow}>
                      <Icon name="tag" size={14} color={colors.textSecondary} />
                      <Text style={styles.idText}>ID: {item.id}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.cardActions}>
                    <Icon name="chevron-right" size={24} color={colors.textSecondary} />
                  </View>
                </View>
              </Card.Content>
            </LinearGradient>
          </Card>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [fadeAnim, slideAnim, getResultColor, getResultIcon, navigation]);

  const renderEmptyState = useCallback(() => (
    <Animated.View 
      style={[
        styles.emptyState,
        {
          opacity: fadeAnim,
          transform: [{ scale: slideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={[colors.primary + '20', colors.primary + '10']}
        style={styles.emptyGradient}
      >
        <Icon name="history" size={80} color={colors.primary} />
        <Text style={styles.emptyTitle}>No Analysis History</Text>
        <Text style={styles.emptySubtitle}>
          Your gemstone analyses will appear here
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('Analysis')}
        >
          <Text style={styles.emptyButtonText}>Start Your First Analysis</Text>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  ), [fadeAnim, slideAnim, navigation]);

  const renderLoader = useCallback(() => (
    <View style={styles.loaderContainer}>
      {[1, 2, 3].map(i => (
        <Card key={i} style={styles.historyCard}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <ShimmerPlaceholder style={styles.thumbnail} />
              <View style={styles.cardInfo}>
                <ShimmerPlaceholder style={styles.shimmerLine} />
                <ShimmerPlaceholder style={[styles.shimmerLine, { width: '60%' }]} />
                <ShimmerPlaceholder style={[styles.shimmerLine, { width: '40%' }]} />
              </View>
            </View>
          </Card.Content>
        </Card>
      ))}
    </View>
  ), []);

  const handleClearHistory = async () => {
    Alert.alert(
      "Clear All History",
      "Are you sure you want to delete all your history records? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              await historyAPI.clearUserHistory();
              setAnalysisHistory([]); // Clear local state
            } catch (error) {
              Alert.alert("Error", error.error || "Failed to clear history.");
            }
          }
        }
      ]
    );
  };

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
              <Text style={styles.headerTitle}>Analysis History</Text>
              <Text style={styles.headerSubtitle}>
                {filteredHistory.length} {filteredHistory.length === 1 ? 'analysis' : 'analyses'} found
              </Text>
            </View>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Analysis')}
            >
              <Icon name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Search and Filter Section */}
      <Animated.View 
        style={[
          styles.searchSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Searchbar
          placeholder="Search by type or ID..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          iconColor={colors.primary}
          inputStyle={styles.searchInput}
        />
        
        <View style={styles.filterContainer}>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setMenuVisible(true)}
              >
                <Icon name="filter-list" size={20} color={colors.primary} />
                <Text style={styles.filterText}>
                  {filterType === 'all' ? 'All Types' : filterType}
                </Text>
                <Icon name="arrow-drop-down" size={20} color={colors.primary} />
              </TouchableOpacity>
            }
          >
            <Menu.Item onPress={() => { setFilterType('all'); setMenuVisible(false); }} title="All Types" />
            <Divider />
            <Menu.Item onPress={() => { setFilterType('Natural'); setMenuVisible(false); }} title="Natural" />
            <Menu.Item onPress={() => { setFilterType('Synthetic'); setMenuVisible(false); }} title="Synthetic" />
            <Menu.Item onPress={() => { setFilterType('Undefined'); setMenuVisible(false); }} title="Undefined" />
          </Menu>
        </View>
      </Animated.View>

      {/* History List */}
      {isLoading && analysisHistory.length === 0 ? (
        renderLoader()
      ) : (
        <FlatList
          data={filteredHistory}
          renderItem={renderHistoryItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Platform.OS === 'ios' ? insets.bottom + 120 : insets.bottom + 130 }
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FABs at the bottom */}
      <FAB
        icon="delete"
        style={[
          styles.clearFab,
          { bottom: Platform.OS === 'ios' ? insets.bottom + 150 : insets.bottom + 150 }
        ]}
        onPress={handleClearHistory}
        color="#fff"
        accessibilityLabel="Clear All History"
      />
      <FAB
        icon="plus"
        style={[
          styles.fab,
          { bottom: Platform.OS === 'ios' ? insets.bottom + 80 : insets.bottom + 80, right: 24 }
        ]}
        onPress={() => navigation.navigate('Analysis')}
      />
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
  searchSection: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  searchBar: {
    marginBottom: 15,
    elevation: 0,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  searchInput: {
    fontSize: 16,
  },
  filterContainer: {
    alignItems: 'flex-end',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  filterText: {
    marginHorizontal: 8,
    color: colors.primary,
    fontWeight: '500',
  },
  listContent: {
    padding: 20,
  },
  historyItemContainer: {
    marginBottom: 15,
  },
  historyCard: {
    borderRadius: 20,
    elevation: 3,
  },
  cardGradient: {
    borderRadius: 20,
  },
  cardContent: {
    padding: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  imageContainer: {
    marginRight: 15,
    position: 'relative',
  },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: 15,
  },
  placeholderThumbnail: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cardInfo: {
    flex: 1,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultChip: {
    height: 28,
  },
  resultChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  confidenceContainer: {
    alignItems: 'flex-end',
  },
  confidenceLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  confidenceText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  idText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 5,
  },
  cardActions: {
    marginLeft: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyGradient: {
    padding: 40,
    borderRadius: 25,
    alignItems: 'center',
    width: width - 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loaderContainer: {
    padding: 20,
  },
  shimmerLine: {
    height: 20,
    borderRadius: 4,
    marginBottom: 10,
    width: '80%',
  },
  fab: {
    position: 'absolute',
    right: 24,
    backgroundColor: colors.primary,
    zIndex: 99,
  },
  clearFab: {
    position: 'absolute',
    right: 24,
    backgroundColor: colors.error,
    zIndex: 100,
    marginBottom: 16, // Add gap between FABs
  },
});