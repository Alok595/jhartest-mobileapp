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
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Search,
  BookOpen,
  RotateCw,
  Folder,
  CheckCircle2,
  Calendar,
  PlayCircle,
  Video,
  Award,
  Layers,
  Sparkles,
  FileText,
  GraduationCap,
  ClipboardList,
  ChevronRight,
} from 'lucide-react-native';
import { apiClient, getCachedData, setCachedData } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function DynamicSectionCatalogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; title?: string; icon?: string; color?: string }>();
  const { user } = useAuth();

  const rawKey = params.id || '';
  const sectionKey = rawKey.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const sectionTitle = (params.title || (rawKey.toLowerCase() === 'syllabus' ? 'Exam Syllabus' : rawKey)).replace(/\\n/g, ' ');

  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const spinAnim = useRef(new Animated.Value(0)).current;

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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
      const cacheKey = `section_items_${sectionKey}`;
      const [cachedCats, cachedItems] = await Promise.all([
        getCachedData<any[]>('catalog_categories'),
        getCachedData<any[]>(cacheKey),
      ]);

      if (cachedCats && cachedCats.length > 0) setCategories(cachedCats);
      if (cachedItems && cachedItems.length > 0) {
        setItems(cachedItems);
        setLoading(false);
      }

      // Fresh Network Fetch
      const [catsRes, subsRes, examsRes, foldersRes, seriesRes, materialsRes] = await Promise.allSettled([
        apiClient.get('/categories?active=true'),
        apiClient.get('/subcategories?active=true'),
        apiClient.get('/exams?active=true'),
        apiClient.get('/folders'),
        apiClient.get('/test-series'),
        apiClient.get('/materials'),
      ]);

      const catList: any[] = [];
      if (catsRes.status === 'fulfilled' && Array.isArray(catsRes.value?.data)) {
        catsRes.value.data.forEach((c: any) => {
          if (!catList.some((item) => item.id === c.id)) {
            catList.push({ id: c.id, name: c.name });
          }
        });
      }

      if (catList.length > 0) {
        setCategories(catList);
        setCachedData('catalog_categories', catList);
      }

      let allSectionItems: any[] = [];
      const cleanSearchName = sectionTitle.toLowerCase().replace(/courses|tests|test/g, '').trim();

      // Filter Folders assigned to this section
      if (foldersRes.status === 'fulfilled' && foldersRes.value?.data) {
        const folderData = Array.isArray(foldersRes.value.data) ? foldersRes.value.data : [];
        const matchedFolders = folderData.filter((f: any) => {
          const sec = (f.icon || '').toUpperCase();
          const name = (f.name || '').toLowerCase();
          return (
            sec === sectionKey ||
            sec === String(params.id).toUpperCase() ||
            (sectionKey === 'CHAPTER_WISE' && (name.includes('chapter') || name.includes('topic') || name.includes('cdp'))) ||
            (sectionKey === 'SYLLABUS' && (name.includes('syllabus') || name.includes('curriculum'))) ||
            (cleanSearchName && name.includes(cleanSearchName))
          );
        }).map((f: any) => ({
          ...f,
          itemType: 'folder',
        }));
        allSectionItems = [...allSectionItems, ...matchedFolders];
      }

      // Filter Test Series explicitly assigned to this section
      if (seriesRes.status === 'fulfilled' && seriesRes.value?.data) {
        const seriesData = Array.isArray(seriesRes.value.data) ? seriesRes.value.data : [];
        const matchedSeries = seriesData.filter((s: any) => {
          const cat = (s.category || '').toUpperCase();
          const title = (s.title || s.name || '').toLowerCase();
          return (
            cat === sectionKey ||
            cat === String(params.id).toUpperCase() ||
            (sectionKey === 'CHAPTER_WISE' && (title.includes('chapter') || title.includes('topic') || title.includes('cdp'))) ||
            (sectionKey === 'SYLLABUS' && (title.includes('syllabus') || title.includes('curriculum'))) ||
            (cleanSearchName && title.includes(cleanSearchName))
          );
        }).map((s: any) => ({
          ...s,
          name: s.title || s.name,
          image: s.thumbnail || s.image,
          itemType: 'series',
        }));
        allSectionItems = [...allSectionItems, ...matchedSeries];
      }

      // Filter Study Materials / PDFs assigned to this section
      if (materialsRes.status === 'fulfilled' && materialsRes.value?.data) {
        const materialData = Array.isArray(materialsRes.value.data) ? materialsRes.value.data : [];
        const matchedMaterials = materialData.filter((m: any) => {
          const type = (m.type || '').toUpperCase();
          const title = (m.title || m.name || '').toLowerCase();
          return (
            type === sectionKey ||
            type === String(params.id).toUpperCase() ||
            (sectionKey === 'CHAPTER_WISE' && (type === 'CHAPTER_WISE' || title.includes('chapter') || title.includes('topic') || title.includes('cdp'))) ||
            (sectionKey === 'SYLLABUS' && (type === 'SYLLABUS' || title.includes('syllabus') || title.includes('curriculum'))) ||
            (sectionKey === 'FREE_TEST' && (type === 'FREE_TEST' || type === 'FREE' || title.includes('free'))) ||
            (cleanSearchName && title.includes(cleanSearchName))
          );
        }).map((m: any) => ({
          ...m,
          name: m.title || m.name,
          image: m.thumbnail || m.image,
          itemType: 'material',
        }));
        allSectionItems = [...allSectionItems, ...matchedMaterials];
      }

      setItems(allSectionItems);
      setCachedData(cacheKey, allSectionItems);
    } catch (error) {
      console.log('Error loading section items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sectionKey, sectionTitle, params.id]);

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

    if (selectedCategoryId !== 'ALL') {
      const selectedCat = categories.find((c) => c.id === selectedCategoryId);
      const catName = selectedCat?.name?.toLowerCase() || '';

      result = result.filter((item) => {
        if (
          item.categoryId === selectedCategoryId ||
          item.category === selectedCategoryId ||
          item.examId === selectedCategoryId ||
          item.subcategoryId === selectedCategoryId
        ) {
          return true;
        }

        if (catName) {
          const itemName = (item.name || item.title || '').toLowerCase();
          const itemDesc = (item.description || '').toLowerCase();
          const words = catName.split(/[\s-]+/).filter((w: string) => w.length > 2);
          if (words.some((w: string) => itemName.includes(w) || itemDesc.includes(w))) {
            return true;
          }
        }
        return false;
      });
    }

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
      const fileUrl = item.pdfUrl || item.fileUrl || item.url;
      if (fileUrl) {
        Linking.openURL(fileUrl).catch((err) => console.error('Failed to open PDF:', err));
      }
    } else {
      router.push(`/explore/folder/${item.id}` as any);
    }
  };

  const renderCard = ({ item }: { item: any }) => {
    const isMaterial = item.itemType === 'material';
    const itemImage =
      item.image ||
      item.thumbnail ||
      item.imageUrl ||
      (typeof item.icon === 'string' && item.icon.startsWith('http') ? item.icon : null);
    const isFree = item.isFree || item.isDemo || item.price === 0 || !item.isPaid;

    if (isMaterial) {
      return (
        <TouchableOpacity
          key={`material_${item.id}`}
          style={styles.testCardContainer}
          activeOpacity={0.88}
          onPress={() => handlePressItem(item)}
        >
          {/* Left: Pale Mint/Blue Icon Container */}
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

          {/* Middle: Title & Metadata */}
          <View style={styles.testCardDetails}>
            <View style={styles.testCardTitleRow}>
              <Text style={styles.testCardTitle} numberOfLines={2}>
                {item.name || item.title}
              </Text>
            </View>

            <View style={styles.testCardMetaRow}>
              <Text style={styles.testCardMetaTextBold}>{sectionTitle}</Text>
              <Text style={styles.testCardMetaDot}>•</Text>
              <Text style={styles.testCardMetaText}>
                {item.type || 'Document'}
              </Text>
            </View>
          </View>

          {/* Right: Pill Button */}
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
              <BookOpen size={30} color="#002D72" />
            </View>
          )}
          <View style={styles.newBadge}>
            <View style={styles.newBadgeDot} />
            <Text style={styles.newBadgeText}>{isFree ? 'Free' : sectionTitle}</Text>
          </View>
        </View>

        {/* Right Side: Content & Action Button */}
        <View style={styles.cardInfo}>
          <Text style={styles.folderCardTitle} numberOfLines={2}>
            {item.name || item.title}
          </Text>

          <View style={styles.priceRow}>
            {isFree ? (
              <Text style={styles.finalPrice}>FREE</Text>
            ) : item.discountPrice && item.discountPrice > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.finalPrice}>₹{item.discountPrice}</Text>
                {item.price && item.price > item.discountPrice && (
                  <Text style={styles.originalPrice}>₹{item.price}</Text>
                )}
              </View>
            ) : item.price && item.price > 0 ? (
              <Text style={styles.finalPrice}>₹{item.price}</Text>
            ) : (
              <Text style={styles.finalPrice}>FREE</Text>
            )}
          </View>

          <View style={styles.btnRow}>
            <View style={styles.buyBtn}>
              <Text style={styles.buyBtnText}>{isFree ? 'Open' : 'Explore'}</Text>
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
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={21} color="#002D72" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {sectionTitle}
            </Text>
            <Text style={styles.headerSub}>Explore Content & Resources</Text>
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
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={18} color="#002D72" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search in ${sectionTitle}...`}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Category Filter Chips Horizontal Bar */}
      {categories.length > 0 && (
        <View style={styles.categoriesSection}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id: 'ALL', name: 'All' }, ...categories]}
            keyExtractor={(cat) => cat.id}
            contentContainerStyle={styles.categoryChipsList}
            renderItem={({ item: cat }) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.75}
                  onPress={() => setSelectedCategoryId(cat.id)}
                  style={[
                    styles.categoryChip,
                    isSelected && styles.categoryChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Section Sub-heading */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{sectionTitle.toUpperCase()}</Text>
        <Text style={styles.sectionCount}>{filteredItems.length} Available</Text>
      </View>

      {/* Content FlatList */}
      {loading && items.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0072FF" />
          <Text style={styles.loadingText}>Loading {sectionTitle}...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => `${item.itemType}_${item.id}`}
          renderItem={renderCard}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0072FF', '#00C853']}
              tintColor="#0072FF"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <FileText size={32} color="#002D72" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? `No ${sectionTitle} Found` : 'Coming Soon 🚀'}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? `No items match "${searchQuery}". Try a different keyword.`
                  : `${sectionTitle} study materials and resources are being updated. Check back shortly!`}
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
    gap: 12,
    flex: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#002D72',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#002D72',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#002D72',
    fontWeight: '600',
  },
  categoriesSection: {
    backgroundColor: '#F8FAFC',
    paddingBottom: 8,
  },
  categoryChipsList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#002D72',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryChipActive: {
    backgroundColor: '#002D72',
    borderColor: '#001A44',
  },
  categoryChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#002D72',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionCount: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 32,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  thumbnailContainer: {
    width: 148,
    height: 100,
    backgroundColor: '#EEF6FF',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF6FF',
    width: '100%',
    height: '100%',
  },
  newBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderBottomRightRadius: 8,
    zIndex: 10,
  },
  newBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
    marginRight: 4,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 4,
    paddingRight: 6,
    gap: 4,
  },
  folderCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  finalPrice: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#059669',
  },
  originalPrice: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  buyBtn: {
    backgroundColor: '#00C853',
    borderRadius: 8,
    paddingVertical: 4.5,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#002D72',
    marginBottom: 6,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 19,
  },
  testCardContainer: {
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
  testCardDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  testCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  testCardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  testCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  testCardMetaTextBold: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  testCardMetaDot: {
    fontSize: 11,
    color: '#CBD5E1',
  },
  testCardMetaText: {
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
