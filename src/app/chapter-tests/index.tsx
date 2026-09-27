import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Animated,
  Easing,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  BookOpen,
  RotateCw,
  Folder,
  Layers,
  ClipboardList,
  FileText,
  ChevronRight,
} from 'lucide-react-native';
import { apiClient, getCachedData, setCachedData } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function ChapterTestsCatalogScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const spinAnim = useRef(new Animated.Value(0)).current;

  const startSpinAnimation = () => {
    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  };

  const loadData = useCallback(async () => {
    try {
      // 1. Instant Cache Load
      const [cachedCats, cachedChapterItems] = await Promise.all([
        getCachedData<any[]>('catalog_categories'),
        getCachedData<any[]>('chapter_catalog_items'),
      ]);

      if (cachedCats && Array.isArray(cachedCats)) setCategories(cachedCats);
      if (cachedChapterItems && Array.isArray(cachedChapterItems)) {
        setItems(cachedChapterItems);
        setLoading(false);
      }

      // 2. Fresh Network Fetch
      const [catsRes, subsRes, examsRes, foldersRes, seriesRes, materialsRes] = await Promise.allSettled([
        apiClient.get('/categories?active=true'),
        apiClient.get('/subcategories?active=true'),
        apiClient.get('/exams?active=true'),
        apiClient.get('/folders'),
        apiClient.get('/test-series'),
        apiClient.get('/materials'),
      ]);

      const catList: any[] = [];
      if (examsRes.status === 'fulfilled' && Array.isArray(examsRes.value?.data)) {
        examsRes.value.data.forEach((e: any) => {
          catList.push({ id: e.id, name: e.name || e.shortName || 'Exam' });
        });
      }
      if (subsRes.status === 'fulfilled' && Array.isArray(subsRes.value?.data)) {
        subsRes.value.data.forEach((s: any) => {
          if (!catList.some((c) => c.id === s.id)) {
            catList.push({ id: s.id, name: s.name });
          }
        });
      }
      if (catsRes.status === 'fulfilled' && Array.isArray(catsRes.value?.data)) {
        catsRes.value.data.forEach((c: any) => {
          if (!catList.some((item) => item.id === c.id)) {
            catList.push({ id: c.id, name: c.name });
          }
        });
      }

      setCategories(catList);
      setCachedData('catalog_categories', catList);

      let allChapterItems: any[] = [];

      // Add Chapter/Topic Folders
      if (foldersRes.status === 'fulfilled' && foldersRes.value?.data) {
        const folderData = Array.isArray(foldersRes.value.data) ? foldersRes.value.data : [];
        const chapterFolders = folderData.filter((f: any) => {
          const sec = (f.icon || '').toUpperCase();
          if (sec === 'CHAPTER_WISE') return true;
          if (sec && ['PAID_SERIES', 'FREE_TEST', 'SYLLABUS'].includes(sec)) return false;
          const name = (f.name || '').toLowerCase();
          return name.includes('chapter') || name.includes('topic') || name.includes('cdp');
        }).map((f: any) => ({
          ...f,
          itemType: 'folder',
        }));
        allChapterItems = [...allChapterItems, ...chapterFolders];
      }

      // Add Test Series explicitly designated or matching chapter/topic
      if (seriesRes.status === 'fulfilled' && seriesRes.value?.data) {
        const seriesData = Array.isArray(seriesRes.value.data) ? seriesRes.value.data : [];
        const seriesItems = seriesData.filter((s: any) => {
          const cat = (s.category || '').toUpperCase();
          const title = (s.title || s.name || '').toLowerCase();
          return cat === 'CHAPTER_WISE' || title.includes('chapter') || title.includes('topic') || title.includes('cdp');
        }).map((s: any) => ({
          ...s,
          name: s.title || s.name,
          image: s.thumbnail || s.image,
          itemType: 'series',
        }));
        allChapterItems = [...allChapterItems, ...seriesItems];
      }

      // Add Study Materials (PDFs) explicitly designated or matching chapter/topic
      if (materialsRes.status === 'fulfilled' && materialsRes.value?.data) {
        const materialData = Array.isArray(materialsRes.value.data) ? materialsRes.value.data : [];
        const chapterMaterials = materialData.filter((m: any) => {
          const type = (m.type || '').toUpperCase();
          if (type === 'UNASSIGNED' || (type && type !== 'CHAPTER_WISE')) return false;
          const title = (m.title || m.name || '').toLowerCase();
          return type === 'CHAPTER_WISE' || title.includes('chapter') || title.includes('topic') || title.includes('cdp');
        }).map((m: any) => ({
          ...m,
          name: m.title || m.name,
          image: m.thumbnail || m.image,
          itemType: 'material',
        }));
        allChapterItems = [...allChapterItems, ...chapterMaterials];
      }

      setItems(allChapterItems);
      setCachedData('chapter_catalog_items', allChapterItems);
    } catch (error) {
      console.log('Error loading chapter items data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, user?.id]);

  const onRefresh = useCallback(() => {
    startSpinAnimation();
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Filter items by category tab and search query
  const filteredItems = useMemo(() => {
    let result = items;

    // Category filter
    if (selectedCategoryId !== 'ALL') {
      const selectedCat = categories.find((c) => c.id === selectedCategoryId);
      const catName = selectedCat?.name?.toLowerCase() || '';

      result = result.filter((item) => {
        if (item.categoryId === selectedCategoryId || item.category === selectedCategoryId) return true;
        if (catName) {
          const itemName = (item.name || item.title || '').toLowerCase();
          const itemDesc = (item.description || '').toLowerCase();
          const words = catName.split(/[\s-]+/).filter((w: string) => w.length > 2);
          if (words.some((w: string) => itemName.includes(w) || itemDesc.includes(w))) return true;
        }
        return false;
      });
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          (item.name || item.title || '').toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [items, selectedCategoryId, categories, searchQuery]);

  const handlePressItem = (item: any) => {
    if (item.itemType === 'series') {
      router.push(`/series/${item.id}` as any);
    } else if (item.itemType === 'material') {
      if (item.pdfUrl) {
        Linking.openURL(item.pdfUrl).catch((err) => console.error('Failed to open PDF:', err));
      }
    } else {
      router.push(`/explore/folder/${item.id}` as any);
    }
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderCard = ({ item }: { item: any }) => {
    const isMaterial = item.itemType === 'material';
    const itemImage = item.image || item.thumbnail || item.imageUrl || (typeof item.icon === 'string' && item.icon.startsWith('http') ? item.icon : null);
    const isFree = item.isFree || item.isDemo || item.price === 0 || !item.isPaid;

    if (isMaterial) {
      return (
        <TouchableOpacity
          key={`material_${item.id}`}
          style={styles.materialCardContainer}
          activeOpacity={0.88}
          onPress={() => handlePressItem(item)}
        >
          {/* Left: Mint Rounded Container with Document Icon or Image */}
          <View style={styles.mintIconBox}>
            {itemImage ? (
              <Image
                source={{ uri: itemImage }}
                style={styles.mintIconImage}
                contentFit="cover"
              />
            ) : (
              <FileText size={22} color="#059669" strokeWidth={2.2} />
            )}
          </View>

          {/* Middle: Title & Subtitle Details */}
          <View style={styles.materialCardDetails}>
            <View style={styles.materialCardTitleRow}>
              <Text style={styles.materialCardTitle} numberOfLines={1}>
                {item.name || item.title}
              </Text>
            </View>

            <View style={styles.materialCardMetaRow}>
              <Text style={styles.materialCardMetaTextBold}>{item.type || 'CHAPTER_WISE'}</Text>
              <Text style={styles.materialCardMetaDot}>•</Text>
              <Text style={styles.materialCardMetaText}>Study Material</Text>
            </View>
          </View>

          {/* Right: Vibrant Green Pill Button */}
          <View style={styles.resumePillBtn}>
            <Text style={styles.resumePillBtnText}>View</Text>
            <ChevronRight size={13} color="#FFFFFF" strokeWidth={3} />
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        key={`${item.itemType || 'folder'}_${item.id}`}
        style={styles.cardContainer}
        activeOpacity={0.88}
        onPress={() => handlePressItem(item)}
      >
        {/* Left Side: Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {itemImage ? (
            <Image
              source={{ uri: itemImage }}
              style={styles.thumbnailImage}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Layers size={30} color="#002D72" />
            </View>
          )}
          <View style={[styles.newBadge, isFree && { backgroundColor: '#059669' }]}>
            <View style={styles.newBadgeDot} />
            <Text style={styles.newBadgeText}>{isFree ? 'Free Test' : 'Chapter Test'}</Text>
          </View>
        </View>

        {/* Right Side: Content & Action Button */}
        <View style={styles.cardInfo}>
          <Text style={styles.folderCardTitle} numberOfLines={2}>
            {item.name || item.title}
          </Text>

          <View style={styles.priceRow}>
            {isFree ? (
              <Text style={styles.finalPriceFree}>FREE</Text>
            ) : item.discountPrice && item.discountPrice > 0 ? (
              <View style={styles.priceValues}>
                <Text style={styles.finalPrice}>₹{item.discountPrice}</Text>
                {item.price && item.price > item.discountPrice && (
                  <Text style={styles.originalPrice}>₹{item.price}</Text>
                )}
              </View>
            ) : item.price && item.price > 0 ? (
              <Text style={styles.finalPrice}>₹{item.price}</Text>
            ) : (
              <Text style={styles.finalPriceFree}>FREE</Text>
            )}
          </View>

          <View style={styles.btnRow}>
            <View style={[styles.buyBtn, isFree && styles.startBtn]}>
              <Text style={styles.buyBtnText}>{isFree ? 'Start Now' : 'Open'}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={21} color="#002D72" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Chapter Wise Tests
            </Text>
            <Text style={styles.headerSub}>Topic & Chapter Practice Series</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onRefresh}
          style={styles.refreshButton}
          activeOpacity={0.7}
          disabled={refreshing}
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <RotateCw size={19} color="#0072FF" />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            placeholder="Search chapter tests, topics..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Categories Filter Tabs */}
      {categories.length > 0 && (
        <View style={styles.categoryScrollWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id: 'ALL', name: 'All Chapters' }, ...categories]}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.categoryScrollContent}
            renderItem={({ item }) => {
              const isSelected = selectedCategoryId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                  onPress={() => setSelectedCategoryId(item.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Items List */}
      {loading && items.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0072FF" />
          <Text style={styles.loadingText}>Loading chapter tests...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => `${item.itemType || 'item'}_${item.id}`}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0072FF']}
              tintColor="#0072FF"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Layers size={40} color="#0072FF" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No Chapter Tests Found' : 'Coming Soon 🚀'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No chapter tests matching "${searchQuery}"`
                  : 'Fresh chapter-wise practice tests and materials are being prepared. Check back soon!'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#002D72',
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  categoryScrollWrapper: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#002D72',
    borderColor: '#002D72',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    width: 148,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 4,
    gap: 3.5,
  },
  newBadgeDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  cardInfo: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    gap: 4,
  },
  folderCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  finalPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#002D72',
  },
  finalPriceFree: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  originalPrice: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  buyBtn: {
    backgroundColor: '#002D72',
    paddingHorizontal: 14,
    paddingVertical: 4.5,
    borderRadius: 6,
    shadowColor: '#002D72',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  startBtn: {
    backgroundColor: '#059669',
    shadowColor: '#059669',
  },
  buyBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Compact Material/PDF Card Styles matching web & test card
  materialCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  mintIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mintIconImage: {
    width: '100%',
    height: '100%',
  },
  materialCardDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  materialCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  materialCardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  materialCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  materialCardMetaTextBold: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  materialCardMetaDot: {
    fontSize: 11,
    color: '#CBD5E1',
  },
  materialCardMetaText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  resumePillBtn: {
    backgroundColor: '#00C458',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    shadowColor: '#00C458',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  resumePillBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
});

