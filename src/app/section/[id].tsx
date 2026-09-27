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

  const sectionKey = (params.id || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const sectionTitle = (params.title || params.id || 'Section Catalog').replace(/\\n/g, ' ');
  const sectionColor = params.color || '#0072FF';

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

  const renderSectionIcon = () => {
    const iconProps = { size: 18, color: '#ffffff', strokeWidth: 2.2 };
    switch (params.icon) {
      case 'Calendar': return <Calendar {...iconProps} />;
      case 'PlayCircle': return <PlayCircle {...iconProps} />;
      case 'Video': return <Video {...iconProps} />;
      case 'Award': return <Award {...iconProps} />;
      case 'Layers': return <Layers {...iconProps} />;
      case 'FileText': return <FileText {...iconProps} />;
      case 'GraduationCap': return <GraduationCap {...iconProps} />;
      case 'ClipboardList': return <ClipboardList {...iconProps} />;
      case 'Sparkles': return <Sparkles {...iconProps} />;
      default: return <BookOpen {...iconProps} />;
    }
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
      const [catsRes, foldersRes, seriesRes, materialsRes] = await Promise.allSettled([
        apiClient.get('/categories?active=true'),
        apiClient.get('/folders'),
        apiClient.get('/test-series'),
        apiClient.get('/materials'),
      ]);

      if (catsRes.status === 'fulfilled' && catsRes.value?.data) {
        const catData = Array.isArray(catsRes.value.data) ? catsRes.value.data : [];
        setCategories(catData);
        setCachedData('catalog_categories', catData);
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
            (sectionKey === 'SYLLABUS' && (name.includes('syllabus') || name.includes('curriculum')))
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
            (sectionKey === 'SYLLABUS' && (title.includes('syllabus') || title.includes('curriculum')))
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
            (sectionKey === 'FREE_TEST' && (type === 'FREE_TEST' || type === 'FREE' || title.includes('free')))
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

  const renderCard = ({ item }: { item: any }) => {
    const isFolder = item.itemType === 'folder';
    const isMaterial = item.itemType === 'material';
    const isPaid = item.isPaid && item.price > 0;
    const finalPrice = isPaid ? (item.discountPrice || item.price) : 0;
    const originalPrice = item.price || 0;
    const discountPercent = isPaid && originalPrice > finalPrice
      ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
      : 0;

    if (isMaterial) {
      return (
        <TouchableOpacity
          key={`mat_${item.id}`}
          style={styles.compactDocCard}
          activeOpacity={0.88}
          onPress={() => handlePressItem(item)}
        >
          {/* Left: Pale Mint/Green Icon Container */}
          <View style={styles.mintDocIconBox}>
            {item.image ? (
              <Image
                source={{ uri: item.image }}
                style={styles.mintDocIconImage}
                contentFit="cover"
              />
            ) : (
              <FileText size={22} color="#059669" strokeWidth={2.2} />
            )}
          </View>

          {/* Middle: Title & Metadata */}
          <View style={styles.compactDocDetails}>
            <Text style={styles.compactDocTitle} numberOfLines={1}>
              {item.name || item.title}
            </Text>
            <View style={styles.compactDocMetaRow}>
              <Text style={styles.compactDocMetaBold}>{item.type || 'PDF'}</Text>
              <Text style={styles.compactDocMetaDot}>•</Text>
              <Text style={styles.compactDocMetaSub}>Study Material</Text>
            </View>
          </View>

          {/* Right: Green Pill Action Button */}
          <View style={styles.viewPdfPillBtn}>
            <Text style={styles.viewPdfPillBtnText}>View PDF</Text>
            <ChevronRight size={13} color="#FFFFFF" strokeWidth={3} />
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.cardContainer}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => handlePressItem(item)}
          style={styles.cardTouchable}
        >
          {/* Card Thumbnail */}
          <View style={styles.thumbnailWrapper}>
            {item.image ? (
              <Image
                source={{ uri: item.image }}
                style={styles.thumbnailImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.thumbnailPlaceholder, { backgroundColor: isFolder ? '#EFF6FF' : isMaterial ? '#FFF1F2' : '#F0FDF4' }]}>
                {isFolder ? (
                  <Folder size={38} color="#2563EB" strokeWidth={1.8} />
                ) : isMaterial ? (
                  <FileText size={38} color="#E11D48" strokeWidth={1.8} />
                ) : (
                  <BookOpen size={38} color="#059669" strokeWidth={1.8} />
                )}
              </View>
            )}

            {/* Top Badges */}
            <View style={styles.badgeRow}>
              {isPaid ? (
                <View style={styles.paidBadge}>
                  <Text style={styles.paidBadgeText}>₹{finalPrice}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Card Content Info */}
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.name || item.title}
            </Text>

            <View style={styles.cardMetaRow}>
              {isFolder ? (
                <View style={styles.folderMetaPill}>
                  <Folder size={11} color="#2563EB" strokeWidth={2} />
                  <Text style={styles.folderMetaText}>Folder</Text>
                </View>
              ) : isMaterial ? (
                <View style={[styles.folderMetaPill, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }]}>
                  <FileText size={11} color="#E11D48" strokeWidth={2} />
                  <Text style={[styles.folderMetaText, { color: '#E11D48' }]}>{item.type || 'PDF Document'}</Text>
                </View>
              ) : (
                <View style={styles.seriesMetaPill}>
                  <BookOpen size={11} color="#059669" strokeWidth={2} />
                  <Text style={styles.seriesMetaText}>
                    {item.totalTests || item._count?.tests || item.testsCount || 1} Tests
                  </Text>
                </View>
              )}

              {isPaid && discountPercent > 0 && (
                <View style={styles.discountPill}>
                  <Text style={styles.discountPillText}>{discountPercent}% OFF</Text>
                </View>
              )}
            </View>

            {/* Bottom Action */}
            <View style={styles.cardFooter}>
              <View style={[styles.openButton, { backgroundColor: sectionColor }]}>
                <Text style={styles.openButtonText}>
                  {isFolder ? 'Explore Folder' : isMaterial ? 'View PDF' : 'Open Series'}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <View style={[styles.headerIconBadge, { backgroundColor: sectionColor }]}>
            {renderSectionIcon()}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {sectionTitle}
            </Text>
            <Text style={styles.headerSubtitle}>
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} available
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          activeOpacity={0.7}
          disabled={refreshing}
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <RotateCw size={19} color={sectionColor} />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search in ${sectionTitle}...`}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Category Filter Chips */}
      {categories.length > 0 && (
        <View style={styles.categoryScrollContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id: 'ALL', name: 'All' }, ...categories]}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.categoryList}
            renderItem={({ item }) => {
              const isSelected = selectedCategoryId === item.id;
              return (
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    isSelected && [styles.categoryChipActive, { backgroundColor: sectionColor, borderColor: sectionColor }],
                  ]}
                  onPress={() => setSelectedCategoryId(item.id)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && styles.categoryChipTextActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Main Content List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={sectionColor} />
          <Text style={styles.loadingText}>Loading {sectionTitle}...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[sectionColor]}
              tintColor={sectionColor}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <BookOpen size={40} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No items found in {sectionTitle}</Text>
              <Text style={styles.emptySubtitle}>
                Folders assigned to &quot;{sectionTitle}&quot; in the Admin Explorer will appear here automatically.
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
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  categoryScrollContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
  },
  categoryList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    borderColor: 'transparent',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    gap: 14,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTouchable: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    alignItems: 'center',
  },
  thumbnailWrapper: {
    width: 100,
    height: 85,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    position: 'absolute',
    top: 6,
    left: 6,
  },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  freeBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  paidBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paidBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 18,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  folderMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  folderMetaText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  seriesMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  seriesMetaText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  discountPill: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  discountPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#E11D48',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  openButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  openButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  compactDocCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 11,
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
  mintDocIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mintDocIconImage: {
    width: '100%',
    height: '100%',
  },
  compactDocDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  compactDocTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 18,
    marginBottom: 2,
  },
  compactDocMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  compactDocMetaBold: {
    fontSize: 11,
    fontWeight: '800',
    color: '#002D72',
  },
  compactDocMetaDot: {
    fontSize: 11,
    color: '#CBD5E1',
  },
  compactDocMetaSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  viewPdfPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C853',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    gap: 3,
  },
  viewPdfPillBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
});
