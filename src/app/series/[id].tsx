import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Animated,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  PlayCircle,
  Clock,
  FileText,
  ArrowLeft,
  Award,
  Sparkles,
  Zap,
  Languages,
  TrendingUp,
  BookOpen,
  RotateCw,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApiBaseUrl, fetchUserAttempts, getCachedData, setCachedData, prefetchMultipleTests } from '../../services/api';

export default function SeriesDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [series, setSeries] = useState<any>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [userAttempts, setUserAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [globalMaxAttempts, setGlobalMaxAttempts] = useState<number>(3);
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const initInstantData = async () => {
      // 1. Instant Cache Load
      try {
        const [cachedAllSeries, cachedTests] = await Promise.all([
          getCachedData<any[]>('test_series'),
          getCachedData<any[]>(`series_tests_${id}`),
        ]);

        if (cachedAllSeries && Array.isArray(cachedAllSeries)) {
          const matched = cachedAllSeries.find((s: any) => s.id === id);
          if (matched) {
            setSeries(matched);
            setLoading(false);
          }
        }
        if (cachedTests && Array.isArray(cachedTests) && cachedTests.length > 0) {
          setTests(cachedTests);
          setLoading(false);
        }
      } catch (e) {
        // Fallback to network
      }

      // 2. Background fresh fetch
      try {
        const [sRes, tRes, userAttData, setRes] = await Promise.all([
          fetch(`${getApiBaseUrl()}/test-series`).catch(() => null),
          fetch(`${getApiBaseUrl()}/test-series/${id}/tests`).catch(() => null),
          fetchUserAttempts().catch(() => []),
          fetch(`${getApiBaseUrl()}/settings/exam`).catch(() => null),
        ]);

        if (sRes && sRes.ok) {
          const all = await sRes.json();
          setCachedData('test_series', all);
          const item = all.find((s: any) => s.id === id);
          if (item) setSeries(item);
        }

        let currentGlobalMax = 2;
        if (setRes && setRes.ok) {
          const setJson = await setRes.json();
          if (setJson?.data?.maxAttempts !== undefined) {
            currentGlobalMax = Number(setJson.data.maxAttempts);
            setGlobalMaxAttempts(currentGlobalMax);
          }
        }

        if (tRes && tRes.ok) {
          const tList = await tRes.json();
          if (Array.isArray(tList)) {
            const formatted = tList.map((t) => ({
              ...t,
              maxAttempts: t.maxAttempts !== undefined ? t.maxAttempts : currentGlobalMax,
            }));
            setTests(formatted);
            setCachedData(`series_tests_${id}`, formatted);

            // Auto-prefetch test data in background so "Start" loads instantly
            const testIds = formatted.map((t: any) => t.id).filter(Boolean);
            prefetchMultipleTests(testIds);
          }
        }

        if (Array.isArray(userAttData)) {
          setUserAttempts(userAttData);
        }
      } catch (err) {
        console.error('Error loading series data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      initInstantData();
    }
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00C853" />
      </View>
    );
  }

  if (!series) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerSimple}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft color="#1E293B" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerSimpleTitle}>Series Not Found</Text>
        </View>
        <View style={styles.center}>
          <Text style={{ color: '#64748B' }}>Unable to load this test series.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const activeTest = tests.find((t) => t.id === selectedTestId) || tests[0];
  const matchingAttempts = userAttempts.filter(
    (a: any) => a.testId === activeTest?.id || a.test?.id === activeTest?.id
  );
  const completedAttempts = matchingAttempts.filter((a: any) => a.status === 'SUBMITTED');
  const attemptCount = completedAttempts.length;
  const maxAttempts =
    activeTest?.maxAttempts !== undefined ? activeTest.maxAttempts : globalMaxAttempts;
  const isExhausted = maxAttempts > 0 && attemptCount >= maxAttempts;
  const latestCompletedAttemptId = completedAttempts[0]?.id;

  const handleStartActiveTest = () => {
    if (!activeTest) return;
    if (isExhausted) {
      if (latestCompletedAttemptId) {
        router.push(
          `/test/${activeTest.id}?viewMode=review&attemptId=${latestCompletedAttemptId}`
        );
      }
      return;
    }
    router.push(`/test/${activeTest.id}`);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      })
    ).start();

    try {
      const [sRes, tRes, userAttData, setRes] = await Promise.all([
        fetch(`${getApiBaseUrl()}/test-series`).catch(() => null),
        fetch(`${getApiBaseUrl()}/test-series/${id}/tests`).catch(() => null),
        fetchUserAttempts().catch(() => []),
        fetch(`${getApiBaseUrl()}/settings/exam`).catch(() => null),
      ]);

      if (sRes && sRes.ok) {
        const all = await sRes.json();
        setCachedData('test_series', all);
        const item = all.find((s: any) => s.id === id);
        if (item) setSeries(item);
      }

      let currentGlobalMax = 2;
      if (setRes && setRes.ok) {
        const setJson = await setRes.json();
        if (setJson?.data?.maxAttempts !== undefined) {
          currentGlobalMax = Number(setJson.data.maxAttempts);
          setGlobalMaxAttempts(currentGlobalMax);
        }
      }

      if (tRes && tRes.ok) {
        const tList = await tRes.json();
        if (Array.isArray(tList)) {
          const formatted = tList.map((t) => ({
            ...t,
            maxAttempts: t.maxAttempts !== undefined ? t.maxAttempts : currentGlobalMax,
          }));
          setTests(formatted);
          setCachedData(`series_tests_${id}`, formatted);
        }
      }

      if (Array.isArray(userAttData)) {
        setUserAttempts(userAttData);
      }
    } catch (e) {
      console.warn('Series refresh error', e);
    } finally {
      setTimeout(() => {
        spinAnim.stopAnimation();
        spinAnim.setValue(0);
        setRefreshing(false);
      }, 400);
    }
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.topNavBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color="#1E293B" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={styles.refreshBtn}
            activeOpacity={0.7}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <RotateCw size={17} color="#0072FF" />
            </Animated.View>
          </TouchableOpacity>

          <View style={styles.mockBadge}>
            <Sparkles size={12} color="#00C853" style={{ marginRight: 4 }} />
            <Text style={styles.mockBadgeText}>MOCK TEST</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0072FF']} />
        }
      >
        {/* Empty State */}
        {tests.length === 0 ? (
          <View style={styles.emptyCard}>
            <FileText size={40} color="#CBD5E1" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyTitle}>No Exam Papers Available</Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.emptyBackBtn}>
              <Text style={styles.emptyBackBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Multi-Paper Tabs if Multiple Papers */}
            {tests.length > 1 && (
              <View style={styles.paperTabsContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.paperTabsList}
                >
                  {tests.map((t, idx) => {
                    const isSelected = activeTest?.id === t.id;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => setSelectedTestId(t.id)}
                        style={[
                          styles.paperTab,
                          isSelected && styles.paperTabSelected,
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.paperTabText,
                            isSelected && styles.paperTabTextSelected,
                          ]}
                        >
                          Paper {t.testNumber || idx + 1}: {t.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Clean Test Title (Single Title - Not Written Twice) */}
            <View style={styles.titleSection}>
              <Text style={styles.testMainTitle}>
                {activeTest?.title || series?.title || 'Mock Test'}
              </Text>
            </View>

            {/* 3 Simple Green Stat Cards Matching Brand Logo (#00C853) */}
            <View style={styles.statsRow}>
              {/* Questions */}
              <View style={styles.statBox}>
                <View style={styles.statIconBox}>
                  <FileText size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.statNum}>{activeTest?.totalQuestions || 0}</Text>
                <Text style={styles.statLabel}>QUESTIONS</Text>
              </View>

              {/* Duration */}
              <View style={styles.statBox}>
                <View style={styles.statIconBox}>
                  <Clock size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.statNum}>{activeTest?.duration || 60}</Text>
                <Text style={styles.statLabel}>MINUTES</Text>
              </View>

              {/* Marks */}
              <View style={styles.statBox}>
                <View style={styles.statIconBox}>
                  <Award size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.statNum}>{activeTest?.totalMarks || 100}</Text>
                <Text style={styles.statLabel}>TOTAL MARKS</Text>
              </View>
            </View>

            {/* 4 Feature Pills */}
            <View style={styles.featuresGrid}>
              <View style={styles.featurePill}>
                <Zap size={14} color="#00C853" style={{ marginRight: 6 }} />
                <Text style={styles.featurePillText}>Instant Scorecard</Text>
              </View>
              <View style={styles.featurePill}>
                <Languages size={14} color="#00C853" style={{ marginRight: 6 }} />
                <Text style={styles.featurePillText}>English / Hindi</Text>
              </View>
              <View style={styles.featurePill}>
                <TrendingUp size={14} color="#00C853" style={{ marginRight: 6 }} />
                <Text style={styles.featurePillText}>Rank & Analysis</Text>
              </View>
              <View style={styles.featurePill}>
                <BookOpen size={14} color="#00C853" style={{ marginRight: 6 }} />
                <Text style={styles.featurePillText}>Step Solutions</Text>
              </View>
            </View>

            {/* Attempts Info Box */}
            <View style={styles.attemptInfoBox}>
              <View
                style={[
                  styles.attemptIconBox,
                  { backgroundColor: isExhausted ? '#FEE2E2' : '#ECFDF5' },
                ]}
              >
                <Sparkles size={16} color={isExhausted ? '#DC2626' : '#00C853'} />
              </View>
              <View style={styles.attemptTextWrap}>
                <Text style={styles.attemptMainTitle}>
                  {isExhausted
                    ? `All ${maxAttempts} Attempts Completed`
                    : attemptCount > 0
                    ? `Attempt ${attemptCount + 1} of ${maxAttempts}`
                    : `${maxAttempts > 0 ? `${maxAttempts} Attempts Allowed` : 'Unlimited Attempts'}`}
                </Text>
                <Text style={styles.attemptSubTitle}>
                  {isExhausted
                    ? 'Review full scorecard and step-by-step solutions.'
                    : 'Timer begins immediately once started.'}
                </Text>
              </View>
            </View>

            {/* Action Buttons - Directly After Attempts Box */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionBackBtn}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <ArrowLeft size={16} color="#334155" />
                <Text style={styles.actionBackBtnText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionStartBtn,
                  isExhausted && !latestCompletedAttemptId && styles.actionDisabledBtn,
                ]}
                onPress={handleStartActiveTest}
                activeOpacity={0.85}
              >
                <PlayCircle size={19} color="#FFFFFF" />
                <Text style={styles.actionStartBtnText}>
                  {isExhausted
                    ? 'View Result'
                    : attemptCount > 0
                    ? 'Re-Attempt Test'
                    : 'Start Test'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  topNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  refreshBtn: {
    padding: 7,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  mockBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00C853',
    letterSpacing: 0.8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 30,
    gap: 16,
  },
  paperTabsContainer: {
    marginBottom: 4,
  },
  paperTabsList: {
    gap: 8,
  },
  paperTab: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  paperTabSelected: {
    backgroundColor: '#00C853',
  },
  paperTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  paperTabTextSelected: {
    color: '#FFFFFF',
  },
  titleSection: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  testMainTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 34,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 200, 83, 0.4)',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#00C853',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNum: {
    fontSize: 24,
    fontWeight: '900',
    color: '#006027',
    lineHeight: 28,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#008A38',
    textTransform: 'uppercase',
    marginTop: 4,
    letterSpacing: 0.6,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  featurePill: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  featurePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  attemptInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  attemptIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attemptTextWrap: {
    flex: 1,
  },
  attemptMainTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  attemptSubTitle: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  actionBackBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  actionBackBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  actionStartBtn: {
    flex: 2,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#00C853',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#00C853',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  actionStartBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  actionDisabledBtn: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  emptyBackBtn: {
    marginTop: 14,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  emptyBackBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  headerSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerSimpleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 12,
  },
});
