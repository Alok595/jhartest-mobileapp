import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Linking,
  RefreshControl,
  Animated,
  Easing,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { apiClient, getCachedData, setCachedData } from '../../services/api';
import {
  Bell,
  RotateCw,
  Menu,
  PlayCircle,
  Calendar,
  FileText,
  Video,
  Sparkles,
  BookOpen,
  Award,
  ChevronRight,
  ChevronDown,
  Search,
  CheckCircle2,
  GraduationCap,
  BookCheck,
  ClipboardList,
  Flame,
  Users,
  TrendingUp,
  Layers,
  ShoppingBag,
  Share2,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

const BANNERS = [
  {
    id: '1',
    title: 'JSSC CGL 2026 Special Batch',
    subtitle: 'Full Mock Test + Live Discussions',
    badge: 'LIVE NOW',
    color: '#0F172A',
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: '2',
    title: 'JPSC Foundation Prelims + Mains',
    subtitle: 'By Top Jharkhand Educators',
    badge: 'NEW BATCH',
    color: '#0F766E',
    image: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&q=80&w=800',
  },
];

const QUICK_ACTIONS_FALLBACK = [
  { id: '1', title: 'Paid Video\nCourse', icon: 'Video', iconColor: '#0072FF', bgColor: '#E0F2FE', url: '' },
  { id: '2', title: 'Paid Pdf\nCourse', icon: 'FileText', iconColor: '#00C853', bgColor: '#DCFCE7', url: '' },
  { id: '3', title: 'Test Series', icon: 'ClipboardList', iconColor: '#0284C7', bgColor: '#E0F2FE', url: '' },
  { id: '4', title: 'Book Store', icon: 'ShoppingBag', iconColor: '#D97706', bgColor: '#FEF3C7', url: '' },
  { id: '5', title: 'E-Books', icon: 'BookOpen', iconColor: '#7C3AED', bgColor: '#F3E8FF', url: '' },
  { id: '6', title: 'Syllabus', icon: 'GraduationCap', iconColor: '#E11D48', bgColor: '#FFE4E6', url: '' },
  { id: '7', title: 'Previous Year\nQuestion', icon: 'BookCheck', iconColor: '#0072FF', bgColor: '#DBEAFE', url: '' },
  { id: '8', title: 'Social Media\nLinks', icon: 'Share2', iconColor: '#059669', bgColor: '#D1FAE5', url: '' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [banners, setBanners] = useState<any[]>(BANNERS);
  const [quickActions, setQuickActions] = useState<any[]>(QUICK_ACTIONS_FALLBACK);
  const [refreshing, setRefreshing] = useState(false);
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

  const fetchFreshData = async () => {
    try {
      const [bannersRes, actionsRes] = await Promise.allSettled([
        apiClient.get('/banners'),
        apiClient.get('/quick-actions'),
      ]);

      if (bannersRes.status === 'fulfilled' && bannersRes.value?.data && bannersRes.value.data.length > 0) {
        setBanners(bannersRes.value.data);
        setCachedData('home_banners', bannersRes.value.data);
      }
      if (actionsRes.status === 'fulfilled' && actionsRes.value?.data && actionsRes.value.data.length > 0) {
        const sorted = [...actionsRes.value.data].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        setQuickActions(sorted);
        setCachedData('home_quick_actions', sorted);
      }
    } catch (e) {
      console.log('Error fetching fresh home data:', e);
    }
  };

  const onRefresh = async () => {
    startSpinAnimation();
    setRefreshing(true);
    await fetchFreshData();
    setRefreshing(false);
  };

  React.useEffect(() => {
    // Instant cache load
    getCachedData<any[]>('home_banners').then(cached => {
      if (cached && cached.length > 0) setBanners(cached);
    });
    getCachedData<any[]>('home_quick_actions').then(cached => {
      if (cached && cached.length > 0) {
        const sorted = [...cached].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        setQuickActions(sorted);
      }
    });

    // Background fresh fetch
    fetchFreshData();
  }, []);

  const renderIcon = (iconName: string, iconColor = '#0072FF') => {
    switch(iconName) {
      case 'Video': return <Video size={28} color={iconColor} />;
      case 'FileText': return <FileText size={28} color={iconColor} />;
      case 'ClipboardList': return <ClipboardList size={28} color={iconColor} />;
      case 'ShoppingBag': return <ShoppingBag size={28} color={iconColor} />;
      case 'BookOpen': return <BookOpen size={28} color={iconColor} />;
      case 'GraduationCap': return <GraduationCap size={28} color={iconColor} />;
      case 'BookCheck': return <BookCheck size={28} color={iconColor} />;
      case 'Share2': return <Share2 size={28} color={iconColor} />;
      case 'PlayCircle': return <PlayCircle size={28} color={iconColor} />;
      case 'Calendar': return <Calendar size={28} color={iconColor} />;
      case 'Award': return <Award size={28} color={iconColor} />;
      case 'Users': return <Users size={28} color={iconColor} />;
      case 'TrendingUp': return <TrendingUp size={28} color={iconColor} />;
      case 'Layers': return <Layers size={28} color={iconColor} />;
      default: return <Sparkles size={28} color={iconColor} />;
    }
  };

  const handlePressUrl = (url?: string) => {
    if (!url) return;
    const trimmed = url.trim();
    if (/^(https?:\/\/|youtube\.com|youtu\.be|www\.)/i.test(trimmed)) {
      const fullUrl = /^(https?:\/\/)/i.test(trimmed) ? trimmed : `https://${trimmed}`;
      Linking.openURL(fullUrl).catch((err) => console.error('Failed to open URL:', err));
    } else {
      router.push(trimmed as any);
    }
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.brandContainer}>
            <Image
              source={require('../../../assets/images/test5.jpeg')}
              style={styles.headerFullLogo}
              contentFit="contain"
            />
          </View>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity 
            style={styles.refreshButton} 
            activeOpacity={0.7} 
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <RotateCw size={19} color="#0072FF" />
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bellButton} activeOpacity={0.7} onPress={() => router.push('/notifications')}>
            <Bell size={21} color="#1F1A14" />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>7</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
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
      >
        {/* Banner Carousel */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bannerList}
          decelerationRate="fast"
          snapToInterval={width - 32 + 12}
        >
          {banners.map((banner) => (
            <TouchableOpacity
              key={banner.id}
              activeOpacity={0.9}
              style={[styles.bannerCard, { backgroundColor: banner.color || '#0F172A' }]}
              onPress={() => handlePressUrl(banner.buttonUrl)}
            >
              <Image 
                source={{ uri: banner.imageUrl || banner.image }} 
                style={styles.bannerImage} 
                contentFit="cover"
              />
              {banner.buttonText ? (
                <View style={styles.bannerButtonContainer}>
                  <View style={styles.bannerButtonCatchy}>
                    <Sparkles size={12} color="#FDE047" style={{ marginRight: 4 }} />
                    <Text style={styles.bannerButtonTextCatchy}>{banner.buttonText}</Text>
                    <ChevronRight size={13} color="#FFFFFF" />
                  </View>
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 2-Column Action Grid with Blue-Green Gradient Border Matching Logo */}
        <View style={styles.actionGrid}>
          {quickActions.map((action) => (
            <LinearGradient
              key={action.id}
              colors={['#0072FF', '#00C853']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientCardBorder}
            >
              <TouchableOpacity
                style={styles.actionCard}
                activeOpacity={0.82}
                onPress={() => handlePressUrl(action.url)}
              >
                <View style={[styles.actionIconBox, { backgroundColor: action.bgColor || '#F1F5F9' }]}>
                  {renderIcon(action.icon, action.iconColor || action.color || '#0072FF')}
                </View>
                <Text style={styles.actionTitle} numberOfLines={2}>
                  {action.title.replace('\\n', '\n')}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          ))}
        </View>

        {/* Student Trust Banner */}
        <View style={styles.trustCard}>
          <CheckCircle2 size={24} color="#10B981" />
          <View style={styles.trustTextContainer}>
            <Text style={styles.trustTitle}>50,000+ Aspirants Trust Us</Text>
            <Text style={styles.trustSubtitle}>Real exam simulation with detailed solutions and all-Jharkhand rank.</Text>
          </View>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 6,
    marginRight: 2,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 0,
  },
  headerFullLogo: {
    height: 46,
    width: 165,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  bannerList: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  bannerCard: {
    width: width - 32,
    height: ((width - 32) * 9) / 16,
    borderRadius: 10,
    marginRight: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bannerImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  bannerButtonContainer: {
    position: 'absolute',
    right: 12,
    bottom: 12,
  },
  bannerButtonCatchy: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.75)',
  },
  bannerButtonTextCatchy: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
    marginRight: 2,
    textTransform: 'uppercase',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  gradientCardBorder: {
    width: (width - 44) / 2,
    borderRadius: 10,
    padding: 2, // 2px gradient border
    marginBottom: 14,
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 86,
  },
  actionIconBox: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
  },
  trustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  trustTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  trustTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0072FF',
  },
  trustSubtitle: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
    fontWeight: '500',
  },
});
