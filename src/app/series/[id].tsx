import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image, StatusBar, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PlayCircle, Clock, FileText, CheckCircle, ShieldAlert, ArrowLeft, ShoppingCart, Award, ChevronRight, Languages, CheckCircle2, RotateCcw } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApiBaseUrl, fetchUserAttempts, getCachedData, setCachedData } from '../../services/api';

export default function SeriesDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [series, setSeries] = useState<any>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [userAttempts, setUserAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [globalMaxAttempts, setGlobalMaxAttempts] = useState<number>(3);

  useEffect(() => {
    const initInstantData = async () => {
      // 1. Instant Cache Load (0ms click render)
      try {
        const [cachedAllSeries, cachedTests] = await Promise.all([
          getCachedData<any[]>('test_series'),
          getCachedData<any[]>(`series_tests_${id}`)
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

      // 2. Background fresh fetch (silently updates data)
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
            const formatted = tList.map(t => ({
              ...t,
              maxAttempts: t.maxAttempts !== undefined ? t.maxAttempts : currentGlobalMax
            }));
            setTests(formatted);
            setCachedData(`series_tests_${id}`, formatted);
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
        <ActivityIndicator size="large" color="#0072FF" />
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

  const isFree = series.isFree || series.price === 0 || !series.price;

  const handleStartTest = (testId: string) => {
    const test = tests.find((t) => t.id === testId);
    const matchingAttempts = userAttempts.filter((a: any) => a.testId === testId || a.test?.id === testId);
    const completedAttempts = matchingAttempts.filter((a: any) => a.status === 'SUBMITTED');
    const maxAttempts = test?.maxAttempts !== undefined ? test.maxAttempts : globalMaxAttempts;

    if (maxAttempts > 0 && completedAttempts.length >= maxAttempts) {
      const latestCompletedAttemptId = completedAttempts.length > 0 ? completedAttempts[0].id : null;
      
      Alert.alert(
        'Attempts Exhausted',
        `You have already completed all ${maxAttempts}/${maxAttempts} allowed attempts for this test. You can view your scorecard and full solutions.`,
        [
          {
            text: 'View Result & Solutions',
            onPress: () => {
              if (latestCompletedAttemptId) router.push(`/test/${testId}?viewMode=review&attemptId=${latestCompletedAttemptId}`);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    router.push(`/test/${testId}`);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0072FF" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Hero Header */}
        <View style={styles.heroHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.heroBackBtn} activeOpacity={0.7}>
            <ArrowLeft color="#FFFFFF" size={24} />
          </TouchableOpacity>
          <Text style={styles.categoryBadge}>TEST SERIES</Text>
          <Text style={styles.heroTitle}>{series.title}</Text>
          <Text style={styles.heroSubText}>Choose an exam paper below and review instructions to begin.</Text>
        </View>

        {/* Tests List Section */}
        <View style={styles.contentSection}>
          <Text style={styles.sectionHeading}>Select Exam Paper ({tests.length})</Text>
          
          {tests.length === 0 ? (
            <View style={styles.emptyCard}>
              <FileText size={36} color="#CBD5E1" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyTitle}>No exam papers available</Text>
              <Text style={styles.emptySubtitle}>Papers will appear here once published by admin.</Text>
            </View>
          ) : (
            <View style={styles.testList}>
              {tests.map((test, index) => {
                const testAttempts = userAttempts.filter((a: any) => a.testId === test.id || a.test?.id === test.id);
                const completedAttempts = testAttempts.filter((a: any) => a.status === 'SUBMITTED');
                const attemptCount = completedAttempts.length;
                const maxAttempts = test.maxAttempts !== undefined ? test.maxAttempts : globalMaxAttempts;
                const isExhausted = maxAttempts > 0 && attemptCount >= maxAttempts;
                
                const latestCompletedAttemptId = completedAttempts.length > 0 ? completedAttempts[0].id : null;

                return (
                  <TouchableOpacity
                    key={test.id}
                    style={[styles.testCard, isExhausted && styles.testCardExhausted]}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (isExhausted && latestCompletedAttemptId) {
                        router.push(`/test/${test.id}?viewMode=review&attemptId=${latestCompletedAttemptId}`);
                      } else {
                        handleStartTest(test.id);
                      }
                    }}
                  >
                    <View style={styles.testCardHeader}>
                      {isExhausted ? (
                        <View style={[styles.testBadge, styles.testBadgeExhausted]}>
                          <CheckCircle2 size={11} color="#DC2626" />
                          <Text style={styles.testBadgeTextExhausted}>{maxAttempts}/{maxAttempts} Attempts Completed</Text>
                        </View>
                      ) : attemptCount > 0 ? (
                        <View style={[styles.testBadge, styles.testBadgePartial]}>
                          <RotateCcw size={11} color="#0072FF" />
                          <Text style={styles.testBadgeTextPartial}>
                            {maxAttempts === 0 ? `Attempt ${attemptCount} Done (Unlimited)` : `Attempt ${attemptCount}/${maxAttempts} Done`}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.testBadge}>
                          <Text style={styles.testBadgeText}>
                            PAPER {test.testNumber || index + 1} • {maxAttempts === 0 ? 'Unlimited Attempts' : `${maxAttempts} Attempts`}
                          </Text>
                        </View>
                      )}

                      <View style={styles.testMeta}>
                        <Clock size={12} color="#64748B" />
                        <Text style={styles.testMetaText}>{test.duration || 120} Mins</Text>
                        <Text style={styles.testMetaDot}>•</Text>
                        <Award size={12} color="#64748B" />
                        <Text style={styles.testMetaText}>{test.totalMarks || 100} Marks</Text>
                      </View>
                    </View>

                    <Text style={styles.testTitle}>{test.title}</Text>

                    <View style={styles.testFooter}>
                      <Text style={styles.testQCount}>{test.totalQuestions || 0} Questions</Text>
                      
                      {isExhausted ? (
                        <TouchableOpacity
                          style={styles.viewResultBtnPill}
                          onPress={() => {
                            if (latestCompletedAttemptId) router.push(`/test/${test.id}?viewMode=review&attemptId=${latestCompletedAttemptId}`);
                          }}
                        >
                          <Text style={styles.viewResultBtnPillText}>View Result & Solutions</Text>
                          <ChevronRight size={14} color="#0072FF" />
                        </TouchableOpacity>
                      ) : attemptCount > 0 ? (
                        <View style={styles.attemptActionGroup}>
                          {latestCompletedAttemptId && (
                            <TouchableOpacity
                              onPress={() => router.push(`/test/${test.id}?viewMode=review&attemptId=${latestCompletedAttemptId}`)}
                              style={styles.prevResultLink}
                            >
                              <Text style={styles.prevResultLinkText}>Last Result</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={styles.startBtnPill}
                            onPress={() => handleStartTest(test.id)}
                          >
                            <Text style={styles.startBtnPillText}>
                              {maxAttempts === 0 ? 'Re-Attempt (Unlimited)' : `Re-Attempt (${maxAttempts - attemptCount} left)`}
                            </Text>
                            <PlayCircle size={14} color="#0072FF" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.startBtnPill}>
                          <Text style={styles.startBtnPillText}>Start Paper</Text>
                          <PlayCircle size={14} color="#0072FF" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Series Instructions */}
          {/* Series Instructions */}
          <View style={styles.instructionCard}>
            <View style={styles.instructionHeader}>
              <View style={styles.instructionHeaderLeft}>
                <ShieldAlert size={20} color="#0072FF" />
                <Text style={styles.instructionTitle}>Exam Instructions & Guidelines</Text>
              </View>
              <View style={styles.bilingualTag}>
                <Languages size={12} color="#0072FF" />
                <Text style={styles.bilingualTagText}>English / Hindi</Text>
              </View>
            </View>

            {/* 1. Marking Scheme Grid */}
            <Text style={styles.instSubHeading}>MARKING SCHEME (PER QUESTION)</Text>
            <View style={styles.markingSchemeRow}>
              <View style={[styles.markingTile, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <Text style={[styles.markingTileVal, { color: '#16A34A' }]}>+ Correct</Text>
                <Text style={styles.markingTileLabel}>Full Marks</Text>
              </View>
              <View style={[styles.markingTile, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[styles.markingTileVal, { color: '#DC2626' }]}>- Negative</Text>
                <Text style={styles.markingTileLabel}>Wrong Answer</Text>
              </View>
              <View style={[styles.markingTile, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                <Text style={[styles.markingTileVal, { color: '#64748B' }]}>0 Marks</Text>
                <Text style={styles.markingTileLabel}>Unattempted</Text>
              </View>
            </View>

            {/* 2. Question Status / Palette Legend */}
            <Text style={styles.instSubHeading}>QUESTION PALETTE & STATUS SYMBOLS</Text>
            <View style={styles.paletteGrid}>
              <View style={styles.paletteRowItem}>
                <View style={[styles.statusSquare, { backgroundColor: '#10B981' }]}>
                  <Text style={styles.statusSquareText}>01</Text>
                </View>
                <View style={styles.statusInfo}>
                  <Text style={styles.statusInfoTitle}>Answered</Text>
                  <Text style={styles.statusInfoDesc}>Option selected and recorded</Text>
                </View>
              </View>

              <View style={styles.paletteRowItem}>
                <View style={[styles.statusSquare, { backgroundColor: '#EF4444' }]}>
                  <Text style={styles.statusSquareText}>02</Text>
                </View>
                <View style={styles.statusInfo}>
                  <Text style={styles.statusInfoTitle}>Not Answered</Text>
                  <Text style={styles.statusInfoDesc}>Question viewed but no option chosen</Text>
                </View>
              </View>

              <View style={styles.paletteRowItem}>
                <View style={[styles.statusSquare, { backgroundColor: '#8B5CF6' }]}>
                  <Text style={styles.statusSquareText}>03</Text>
                </View>
                <View style={styles.statusInfo}>
                  <Text style={styles.statusInfoTitle}>Marked for Review</Text>
                  <Text style={styles.statusInfoDesc}>Flagged to revisit before final submit</Text>
                </View>
              </View>

              <View style={styles.paletteRowItem}>
                <View style={[styles.statusSquare, { backgroundColor: '#E2E8F0' }]}>
                  <Text style={[styles.statusSquareText, { color: '#475569' }]}>04</Text>
                </View>
                <View style={styles.statusInfo}>
                  <Text style={styles.statusInfoTitle}>Not Visited / Skipped</Text>
                  <Text style={styles.statusInfoDesc}>Question has not been opened yet</Text>
                </View>
              </View>
            </View>

            {/* 3. General Guidelines */}
            <Text style={styles.instSubHeading}>GENERAL GUIDELINES</Text>
            <View style={styles.guidelineList}>
              <View style={styles.instructionItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.instructionText}>Real exam timer will begin immediately upon starting. Auto-submits at 00:00.</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.instructionText}>Switch between English & Hindi or jump between sections at any time during the test.</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.instructionText}>Instant All Jharkhand Rank, Percentile, and step-by-step solutions right after submission.</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Action */}
      {tests.length > 0 && (() => {
        const firstTestAttempts = userAttempts.filter((a: any) => a.testId === tests[0].id || a.test?.id === tests[0].id);
        const firstCompletedAttempts = firstTestAttempts.filter((a: any) => a.status === 'SUBMITTED');
        const firstAttemptCount = firstCompletedAttempts.length;
        const firstMaxAttempts = tests[0].maxAttempts !== undefined ? tests[0].maxAttempts : globalMaxAttempts;
        const firstExhausted = firstMaxAttempts > 0 && firstAttemptCount >= firstMaxAttempts;
        const firstLatestCompletedAttemptId = firstCompletedAttempts[0]?.id;

        if (firstExhausted) {
          return (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.startButton}
                activeOpacity={0.85}
                onPress={() => {
                  if (firstLatestCompletedAttemptId) {
                    router.push(`/test/${tests[0].id}?viewMode=review&attemptId=${firstLatestCompletedAttemptId}`);
                  } else {
                    Alert.alert('Attempts Completed', 'You have completed all attempts for this test.');
                  }
                }}
              >
                <Text style={styles.startButtonText}>
                  View {tests[0].title || 'Paper'} Results & Solutions
                </Text>
                <ChevronRight size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          );
        }

        return (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.startButton}
              activeOpacity={0.85}
              onPress={() => handleStartTest(tests[0].id)}
            >
              <Text style={styles.startButtonText}>
                {firstAttemptCount > 0 ? `Re-Attempt ${tests[0].title || 'Paper'}` : `Start ${tests[0].title || 'Paper'}`}
              </Text>
              <PlayCircle size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  scrollView: {
    flex: 1,
  },
  heroHeader: {
    backgroundColor: '#0072FF',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 12 : 36) : 48,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroBackBtn: {
    padding: 6,
    marginLeft: -6,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  categoryBadge: {
    color: '#BFDBFE',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  heroSubText: {
    fontSize: 13,
    color: '#DBEAFE',
    fontWeight: '500',
    lineHeight: 18,
  },
  contentSection: {
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  testList: {
    gap: 12,
    marginBottom: 20,
  },
  testCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  testCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  testBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  testBadgeText: {
    color: '#0072FF',
    fontWeight: '800',
    fontSize: 10,
  },
  testBadgeExhausted: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  testBadgeTextExhausted: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 10,
  },
  testBadgePartial: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  testBadgeTextPartial: {
    color: '#0072FF',
    fontWeight: '800',
    fontSize: 10,
  },
  testCardExhausted: {
    borderColor: '#E2E8F0',
  },
  viewResultBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#0072FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  viewResultBtnPillText: {
    color: '#0072FF',
    fontWeight: '800',
    fontSize: 12,
  },
  attemptActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prevResultLink: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  prevResultLinkText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  testMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  testMetaText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  testMetaDot: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  testTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  testFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  testQCount: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  startBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  startBtnPillText: {
    color: '#0072FF',
    fontWeight: '800',
    fontSize: 12,
  },
  instructionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  instructionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  instructionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  bilingualTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  bilingualTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0072FF',
  },
  instSubHeading: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 10,
  },
  markingSchemeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  markingTile: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  markingTileVal: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 2,
  },
  markingTileLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  paletteGrid: {
    gap: 8,
    marginBottom: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paletteRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusSquare: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSquareText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  statusInfo: {
    flex: 1,
  },
  statusInfoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  statusInfoDesc: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  guidelineList: {
    gap: 4,
    marginTop: 4,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#0072FF',
    marginTop: 6,
    marginRight: 8,
  },
  instructionText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  startButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0072FF',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
    gap: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
