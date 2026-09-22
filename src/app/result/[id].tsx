import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Award, Clock, Target, CheckCircle2, XCircle, Trophy } from 'lucide-react-native';
import { fetchAttemptDetails, getApiBaseUrl } from '../../services/api';

const { width } = Dimensions.get('window');

const SEED_QUESTIONS = [
  {
    id: 'q-jh-1',
    sectionName: 'General',
    textEn: "In which district is the 'Betla National Park' located in Jharkhand?",
    optionsEn: ['Latehar', 'Palamu', 'Gumla', 'Lohardaga'],
    correctAnswer: 0,
    marks: 1,
    negativeMark: 0.25,
    explanationEn: "Betla National Park located in Latehar district was one of the first national parks in India to conduct a tiger census in 1932.",
  },
  {
    id: 'q-jh-2',
    sectionName: 'General',
    textEn: 'In which year was the state of Jharkhand carved out of Bihar?',
    optionsEn: ['15 November 1999', '15 November 2000', '15 August 2000', '26 January 2001'],
    correctAnswer: 1,
    marks: 1,
    negativeMark: 0.25,
    explanationEn: 'Jharkhand became the 28th state of India on 15 November 2000, commemorating the birth anniversary of tribal icon Birsa Munda.',
  },
  {
    id: 'q-jh-3',
    sectionName: 'General',
    textEn: 'Who is revered as "Dharti Aaba" (Father of the Earth) in Jharkhand?',
    optionsEn: ['Sidhu Murmu', 'Jatra Bhagat', 'Birsa Munda', 'Tilka Manjhi'],
    correctAnswer: 2,
    marks: 1,
    negativeMark: 0.25,
    explanationEn: 'Bhagwan Birsa Munda is revered as Dharti Aaba for leading the historic Ulgulan revolt.',
  },
];

export default function ResultAnalyticsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>(SEED_QUESTIONS);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'solutions' | 'leaderboard'>('overview');
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      
      // 1. Fetch Attempt Data
      const attemptData = await fetchAttemptDetails(id as string);
      setAttempt(attemptData);

      // 2. Fetch User Answers from local storage
      try {
        const storedAns = await AsyncStorage.getItem(`attempt_answers_${id}`);
        if (storedAns) {
          setAnswers(JSON.parse(storedAns));
        }
      } catch (e) {
        console.warn('Failed to load answers from async storage', e);
      }

      // 3. Fetch Questions if possible
      if (attemptData?.testId) {
        try {
          const qRes = await fetch(`${getApiBaseUrl()}/tests/${attemptData.testId}/questions`);
          if (qRes.ok) {
            const qList = await qRes.json();
            if (Array.isArray(qList) && qList.length > 0) {
              const formatted = qList.map((q: any) => {
                const ansLetter = (q.correctAnswer || 'A').toUpperCase().trim();
                const ansIndex = ansLetter === 'B' ? 1 : ansLetter === 'C' ? 2 : ansLetter === 'D' ? 3 : 0;
                return {
                  id: q.id,
                  sectionName: q.sectionName || 'General',
                  textEn: q.questionEn || q.questionHi || 'Question',
                  optionsEn: [
                    q.optAEn || q.optAHi || 'Option A',
                    q.optBEn || q.optBHi || 'Option B',
                    q.optCEn || q.optCHi || 'Option C',
                    q.optDEn || q.optDHi || 'Option D',
                  ],
                  correctAnswer: ansIndex,
                  explanationEn: q.explanationEn || q.explanationHi || '',
                  marks: q.marks || 1,
                  negativeMark: q.negativeMark || 0,
                };
              });
              setQuestions(formatted);
            }
          }
        } catch (e) {
          console.warn('Failed to load real questions for result view', e);
        }
      }

      setLoading(false);
    };

    init();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'leaderboard' && attempt?.testId && leaderboardData.length === 0) {
      fetchLeaderboard(attempt.testId);
    }
  }, [activeTab, attempt]);

  const fetchLeaderboard = async (testId: string) => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/tests/${testId}/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboardData(Array.isArray(data?.leaderboard) ? data.leaderboard : []);
      }
    } catch (err) {
      console.warn('Failed to load leaderboard', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  if (loading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color="#0072FF" />
        <Text style={{ marginTop: 12, color: '#64748B', fontWeight: '700' }}>Loading Analytics...</Text>
      </View>
    );
  }

  if (!attempt) {
    return (
      <View style={styles.loadingCenter}>
        <Text style={{ color: '#64748B', fontWeight: '600' }}>Result not found.</Text>
        <TouchableOpacity style={styles.goBackBtn} onPress={() => router.back()}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{attempt.test?.title || attempt.testTitle || 'Mock Test'} - Analysis</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'overview' && styles.activeTabBtn]} 
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'solutions' && styles.activeTabBtn]} 
          onPress={() => setActiveTab('solutions')}
        >
          <Text style={[styles.tabText, activeTab === 'solutions' && styles.activeTabText]}>Solutions</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'leaderboard' && styles.activeTabBtn]} 
          onPress={() => setActiveTab('leaderboard')}
        >
          <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.activeTabText]}>Leaderboard</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <View>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreTitle}>Your Score</Text>
              <Text style={styles.scoreValue}>{attempt.score}</Text>
              <Text style={styles.scoreSub}>Out of {attempt.totalMarks || (questions.length * (questions[0]?.marks || 1))}</Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <View style={[styles.statIconWrap, { backgroundColor: '#F0FDF4' }]}>
                  <Award size={20} color="#16A34A" />
                </View>
                <Text style={styles.statLabel}>Rank</Text>
                <Text style={styles.statVal}>{attempt.rank} <Text style={{fontSize: 12, color: '#94A3B8'}}>/ {attempt.totalCandidates}</Text></Text>
              </View>
              <View style={styles.statBox}>
                <View style={[styles.statIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <Target size={20} color="#0072FF" />
                </View>
                <Text style={styles.statLabel}>Accuracy</Text>
                <Text style={styles.statVal}>{attempt.accuracy}%</Text>
              </View>
              <View style={styles.statBox}>
                <View style={[styles.statIconWrap, { backgroundColor: '#FFF7ED' }]}>
                  <Clock size={20} color="#EA580C" />
                </View>
                <Text style={styles.statLabel}>Time Taken</Text>
                <Text style={styles.statVal}>{formatTime(attempt.timeTaken)}</Text>
              </View>
            </View>

            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Performance Breakdown</Text>
              <View style={styles.breakdownRow}>
                <View style={styles.bdItem}>
                  <Text style={[styles.bdNum, { color: '#16A34A' }]}>{attempt.correct}</Text>
                  <Text style={styles.bdLabel}>Correct</Text>
                </View>
                <View style={styles.bdItem}>
                  <Text style={[styles.bdNum, { color: '#DC2626' }]}>{attempt.incorrect}</Text>
                  <Text style={styles.bdLabel}>Incorrect</Text>
                </View>
                <View style={styles.bdItem}>
                  <Text style={[styles.bdNum, { color: '#94A3B8' }]}>{attempt.unanswered}</Text>
                  <Text style={styles.bdLabel}>Unanswered</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* SOLUTIONS TAB */}
        {activeTab === 'solutions' && (
          <View style={styles.solutionsContainer}>
            {questions.map((q, index) => {
              const userSelected = answers[q.id];
              const isAnswered = userSelected !== undefined;
              const isCorrect = isAnswered && userSelected === q.correctAnswer;
              
              return (
                <View key={q.id} style={styles.questionCard}>
                  <View style={styles.qHeader}>
                    <Text style={styles.qNum}>Question {index + 1}</Text>
                    {isAnswered ? (
                      isCorrect ? (
                        <View style={[styles.qBadge, { backgroundColor: '#DCFCE7' }]}>
                          <CheckCircle2 size={12} color="#16A34A" style={{marginRight: 4}}/>
                          <Text style={[styles.qBadgeText, { color: '#16A34A' }]}>Correct (+{q.marks})</Text>
                        </View>
                      ) : (
                        <View style={[styles.qBadge, { backgroundColor: '#FEE2E2' }]}>
                          <XCircle size={12} color="#DC2626" style={{marginRight: 4}}/>
                          <Text style={[styles.qBadgeText, { color: '#DC2626' }]}>Incorrect (-{q.negativeMark})</Text>
                        </View>
                      )
                    ) : (
                      <View style={[styles.qBadge, { backgroundColor: '#F1F5F9' }]}>
                        <Text style={[styles.qBadgeText, { color: '#64748B' }]}>Unattempted</Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={styles.qText}>{q.textEn}</Text>

                  <View style={styles.optionsList}>
                    {q.optionsEn.map((opt: string, optIdx: number) => {
                      const isCorrectOption = optIdx === q.correctAnswer;
                      const isUserSelectedOption = optIdx === userSelected;
                      
                      let optBg = '#F8FAFC';
                      let optBorder = '#E2E8F0';
                      let optIcon = null;

                      if (isCorrectOption) {
                        optBg = '#F0FDF4';
                        optBorder = '#16A34A';
                        optIcon = <CheckCircle2 size={16} color="#16A34A" />;
                      } else if (isUserSelectedOption && !isCorrectOption) {
                        optBg = '#FEF2F2';
                        optBorder = '#DC2626';
                        optIcon = <XCircle size={16} color="#DC2626" />;
                      }

                      return (
                        <View key={optIdx} style={[styles.optionRow, { backgroundColor: optBg, borderColor: optBorder }]}>
                          <View style={styles.optLetterBox}>
                            <Text style={styles.optLetter}>{String.fromCharCode(65 + optIdx)}</Text>
                          </View>
                          <Text style={styles.optText}>{opt}</Text>
                          {optIcon}
                        </View>
                      );
                    })}
                  </View>

                  {q.explanationEn && (
                    <View style={styles.explanationBox}>
                      <Text style={styles.explanationTitle}>Explanation</Text>
                      <Text style={styles.explanationText}>{q.explanationEn}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* LEADERBOARD TAB */}
        {activeTab === 'leaderboard' && (
          <View style={styles.leaderboardContainer}>
            {loadingLeaderboard ? (
              <View style={{alignItems: 'center', marginTop: 40}}>
                <ActivityIndicator size="small" color="#0072FF" />
                <Text style={{marginTop: 10, color: '#64748B'}}>Loading rankings...</Text>
              </View>
            ) : leaderboardData.length === 0 ? (
              <View style={{alignItems: 'center', marginTop: 40}}>
                <Trophy size={48} color="#CBD5E1" />
                <Text style={{marginTop: 16, fontSize: 16, fontWeight: '700', color: '#334155'}}>No rankings yet</Text>
                <Text style={{marginTop: 4, color: '#64748B'}}>Be the first to secure a top rank!</Text>
              </View>
            ) : (
              leaderboardData.map((item, idx) => (
                <View key={idx} style={[styles.lbRow, item.rank === attempt.rank && styles.lbRowActive]}>
                  <View style={styles.lbRankBox}>
                    <Text style={styles.lbRankNum}>#{item.rank}</Text>
                  </View>
                  <View style={styles.lbUserBox}>
                    <View style={styles.lbAvatar}>
                      <Text style={styles.lbAvatarTxt}>{(item.name || 'A').charAt(0).toUpperCase()}</Text>
                    </View>
                    <View>
                      <Text style={styles.lbName}>{item.name || 'Aspirant'}</Text>
                      {item.rank === attempt.rank && (
                        <View style={styles.youBadge}><Text style={styles.youBadgeTxt}>YOU</Text></View>
                      )}
                    </View>
                  </View>
                  <Text style={styles.lbScore}>{item.score} pts</Text>
                </View>
              ))
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  goBackBtn: { marginTop: 16, backgroundColor: '#0072FF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#0072FF' },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', flex: 1, textAlign: 'center' },
  tabsRow: { flexDirection: 'row', backgroundColor: '#0072FF', paddingHorizontal: 8, paddingBottom: 8 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, marginHorizontal: 4, borderRadius: 8 },
  activeTabBtn: { backgroundColor: 'rgba(255, 255, 255, 0.22)' },
  tabText: { color: 'rgba(255, 255, 255, 0.75)', fontSize: 13, fontWeight: '600' },
  activeTabText: { color: '#FFFFFF', fontWeight: '800' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  scoreCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center', shadowColor: '#0072FF', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 16 },
  scoreTitle: { fontSize: 14, color: '#64748B', fontWeight: '600', marginBottom: 8 },
  scoreValue: { fontSize: 48, fontWeight: '900', color: '#0072FF', lineHeight: 56 },
  scoreSub: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginHorizontal: 4, alignItems: 'center', shadowColor: '#0072FF', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  statIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 4 },
  statVal: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  breakdownCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#0072FF', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  breakdownTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bdItem: { alignItems: 'center' },
  bdNum: { fontSize: 24, fontWeight: '900', marginBottom: 4 },
  bdLabel: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  solutionsContainer: { gap: 16 },
  questionCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#0072FF', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  qNum: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  qBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  qBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  qText: { fontSize: 15, fontWeight: '600', color: '#1E293B', lineHeight: 22, marginBottom: 16 },
  optionsList: { gap: 8 },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
  optLetterBox: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 12, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  optLetter: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  optText: { flex: 1, fontSize: 14, color: '#334155', fontWeight: '500' },
  explanationBox: { marginTop: 16, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  explanationTitle: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 6 },
  explanationText: { fontSize: 14, color: '#475569', lineHeight: 20 },
  leaderboardContainer: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#0072FF', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  lbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  lbRowActive: { backgroundColor: '#EFF6FF', marginHorizontal: -16, paddingHorizontal: 16 },
  lbRankBox: { width: 40 },
  lbRankNum: { fontSize: 16, fontWeight: '800', color: '#64748B' },
  lbUserBox: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  lbAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  lbAvatarTxt: { fontSize: 14, fontWeight: '700', color: '#475569' },
  lbName: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  youBadge: { backgroundColor: '#0072FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 2 },
  youBadgeTxt: { fontSize: 8, fontWeight: '800', color: '#FFFFFF' },
  lbScore: { fontSize: 16, fontWeight: '800', color: '#0072FF' }
});
