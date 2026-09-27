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
import { BlurView } from 'expo-blur';
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
  { id: '1', title: 'MY TESTS', icon: 'ClipboardList', color: '#0072FF', url: '/(tabs)/purchases' },
  { id: '2', title: 'FREE TESTS', icon: 'BookOpen', color: '#059669', url: '/free-tests' },
  { id: '3', title: 'CHAPTER WISE TEST', icon: 'Layers', color: '#D97706', url: '/chapter-tests' },
  { id: '4', title: 'SYLLABUS', icon: 'FileText', color: '#E11D48', url: '/syllabus' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [banners, setBanners] = useState<any[]>(BANNERS);
  const [quickActions, setQuickActions] = useState<any[]>(QUICK_ACTIONS_FALLBACK);
  const [refreshing, setRefreshing] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.025,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, []);

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
      case 'Video': return <Video size={24} color={iconColor} strokeWidth={2.2} />;
      case 'FileText': return <FileText size={24} color={iconColor} strokeWidth={2.2} />;
      case 'ClipboardList': return <ClipboardList size={24} color={iconColor} strokeWidth={2.2} />;
      case 'ShoppingBag': return <ShoppingBag size={24} color={iconColor} strokeWidth={2.2} />;
      case 'BookOpen': return <BookOpen size={24} color={iconColor} strokeWidth={2.2} />;
      case 'GraduationCap': return <GraduationCap size={24} color={iconColor} strokeWidth={2.2} />;
      case 'BookCheck': return <BookCheck size={24} color={iconColor} strokeWidth={2.2} />;
      case 'Share2': return <Share2 size={24} color={iconColor} strokeWidth={2.2} />;
      case 'PlayCircle': return <PlayCircle size={24} color={iconColor} strokeWidth={2.2} />;
      case 'Calendar': return <Calendar size={24} color={iconColor} strokeWidth={2.2} />;
      case 'Award': return <Award size={24} color={iconColor} strokeWidth={2.2} />;
      case 'Users': return <Users size={24} color={iconColor} strokeWidth={2.2} />;
      case 'TrendingUp': return <TrendingUp size={24} color={iconColor} strokeWidth={2.2} />;
      case 'Layers': return <Layers size={24} color={iconColor} strokeWidth={2.2} />;
      default: return <BookOpen size={24} color={iconColor} strokeWidth={2.2} />;
    }
  };

  const handlePressUrl = (url?: string) => {
    if (!url) return;
    const trimmed = url.trim();
    if (/^(https?:\/\/|youtube\.com|youtu\.be|www\.)/i.test(trimmed)) {
      const fullUrl = /^(https?:\/\/)/i.test(trimmed) ? trimmed : `https://${trimmed}`;
      Linking.openURL(fullUrl).catch((err) => console.error('Failed to open URL:', err));
    } else if (trimmed === '/(tabs)/purchases' || trimmed === '/purchases') {
      router.push('/purchases' as any);
    } else {
      router.push(trimmed as any);
    }
  };

  const handlePressQuickAction = (action: any) => {
    const titleLower = (action.title || '').toLowerCase();
    const url = action.url?.trim();

    if (titleLower.includes('syllabus')) {
      router.push('/syllabus' as any);
      return;
    }

    if (url) {
      if (/^(https?:\/\/|youtube\.com|youtu\.be|www\.)/i.test(url)) {
        const fullUrl = /^(https?:\/\/)/i.test(url) ? url : `https://${url}`;
        Linking.openURL(fullUrl).catch((err) => console.error('Failed to open URL:', err));
        return;
      } else if (url === '/(tabs)/purchases' || url === '/purchases') {
        router.push('/purchases' as any);
        return;
      } else {
        router.push(url as any);
        return;
      }
    }

    // Default: Open dynamic dedicated section catalog screen!
    const key = (action.title || action.id || 'SECTION')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_');
    router.push({
      pathname: `/section/${key}` as any,
      params: {
        title: action.title,
        icon: action.icon,
        color: action.color,
      },
    });
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
              source={require('../../../assets/images/newlogo.jpeg')}
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

        {/* "Add Test Series" Button with matching Gradient Border */}
        <Animated.View style={[styles.addTestSeriesWrapper, { transform: [{ scale: pulseAnim }] }]}>
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => router.push('/exams' as any)}
            style={styles.addTestSeriesTouchable}
          >
            <LinearGradient
              colors={['#0072FF', '#00C853']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addTestSeriesGradientBorder}
            >
              <View style={styles.addTestSeriesInner}>
                <View style={styles.addTestSeriesLeft}>
                  <View style={styles.addTestSeriesIconBox}>
                    <Sparkles color="#0072FF" size={20} />
                  </View>
                  <Text style={styles.addTestSeriesText}>Add Test Series</Text>
                </View>
                <View style={styles.addTestSeriesArrowPill}>
                  <ChevronRight color="#00C853" size={20} strokeWidth={2.5} />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Quick Action Grid (My Tests, Free Tests, Chapter Tests, Syllabus) */}
        <View style={styles.actionGrid}>
          {quickActions.map((action, idx) => (
            <TouchableOpacity
              key={action.id || idx}
              style={styles.actionCardWrapper}
              activeOpacity={0.82}
              onPress={() => handlePressQuickAction(action)}
            >
              <LinearGradient
                colors={['#0072FF', '#00C853']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionCardGradientBorder}
              >
                <View style={styles.actionCardInner}>
                  <View style={[styles.actionIconBox, { backgroundColor: '#F1F5F9' }]}>
                    {renderIcon(action.icon, action.color || '#0072FF')}
                  </View>
                  <Text style={styles.actionTitle} numberOfLines={2}>
                    {action.title ? action.title.replace('\\n', '\n') : ''}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Slogan Banner */}
        <View style={styles.trustCard}>
          <TrendingUp size={24} color="#0072FF" />
          <View style={styles.trustTextContainer}>
            <Text style={styles.trustTitle}>Prep Smarter, Score Higher</Text>
            <Text style={styles.trustSubtitle}>Real exam simulation with detailed solutions & all-Jharkhand rank analysis.</Text>
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
    paddingVertical: 10,
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
    height: 54,
    width: 195,
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
  actionCardWrapper: {
    width: (width - 44) / 2,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 3,
  },
  actionCardGradientBorder: {
    padding: 1.8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  actionCardInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12.2,
    paddingHorizontal: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 74,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  actionTitle: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 17,
    letterSpacing: -0.2,
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
    fontSize: 13.5,
    fontWeight: '800',
    color: '#002D72',
    letterSpacing: 0.2,
  },
  trustSubtitle: {
    fontSize: 11.5,
    color: '#2563EB',
    marginTop: 2,
    fontWeight: '500',
    lineHeight: 16,
  },
  addTestSeriesWrapper: {
    marginHorizontal: 16,
    marginBottom: 14,
    marginTop: 4,
  },
  addTestSeriesTouchable: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  addTestSeriesGradientBorder: {
    padding: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  addTestSeriesInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addTestSeriesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addTestSeriesIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addTestSeriesArrowPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTestSeriesText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#002D72',
    letterSpacing: 0.4,
  },
});
