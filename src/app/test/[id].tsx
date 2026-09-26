import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Clock,
  Menu,
  X,
  Check,
  Award,
  Languages,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Layers,
  Send,
  Flag,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Trophy,
  BookOpen,
  ChevronRight,
  ZoomIn,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { submitAttempt, getApiBaseUrl, fetchUserAttempts, startAttempt, syncAttempt, fetchAttemptDetails } from '../../services/api';

const { width } = Dimensions.get('window');

import { SEED_QUESTIONS } from '../../constants/seedData';


export default function MobileTestAttemptScreen() {
  const { id, viewMode: initialViewMode, attemptId: reviewAttemptId } = useLocalSearchParams();
  const router = useRouter();
  const { user, refreshProfile } = useAuth();

  const [testInfo, setTestInfo] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>(SEED_QUESTIONS);
  const [loading, setLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  // User responses
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [visitedQuestions, setVisitedQuestions] = useState<Set<string>>(new Set());

  // UI state
  const [timeLeft, setTimeLeft] = useState(120 * 60);
  const [language, setLanguage] = useState<'HI' | 'EN'>('HI');
  const [fontSizeScale, setFontSizeScale] = useState<number>(1); // 1x, 1.18x, 1.35x
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'exam' | 'review'>((initialViewMode as any) || 'exam');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'incorrect' | 'correct' | 'unattempted'>('all');
  const [selectedDrawerSection, setSelectedDrawerSection] = useState<string>('ALL');
  const [testResult, setTestResult] = useState<{
    score: number;
    totalMarks: number;
    correct: number;
    incorrect: number;
    unanswered: number;
    accuracy: number;
    timeTaken?: number;
    rank?: number;
    totalCandidates?: number;
    percentile?: number;
  } | null>(null);

  // Leaderboard state
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [attemptInfo, setAttemptInfo] = useState<{
    attemptNumber: number;
    maxAttempts: number;
    remainingAttempts: number;
  }>({
    attemptNumber: 1,
    maxAttempts: 2,
    remainingAttempts: 1,
  });

  const fetchAndOpenLeaderboard = async () => {
    setIsLeaderboardOpen(true);
    setLoadingLeaderboard(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/tests/${id}/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboardData(Array.isArray(data?.leaderboard) ? data.leaderboard : []);
      } else {
        setLeaderboardData([]);
      }
    } catch (err) {
      console.warn('Failed to load leaderboard', err);
      setLeaderboardData([]);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  // Fetch Test & Questions dynamically
  useEffect(() => {
    const fetchTestData = async () => {
      try {
        setLoading(true);
        // Initialize Attempt
        let savedState: any = null;
        if (id && (!initialViewMode || initialViewMode !== 'review')) {
          const attempt = await startAttempt(id as string);
          if (attempt && attempt.id) {
            setAttemptId(attempt.id);
            if (attempt.savedState) {
               savedState = attempt.savedState;
               if (savedState.answers) setAnswers(savedState.answers);
               if (savedState.timeLeft) setTimeLeft(savedState.timeLeft);
               if (savedState.currentQ) setCurrentQ(savedState.currentQ);
            }
          }
        } else if (initialViewMode === 'review' && reviewAttemptId) {
          const attemptRes = await fetchAttemptDetails(reviewAttemptId as string);
          if (attemptRes) {
            setAttemptId(attemptRes.id);
            if (attemptRes.answers) {
              const parsedAnswers: Record<string, number> = {};
              for (const [qId, val] of Object.entries(attemptRes.answers)) {
                if (typeof val === 'string') {
                  const upper = val.toUpperCase();
                  if (upper === 'A') parsedAnswers[qId] = 0;
                  else if (upper === 'B') parsedAnswers[qId] = 1;
                  else if (upper === 'C') parsedAnswers[qId] = 2;
                  else if (upper === 'D') parsedAnswers[qId] = 3;
                  else parsedAnswers[qId] = Number(val) || 0;
                } else if (typeof val === 'number') {
                  parsedAnswers[qId] = val;
                }
              }
              setAnswers(parsedAnswers);
            }
            
            const result = {
              score: Number(attemptRes.score || 0),
              totalMarks: attemptRes.maxMarks || 0,
              correct: attemptRes.correct || 0,
              incorrect: attemptRes.incorrect || 0,
              unanswered: attemptRes.unanswered || 0,
              accuracy: attemptRes.accuracy || 0,
              timeTaken: attemptRes.timeSpent || 0,
              rank: attemptRes.rank || 1,
              totalCandidates: attemptRes.totalCandidates || 1,
              percentile: attemptRes.percentile || 100,
            };
            setTestResult(result);
            
            if (attemptRes.attemptNumber) {
              setAttemptInfo({
                 attemptNumber: attemptRes.attemptNumber,
                 maxAttempts: attemptRes.maxAttempts || 2,
                 remainingAttempts: attemptRes.remainingAttempts || 0,
              });
            }
          }
        }

        // 1. Fetch Test Meta
        const tRes = await fetch(`${getApiBaseUrl()}/tests/${id}`);
        if (tRes.ok) {
          const t = await tRes.json();
          setTestInfo(t);
          if (t.duration) setTimeLeft(t.duration * 60);
        }

        // 2. Fetch Questions
        const qRes = await fetch(`${getApiBaseUrl()}/tests/${id}/questions`);
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
                textHi: q.questionHi || q.questionEn || 'Question',
                optionsEn: [
                  q.optAEn || q.optAHi || 'Option A',
                  q.optBEn || q.optBHi || 'Option B',
                  q.optCEn || q.optCHi || 'Option C',
                  q.optDEn || q.optDHi || 'Option D',
                ],
                optionsHi: [
                  q.optAHi || q.optAEn || 'विकल्प A',
                  q.optBHi || q.optBEn || 'विकल्प B',
                  q.optCHi || q.optCEn || 'विकल्प C',
                  q.optDHi || q.optDEn || 'विकल्प D',
                ],
                correctAnswer: ansIndex,
                marks: q.marks !== undefined && q.marks !== null ? Number(q.marks) : 1,
                negativeMark: q.negativeMark !== undefined && q.negativeMark !== null ? Number(q.negativeMark) : 0,
                explanationEn: q.explanationEn || '',
                explanationHi: q.explanationHi || '',
                questionImageUrl: q.questionImageUrl || null,
                optAImageUrl: q.optAImageUrl || null,
                optBImageUrl: q.optBImageUrl || null,
                optCImageUrl: q.optCImageUrl || null,
                optDImageUrl: q.optDImageUrl || null,
                explanationImageUrl: q.explanationImageUrl || null,
              };
            });
            setQuestions(formatted);
          }
        }

        // 3. Fetch User Attempts to check max limit
        try {
          const [userAtts, setRes] = await Promise.all([
            fetchUserAttempts().catch(() => []),
            fetch(`${getApiBaseUrl()}/settings/exam`).catch(() => null)
          ]);

          let globalSettingMax = 2;
          if (setRes && setRes.ok) {
            const setJson = await setRes.json();
            if (setJson?.data?.maxAttempts !== undefined) {
              globalSettingMax = Number(setJson.data.maxAttempts);
            }
          }

          if (Array.isArray(userAtts)) {
            const completedAttempts = userAtts.filter((a: any) => (a.testId === id || a.test?.id === id) && a.status === 'SUBMITTED');
            const maxAtt = testInfo?.maxAttempts !== undefined ? testInfo.maxAttempts : globalSettingMax;
            const attNum = completedAttempts.length + 1;
            const rem = maxAtt > 0 ? Math.max(0, maxAtt - completedAttempts.length) : 999;

            setAttemptInfo({
              attemptNumber: attNum,
              maxAttempts: maxAtt,
              remainingAttempts: rem,
            });

            if (initialViewMode !== 'review' && maxAtt > 0 && completedAttempts.length >= maxAtt) {
              const latest = completedAttempts[0];
              Alert.alert(
                'Attempts Limit Reached',
                `You have completed your allowed ${maxAtt}/${maxAtt} attempts for this test. You can now review your solutions and result breakdown.`,
                [
                  {
                    text: 'View Solutions',
                    onPress: () => {
                      if (latest?.id) {
                        router.replace(`/test/${id}?viewMode=review&attemptId=${latest.id}`);
                      } else {
                        setViewMode('review');
                      }
                    },
                  },
                ]
              );
            }
          }
        } catch (e) {
          console.log('Error checking attempts in test:', e);
        }
      } catch (err) {
        console.error('Error loading mobile test:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTestData();
    }
  }, [id]);

  // Track visited questions
  useEffect(() => {
    if (questions.length > 0 && questions[currentQ]) {
      const qId = questions[currentQ].id;
      setVisitedQuestions((prev) => new Set(prev).add(qId));
    }
  }, [currentQ, questions]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          executeSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [answers, questions]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Autosync state
  useEffect(() => {
    if (attemptId && !submitting && viewMode === 'exam') {
      const timeout = setTimeout(() => {
        syncAttempt(attemptId, {
          answers,
          timeLeft,
          currentQ
        });
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [answers, currentQ]);

  // Group sections
  const sections = useMemo(() => {
    const map = new Map<string, any[]>();
    questions.forEach((q, idx) => {
      const secName = q.sectionName || 'General';
      if (!map.has(secName)) map.set(secName, []);
      map.get(secName)!.push({ ...q, globalIndex: idx });
    });
    return Array.from(map.entries()).map(([name, list]) => ({
      name,
      questions: list,
      count: list.length,
    }));
  }, [questions]);

  const question = questions[currentQ] || SEED_QUESTIONS[0];

  // Drawer stats
  const answeredCount = Object.keys(answers).length;
  const markedCount = markedForReview.size;
  const unattemptedCount = questions.length - answeredCount;

  const toggleReview = () => {
    setMarkedForReview((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(question.id)) newSet.delete(question.id);
      else newSet.add(question.id);
      return newSet;
    });
  };

  const selectOption = (idx: number) => {
    setAnswers((prev) => ({ ...prev, [question.id]: idx }));
  };

  const clearOption = () => {
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[question.id];
      return copy;
    });
  };

  const handleSaveAndNext = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((prev) => prev + 1);
    } else {
      handleConfirmSubmit();
    }
  };

  const handleMarkAndNext = () => {
    toggleReview();
    if (currentQ < questions.length - 1) {
      setCurrentQ((prev) => prev + 1);
    }
  };

  const handleCycleFontSize = () => {
    if (fontSizeScale === 1) setFontSizeScale(1.18);
    else if (fontSizeScale === 1.18) setFontSizeScale(1.35);
    else setFontSizeScale(1);
  };

  const executeSubmit = async () => {
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;
    let calculatedScore = 0;
    let maxMarks = 0;

    questions.forEach((q) => {
      const selected = answers[q.id];
      const marks = q.marks !== undefined && q.marks !== null ? Number(q.marks) : 1;
      const neg = q.negativeMark !== undefined && q.negativeMark !== null ? Number(q.negativeMark) : 0;
      maxMarks += marks;

      if (selected === undefined) {
        unanswered++;
      } else if (selected === q.correctAnswer) {
        correct++;
        calculatedScore += marks;
      } else {
        incorrect++;
        calculatedScore -= neg;
      }
    });

    const finalScore = Math.max(0, calculatedScore);
    const totalAttempted = correct + incorrect;
    const accuracy = totalAttempted > 0 ? Math.round((correct / totalAttempted) * 100) : 0;
    const totalSecs = (testInfo?.duration ? testInfo.duration * 60 : 120 * 60);
    const timeSpent = Math.max(1, totalSecs - timeLeft);

    let rank = 1;
    let totalCandidates = 1;
    let percentile = 100;

    // Record attempt to backend
    try {
      setSubmitting(true);
      const answerPayload = Object.entries(answers).map(([qId, optIdx]) => ({
        questionId: qId,
        selectedOption: String.fromCharCode(65 + optIdx),
      }));

      const attemptRes = await submitAttempt({
        testId: (id as string) || 'test-jssc-cgl-mock-1',
        answers: answerPayload,
        timeTaken: timeSpent,
      });

      if (attemptRes && typeof attemptRes.rank === 'number') {
        rank = attemptRes.rank;
        totalCandidates = attemptRes.totalCandidates || 1;
        percentile = attemptRes.percentile !== undefined ? attemptRes.percentile : 100;
        
        if (attemptRes.id) {
          await AsyncStorage.setItem(`attempt_answers_${attemptRes.id}`, JSON.stringify(answers));
        }

        if (attemptRes.attemptNumber !== undefined) {
          const resMax = attemptRes.maxAttempts !== undefined ? attemptRes.maxAttempts : 2;
          const resRem = attemptRes.remainingAttempts !== undefined ? attemptRes.remainingAttempts : (resMax > 0 ? Math.max(0, resMax - (attemptRes.attemptNumber || 1)) : 999);
          setAttemptInfo({
            attemptNumber: attemptRes.attemptNumber || 1,
            maxAttempts: resMax,
            remainingAttempts: resRem,
          });
        }
      }

      await refreshProfile();
    } catch (e) {
      console.warn('Failed to sync attempt to cloud', e);
    } finally {
      setSubmitting(false);
    }

    const result = {
      score: Number(finalScore.toFixed(2)),
      totalMarks: maxMarks,
      correct,
      incorrect,
      unanswered,
      accuracy,
      timeTaken: timeSpent,
      rank,
      totalCandidates,
      percentile,
    };

    setTestResult(result);
    setReviewFilter('all');
    setViewMode('review');
  };

  const handleReattempt = () => {
    if (attemptInfo.maxAttempts > 0 && attemptInfo.remainingAttempts <= 0) {
      Alert.alert(
        'Attempt Limit Reached',
        `You have completed all ${attemptInfo.maxAttempts} allowed attempts for this exam. You can review your detailed solutions anytime.`
      );
      return;
    }

    Alert.alert(
      'Re-attempt Test',
      `Do you want to re-take this test? (Attempt ${attemptInfo.attemptNumber + 1} of ${attemptInfo.maxAttempts === 0 ? 'Unlimited' : attemptInfo.maxAttempts})`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Re-attempt Now',
          onPress: () => {
            setAnswers({});
            setMarkedForReview(new Set());
            setVisitedQuestions(new Set());
            setCurrentQ(0);
            setTimeLeft((testInfo?.duration ? testInfo.duration * 60 : 120 * 60));
            setTestResult(null);
            setViewMode('exam');
            setReviewFilter('all');
          },
        },
      ]
    );
  };

  const handleConfirmSubmit = () => {
    Alert.alert('Finish & Submit Test', 'Are you sure you want to submit your test now?', [
      { text: 'Keep Reviewing', style: 'cancel' },
      { text: 'Submit Test', onPress: executeSubmit },
    ]);
  };

  // Status helper for Question Palette
  const getQuestionStatus = (qId: string) => {
    const isAnswered = answers[qId] !== undefined;
    const isMarked = markedForReview.has(qId);
    const isVisited = visitedQuestions.has(qId);

    if (isAnswered && isMarked) return 'answered-marked';
    if (isAnswered) return 'answered';
    if (isMarked) return 'marked';
    if (isVisited) return 'not-answered';
    return 'not-visited';
  };

  // Questions displayed in palette
  const drawerQuestions = useMemo(() => {
    if (selectedDrawerSection === 'ALL') return questions.map((q, idx) => ({ ...q, globalIndex: idx }));
    const secObj = sections.find(s => s.name === selectedDrawerSection);
    return secObj ? secObj.questions : questions.map((q, idx) => ({ ...q, globalIndex: idx }));
  }, [questions, sections, selectedDrawerSection]);

  if (loading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={{ marginTop: 12, color: '#64748B', fontWeight: '700' }}>Loading Test...</Text>
      </View>
    );
  }

// Helper to extract clean single language text if text is bilingual or contains '/'
function extractLanguageText(rawText: string | undefined | null, lang: 'EN' | 'HI'): string {
  if (!rawText) return '';
  const text = rawText.toString().trim();
  if (!text) return '';

  const delims = [' // ', ' / ', ' | ', '\n', '/'];
  for (const delim of delims) {
    if (text.includes(delim)) {
      const parts = text.split(delim).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const hindiPart = parts.find((p) => /[\u0900-\u097F]/.test(p));
        const englishPart = parts.find((p) => /[a-zA-Z]/.test(p) && !/[\u0900-\u097F]/.test(p));

        if (lang === 'HI') {
          if (hindiPart) return hindiPart;
          return parts[1] || parts[0];
        } else {
          if (englishPart) return englishPart;
          return parts[0];
        }
      }
    }
  }

  const hasHindi = /[\u0900-\u097F]/.test(text);
  const hasEnglish = /[a-zA-Z]/.test(text);
  if (hasHindi && hasEnglish) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      if (lang === 'HI') {
        const hindiLines = lines.filter((l) => /[\u0900-\u097F]/.test(l));
        if (hindiLines.length > 0) return hindiLines.join(' ');
      } else {
        const engLines = lines.filter((l) => /[a-zA-Z]/.test(l) && !/[\u0900-\u097F]/.test(l));
        if (engLines.length > 0) return engLines.join(' ');
      }
    }
  }

  return text;
}

  // --- TEST REVIEW & ANALYSIS VIEW ---
  if (viewMode === 'review' && testResult) {
    const filteredQuestions = questions
      .map((q, originalIndex) => {
        const userSelected = answers[q.id];
        const isAnswered = userSelected !== undefined;
        const isCorrect = isAnswered && userSelected === q.correctAnswer;
        const isIncorrect = isAnswered && userSelected !== q.correctAnswer;
        const isUnattempted = !isAnswered;
        return {
          ...q,
          originalIndex,
          userSelected,
          isCorrect,
          isIncorrect,
          isUnattempted,
        };
      })
      .filter((q) => {
        if (reviewFilter === 'correct') return q.isCorrect;
        if (reviewFilter === 'incorrect') return q.isIncorrect;
        if (reviewFilter === 'unattempted') return q.isUnattempted;
        return true;
      });

    const formatReviewTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      if (m > 0) return `${m}m ${s}s`;
      return `${s}s`;
    };

    const renderLeaderboardBody = () => {
      if (loadingLeaderboard) {
        return (
          <View style={styles.leaderboardLoading}>
            <ActivityIndicator size="small" color="#0072FF" />
            <Text style={styles.leaderboardLoadingText}>Loading Top Aspirants...</Text>
          </View>
        );
      }

      if (!Array.isArray(leaderboardData) || leaderboardData.length === 0) {
        return (
          <View style={styles.leaderboardEmpty}>
            <Trophy size={36} color="#CBD5E1" />
            <Text style={styles.leaderboardEmptyTitle}>Rank #1 is yours!</Text>
            <Text style={styles.leaderboardEmptySub}>
              You are among the first participants to complete this test.
            </Text>
          </View>
        );
      }

      const top1 = leaderboardData.find((x) => x?.rank === 1) || leaderboardData[0];
      const top2 = leaderboardData.find((x) => x?.rank === 2);
      const top3 = leaderboardData.find((x) => x?.rank === 3);
      const others = leaderboardData.filter((x) => (x?.rank || 0) > 3);

      return (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* TOP 3 PODIUM */}
          <View style={styles.podiumContainer}>
            {/* RANK 2 (SILVER) - LEFT */}
            <View style={[styles.podiumCol, styles.podiumColLeft]}>
              {top2 ? (
                <>
                  <View style={styles.podiumAvatarWrap}>
                    <Text style={styles.podiumEmoji}>🥈</Text>
                    <View style={[styles.podiumAvatarCircle, styles.podiumAvatarSilver]}>
                      <Text style={styles.podiumAvatarInitials}>
                        {(top2?.name ? String(top2.name) : 'A').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={[styles.podiumRankTag, styles.podiumRankTagSilver]}>
                      <Text style={styles.podiumRankTagText}>2</Text>
                    </View>
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>
                    {top2.name || 'Aspirant'}
                  </Text>
                  {top2.userId === user?.id && (
                    <View style={styles.youPillSmall}>
                      <Text style={styles.youPillSmallText}>You</Text>
                    </View>
                  )}
                  <Text style={styles.podiumScore}>+{top2.score ?? 0} pts</Text>
                  <View style={[styles.podiumPedestal, styles.podiumPedestalSilver]}>
                    <Text style={styles.podiumPedestalRankNum}>2nd</Text>
                  </View>
                </>
              ) : (
                <View style={styles.podiumEmptyCol}>
                  <Text style={styles.podiumEmojiMuted}>🥈</Text>
                  <View style={[styles.podiumPedestal, styles.podiumPedestalEmpty]}>
                    <Text style={styles.podiumEmptyPedestalText}>2nd</Text>
                  </View>
                </View>
              )}
            </View>

            {/* RANK 1 (GOLD) - CENTER */}
            <View style={[styles.podiumCol, styles.podiumColCenter]}>
              {top1 ? (
                <>
                  <View style={styles.podiumAvatarWrapCenter}>
                    <Text style={styles.podiumCrownEmoji}>👑</Text>
                    <View style={[styles.podiumAvatarCircle, styles.podiumAvatarGold]}>
                      <Text style={styles.podiumAvatarInitialsGold}>
                        {(top1?.name ? String(top1.name) : 'A').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={[styles.podiumRankTag, styles.podiumRankTagGold]}>
                      <Text style={styles.podiumRankTagText}>1</Text>
                    </View>
                  </View>
                  <Text style={styles.podiumNameGold} numberOfLines={1}>
                    {top1.name || 'Aspirant'}
                  </Text>
                  {(top1.userId === user?.id || (testResult?.rank === 1 && leaderboardData.length === 1)) && (
                    <View style={styles.youPillSmall}>
                      <Text style={styles.youPillSmallText}>You</Text>
                    </View>
                  )}
                  <Text style={styles.podiumScoreGold}>+{top1.score ?? 0} pts</Text>
                  <View style={[styles.podiumPedestal, styles.podiumPedestalGold]}>
                    <Text style={styles.podiumPedestalRankNumGold}>1st</Text>
                  </View>
                </>
              ) : null}
            </View>

            {/* RANK 3 (BRONZE) - RIGHT */}
            <View style={[styles.podiumCol, styles.podiumColRight]}>
              {top3 ? (
                <>
                  <View style={styles.podiumAvatarWrap}>
                    <Text style={styles.podiumEmoji}>🥉</Text>
                    <View style={[styles.podiumAvatarCircle, styles.podiumAvatarBronze]}>
                      <Text style={styles.podiumAvatarInitials}>
                        {(top3?.name ? String(top3.name) : 'A').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={[styles.podiumRankTag, styles.podiumRankTagBronze]}>
                      <Text style={styles.podiumRankTagText}>3</Text>
                    </View>
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>
                    {top3.name || 'Aspirant'}
                  </Text>
                  {top3.userId === user?.id && (
                    <View style={styles.youPillSmall}>
                      <Text style={styles.youPillSmallText}>You</Text>
                    </View>
                  )}
                  <Text style={styles.podiumScore}>+{top3.score ?? 0} pts</Text>
                  <View style={[styles.podiumPedestal, styles.podiumPedestalBronze]}>
                    <Text style={styles.podiumPedestalRankNum}>3rd</Text>
                  </View>
                </>
              ) : (
                <View style={styles.podiumEmptyCol}>
                  <Text style={styles.podiumEmojiMuted}>🥉</Text>
                  <View style={[styles.podiumPedestal, styles.podiumPedestalEmpty]}>
                    <Text style={styles.podiumEmptyPedestalText}>3rd</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* OTHER RANKERS (Rank 4+) */}
          {others.length > 0 && (
            <View style={{ marginTop: 14 }}>
              <Text style={styles.otherRankersTitle}>Other Top Aspirants</Text>
              <View style={styles.leaderboardList}>
                {others.map((item, idx) => {
                  const isCurrentUser = item.userId === user?.id;

                  return (
                    <View
                      key={item.id || idx}
                      style={[
                        styles.leaderboardRowItem,
                        isCurrentUser && styles.leaderboardRowCurrentUser,
                      ]}
                    >
                      <View style={styles.rankNumberBox}>
                        <Text style={styles.rankNumberText}>{item.rank}</Text>
                      </View>

                      <View style={styles.leaderboardUserCol}>
                        <View style={styles.leaderboardAvatarCircle}>
                          <Text style={styles.leaderboardAvatarInitials}>
                            {(item?.name ? String(item.name) : 'A').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={styles.leaderboardUserName} numberOfLines={1}>
                              {item.name || 'Aspirant'}
                            </Text>
                            {isCurrentUser && (
                              <View style={styles.youPill}>
                                <Text style={styles.youPillText}>You</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.leaderboardUserAcc}>
                            {item.accuracy ?? 0}% Accuracy • {Math.floor((item.timeTaken || 0) / 60)}m {(item.timeTaken || 0) % 60}s
                          </Text>
                        </View>
                      </View>

                      <View style={styles.leaderboardScoreCol}>
                        <Text style={styles.leaderboardScoreVal}>
                          +{item.score ?? 0}
                        </Text>
                        <Text style={styles.leaderboardScoreMax}>
                          / {item.totalMarks || testResult?.totalMarks}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      );
    };

    return (
      <SafeAreaView style={styles.reviewSafeArea} edges={['top', 'bottom', 'left', 'right']}>
        {/* 1. TOP NAVIGATION BAR */}
        <View style={styles.reviewNavBar}>
          <TouchableOpacity
            style={styles.reviewNavBackBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={18} color="#FFFFFF" />
            <Text style={styles.reviewNavBackText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.reviewNavTitleContainer}>
            <Text style={styles.reviewNavTitle} numberOfLines={1}>
              {testInfo?.title || 'Mock Test'}
            </Text>
            <Text style={styles.reviewNavSubtitle}>Result & Detailed Solutions</Text>
          </View>

          {/* Bilingual Language Switcher */}
          <TouchableOpacity
            style={styles.reviewLangBtn}
            onPress={() => setLanguage((prev) => (prev === 'HI' ? 'EN' : 'HI'))}
            activeOpacity={0.8}
          >
            <Languages size={13} color="#FFFFFF" />
            <Text style={styles.reviewLangBtnText}>{language === 'HI' ? 'हिंदी' : 'English'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.reviewScroll}
          contentContainerStyle={styles.reviewScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 2. HERO PERFORMANCE & SCORE CARD */}
          <View style={styles.reviewHeroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroBadge}>
                <Award size={13} color="#F59E0B" />
                <Text style={styles.heroBadgeText}>TEST REPORT CARD</Text>
              </View>
              <Text style={styles.heroUserGreet}>
                {user?.name ? `${user.name}` : 'Jharkhand Aspirant'}
              </Text>
            </View>

            {/* Score & Percentage */}
            <View style={styles.scoreRowContainer}>
              <View style={styles.scoreBoxLarge}>
                <Text style={styles.scoreLabelSmall}>MARKS SCORED</Text>
                <View style={styles.scoreValueRow}>
                  <Text style={styles.scoreValueBig}>{testResult.score}</Text>
                  <Text style={styles.scoreValueMax}> / {testResult.totalMarks}</Text>
                </View>
                <Text style={styles.scorePercentageText}>
                  {testResult.totalMarks > 0
                    ? `${Math.round((testResult.score / testResult.totalMarks) * 100)}% Marks Scored`
                    : '0% Marks'}
                </Text>
              </View>

              {/* Rank & Percentile Box */}
              <View style={styles.rankPercentileBox}>
                <View style={styles.rankItem}>
                  <Trophy size={16} color="#F59E0B" />
                  <View>
                    <Text style={styles.rankItemLabel}>STATE RANK</Text>
                    <Text style={styles.rankItemValue}>
                      #{testResult.rank || 1}{' '}
                      <Text style={styles.rankItemTotal}>
                        / {testResult.totalCandidates || 1}
                      </Text>
                    </Text>
                  </View>
                </View>

                <View style={styles.rankDivider} />

                <View style={styles.rankItem}>
                  <Sparkles size={16} color="#38BDF8" />
                  <View>
                    <Text style={styles.rankItemLabel}>PERCENTILE</Text>
                    <Text style={styles.rankItemValue}>
                      {testResult.percentile || 100}%ile
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Secondary stats bar: Accuracy & Time Spent */}
            <View style={styles.heroSecondaryStats}>
              <View style={styles.heroSecItem}>
                <Text style={styles.heroSecLabel}>Accuracy</Text>
                <Text style={styles.heroSecValue}>{testResult.accuracy}%</Text>
              </View>
              <View style={styles.heroSecDivider} />
              <View style={styles.heroSecItem}>
                <Text style={styles.heroSecLabel}>Time Taken</Text>
                <Text style={styles.heroSecValue}>
                  {formatReviewTime(testResult.timeTaken || 0)}
                </Text>
              </View>
              <View style={styles.heroSecDivider} />
              <View style={styles.heroSecItem}>
                <Text style={styles.heroSecLabel}>Attempted</Text>
                <Text style={styles.heroSecValue}>
                  {testResult.correct + testResult.incorrect} / {questions.length}
                </Text>
              </View>
            </View>
          </View>

          {/* 3. PROPER VIEW LEADERBOARD ACTION BUTTON & BANNER */}
          <TouchableOpacity
            style={styles.leaderboardActionBanner}
            activeOpacity={0.88}
            onPress={fetchAndOpenLeaderboard}
          >
            <View style={styles.leaderboardBannerLeft}>
              <View style={styles.leaderboardIconBadge}>
                <Trophy size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.leaderboardBannerTitle}>View State Leaderboard</Text>
                  <View style={styles.liveLeaderboardTag}>
                    <Text style={styles.liveLeaderboardTagText}>LIVE</Text>
                  </View>
                </View>
                <Text style={styles.leaderboardBannerSub}>
                  Compare with top rankers, state rank & peer scores
                </Text>
              </View>
            </View>

            <View style={styles.leaderboardActionBtnPill}>
              <Text style={styles.leaderboardBtnText}>View</Text>
              <ChevronRight size={14} color="#0072FF" />
            </View>
          </TouchableOpacity>

          {/* 4. FILTER PILLS BAR */}
          <View style={styles.filterSectionHeader}>
            <View style={styles.filterTitleRow}>
              <Text style={styles.filterSectionTitle}>Detailed Solutions</Text>
              <Text style={styles.filterSectionCount}>
                Showing {filteredQuestions.length} of {questions.length}
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsScroll}
            >
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  reviewFilter === 'all' && styles.filterPillActive,
                ]}
                onPress={() => setReviewFilter('all')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    reviewFilter === 'all' && styles.filterPillTextActive,
                  ]}
                >
                  All ({questions.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterPill,
                  styles.filterPillWrong,
                  reviewFilter === 'incorrect' && styles.filterPillActiveWrong,
                ]}
                onPress={() => setReviewFilter('incorrect')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    styles.filterPillTextWrong,
                    reviewFilter === 'incorrect' && styles.filterPillTextActiveWhite,
                  ]}
                >
                  Wrong ({testResult.incorrect})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterPill,
                  styles.filterPillCorrect,
                  reviewFilter === 'correct' && styles.filterPillActiveCorrect,
                ]}
                onPress={() => setReviewFilter('correct')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    styles.filterPillTextCorrect,
                    reviewFilter === 'correct' && styles.filterPillTextActiveWhite,
                  ]}
                >
                  Correct ({testResult.correct})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterPill,
                  styles.filterPillSkip,
                  reviewFilter === 'unattempted' && styles.filterPillActiveSkip,
                ]}
                onPress={() => setReviewFilter('unattempted')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    styles.filterPillTextSkip,
                    reviewFilter === 'unattempted' && styles.filterPillTextActiveWhite,
                  ]}
                >
                  Skipped ({testResult.unanswered})
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* 5. QUESTION CARDS LIST */}
          <View style={styles.reviewQuestionsList}>
            {filteredQuestions.length === 0 ? (
              <View style={styles.emptyFilterCard}>
                <CheckCircle2 size={32} color="#94A3B8" />
                <Text style={styles.emptyFilterTitle}>No questions in this filter</Text>
                <Text style={styles.emptyFilterSub}>
                  Select another filter tab above to view other questions.
                </Text>
              </View>
            ) : (
              filteredQuestions.map((q) => {
                const qRawText = language === 'HI' ? (q.textHi || q.textEn) : (q.textEn || q.textHi);
                const qText = extractLanguageText(qRawText, language);

                const qRawOptions = language === 'HI' ? (q.optionsHi || q.optionsEn) : (q.optionsEn || q.optionsHi);
                const qOptions = (qRawOptions || []).map((opt: string) => extractLanguageText(opt, language));

                const qRawExp = language === 'HI' ? (q.explanationHi || q.explanationEn) : (q.explanationEn || q.explanationHi);
                const qExplanation = extractLanguageText(qRawExp, language);

                const isUserCorrect = q.isCorrect;
                const isUserWrong = q.isIncorrect;
                const isSkipped = q.isUnattempted;

                return (
                  <View key={q.id} style={styles.reviewQCard}>
                    {/* Question Meta Bar */}
                    <View style={styles.reviewQHeader}>
                      <View style={styles.reviewQNumGroup}>
                        <View style={styles.reviewQNumBadge}>
                          <Text style={styles.reviewQNumText}>Q{q.originalIndex + 1}</Text>
                        </View>
                        <Text style={styles.reviewQSecName}>{q.sectionName || 'General'}</Text>
                      </View>

                      {/* Status Badge */}
                      {isUserCorrect && (
                        <View style={styles.qStatusBadgeCorrect}>
                          <CheckCircle2 size={12} color="#16A34A" />
                          <Text style={styles.qStatusBadgeTextCorrect}>Correct (+{q.marks || 1})</Text>
                        </View>
                      )}
                      {isUserWrong && (
                        <View style={styles.qStatusBadgeWrong}>
                          <XCircle size={12} color="#DC2626" />
                          <Text style={styles.qStatusBadgeTextWrong}>
                            Incorrect {Number(q.negativeMark) > 0 ? `(-${q.negativeMark})` : '(0)'}
                          </Text>
                        </View>
                      )}
                      {isSkipped && (
                        <View style={styles.qStatusBadgeSkip}>
                          <Text style={styles.qStatusBadgeTextSkip}>Skipped (0)</Text>
                        </View>
                      )}
                    </View>

                    {/* Question Statement */}
                    <Text style={styles.reviewQText}>{qText}</Text>
                    {Boolean(q.questionImageUrl && q.questionImageUrl.trim()) && (
                      <TouchableOpacity 
                        activeOpacity={0.9} 
                        onPress={() => setPreviewImageUrl(q.questionImageUrl)} 
                        style={styles.imageCard}
                      >
                        <Image source={{ uri: q.questionImageUrl }} style={styles.qImage} contentFit="contain" />
                        <View style={styles.tapToZoomBadge}>
                          <ZoomIn size={10} color="#475569" />
                          <Text style={styles.tapToZoomText}>Tap to zoom</Text>
                        </View>
                      </TouchableOpacity>
                    )}

                    {/* Options list with clear user answer & correct answer tagging */}
                    <View style={styles.reviewOptionsList}>
                      {qOptions.map((optText: string, optIdx: number) => {
                        const isSelectedByStudent = q.userSelected === optIdx;
                        const isActuallyCorrect = q.correctAnswer === optIdx;

                        let optCardStyle: any = styles.reviewOptItem;
                        let optTextStyle: any = styles.reviewOptText;
                        let badgeView = null;

                        if (isSelectedByStudent && isActuallyCorrect) {
                          // Student chose correctly
                          optCardStyle = styles.reviewOptCorrect;
                          optTextStyle = styles.reviewOptTextCorrect;
                          badgeView = (
                            <View style={styles.optBadgeGreen}>
                              <Check size={11} color="#FFFFFF" strokeWidth={3} />
                              <Text style={styles.optBadgeGreenText}>Your Answer (Correct)</Text>
                            </View>
                          );
                        } else if (isSelectedByStudent && !isActuallyCorrect) {
                          // Student chose wrongly
                          optCardStyle = styles.reviewOptWrong;
                          optTextStyle = styles.reviewOptTextWrong;
                          badgeView = (
                            <View style={styles.optBadgeRed}>
                              <X size={11} color="#FFFFFF" strokeWidth={3} />
                              <Text style={styles.optBadgeRedText}>Your Answer (Wrong)</Text>
                            </View>
                          );
                        } else if (isActuallyCorrect) {
                          // Correct answer (not chosen by student)
                          optCardStyle = styles.reviewOptCorrectTarget;
                          optTextStyle = styles.reviewOptTextCorrectTarget;
                          badgeView = (
                            <View style={styles.optBadgeGreenOutline}>
                              <Check size={11} color="#16A34A" strokeWidth={3} />
                              <Text style={styles.optBadgeGreenOutlineText}>Correct Answer</Text>
                            </View>
                          );
                        }

                        return (
                          <View key={optIdx} style={optCardStyle}>
                            <View style={styles.reviewOptRow}>
                              <View style={[
                                styles.reviewOptIndexCircle,
                                isActuallyCorrect && styles.reviewOptIndexCircleGreen,
                                isSelectedByStudent && !isActuallyCorrect && styles.reviewOptIndexCircleRed,
                              ]}>
                                <Text style={[
                                  styles.reviewOptIndexText,
                                  (isActuallyCorrect || isSelectedByStudent) && styles.reviewOptIndexTextActive,
                                ]}>
                                  {String.fromCharCode(65 + optIdx)}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={optTextStyle}>{optText}</Text>
                                {optIdx === 0 && Boolean(q.optAImageUrl && q.optAImageUrl.trim()) && (
                                  <TouchableOpacity activeOpacity={0.9} onPress={() => setPreviewImageUrl(q.optAImageUrl)} style={styles.optImageCard}>
                                    <Image source={{ uri: q.optAImageUrl }} style={styles.optImage} contentFit="contain" />
                                  </TouchableOpacity>
                                )}
                                {optIdx === 1 && Boolean(q.optBImageUrl && q.optBImageUrl.trim()) && (
                                  <TouchableOpacity activeOpacity={0.9} onPress={() => setPreviewImageUrl(q.optBImageUrl)} style={styles.optImageCard}>
                                    <Image source={{ uri: q.optBImageUrl }} style={styles.optImage} contentFit="contain" />
                                  </TouchableOpacity>
                                )}
                                {optIdx === 2 && Boolean(q.optCImageUrl && q.optCImageUrl.trim()) && (
                                  <TouchableOpacity activeOpacity={0.9} onPress={() => setPreviewImageUrl(q.optCImageUrl)} style={styles.optImageCard}>
                                    <Image source={{ uri: q.optCImageUrl }} style={styles.optImage} contentFit="contain" />
                                  </TouchableOpacity>
                                )}
                                {optIdx === 3 && Boolean(q.optDImageUrl && q.optDImageUrl.trim()) && (
                                  <TouchableOpacity activeOpacity={0.9} onPress={() => setPreviewImageUrl(q.optDImageUrl)} style={styles.optImageCard}>
                                    <Image source={{ uri: q.optDImageUrl }} style={styles.optImage} contentFit="contain" />
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>

                            {badgeView && (
                              <View style={styles.reviewOptBadgeWrapper}>
                                {badgeView}
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>

                    {/* Detailed Solution & Explanation Box */}
                    <View style={styles.explanationBox}>
                      <View style={styles.explanationHeader}>
                        <BookOpen size={14} color="#0072FF" />
                        <Text style={styles.explanationTitle}>
                          {language === 'HI' ? 'समाधान एवं विस्तृत व्याख्या' : 'Detailed Solution & Explanation'}
                        </Text>
                      </View>

                      {qExplanation || (q.explanationImageUrl && q.explanationImageUrl.trim()) ? (
                        <View style={{ marginTop: 8 }}>
                          {!!qExplanation && <Text style={styles.explanationBodyText}>{qExplanation}</Text>}
                          {Boolean(q.explanationImageUrl && q.explanationImageUrl.trim()) && (
                            <TouchableOpacity activeOpacity={0.9} onPress={() => setPreviewImageUrl(q.explanationImageUrl)} style={styles.imageCard}>
                              <Image source={{ uri: q.explanationImageUrl }} style={styles.expImage} contentFit="contain" />
                              <View style={styles.tapToZoomBadge}>
                                <ZoomIn size={10} color="#475569" />
                                <Text style={styles.tapToZoomText}>Tap to zoom</Text>
                              </View>
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : (
                        <Text style={styles.explanationBodyText}>
                          {language === 'HI'
                            ? `सही उत्तर विकल्प (${String.fromCharCode(65 + q.correctAnswer)}) है: ${qOptions[q.correctAnswer]}`
                            : `The correct option is (${String.fromCharCode(65 + q.correctAnswer)}): ${qOptions[q.correctAnswer]}`}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

        {/* 6. BOTTOM ACTION BAR (Re-attempt & Finish) */}
        <View style={styles.reviewBottomBar}>
          <TouchableOpacity
            style={[
              styles.reviewReattemptBtn,
              attemptInfo.maxAttempts > 0 && attemptInfo.remainingAttempts <= 0 && { opacity: 0.55 }
            ]}
            activeOpacity={0.8}
            onPress={handleReattempt}
          >
            <RotateCcw size={15} color="#0072FF" />
            <Text style={styles.reviewReattemptBtnText}>
              {attemptInfo.maxAttempts > 0 && attemptInfo.remainingAttempts <= 0
                ? `Limit Reached (${attemptInfo.maxAttempts}/${attemptInfo.maxAttempts})`
                : attemptInfo.maxAttempts > 0 
                  ? `Re-attempt (${attemptInfo.remainingAttempts} left)`
                  : 'Re-attempt Test'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reviewDoneBtn}
            activeOpacity={0.85}
            onPress={() => router.back()}
          >
            <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.reviewDoneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* LEADERBOARD MODAL */}
        <Modal visible={isLeaderboardOpen} transparent animationType="slide">
          <View style={styles.leaderboardModalBackdrop}>
            <View style={styles.leaderboardModalCard}>
              {/* Header */}
              <View style={styles.leaderboardModalHeader}>
                <View style={styles.leaderboardModalHeaderLeft}>
                  <View style={styles.leaderboardTrophyWrap}>
                    <Trophy size={20} color="#F59E0B" />
                  </View>
                  <View>
                    <Text style={styles.leaderboardModalTitle}>State Leaderboard</Text>
                    <Text style={styles.leaderboardModalSub} numberOfLines={1}>
                      {testInfo?.title || 'Mock Test'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setIsLeaderboardOpen(false)}
                  style={styles.leaderboardCloseBtn}
                >
                  <X size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Your Standing Banner */}
              <View style={styles.myRankBanner}>
                <View style={styles.myRankLeft}>
                  <View style={styles.myRankBadge}>
                    <Text style={styles.myRankBadgeText}>
                      #{testResult?.rank || 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.myRankTitle}>Your State Standing</Text>
                    <Text style={styles.myRankSubtitle} numberOfLines={1}>
                      {user?.name || 'You'} • {testResult?.score ?? 0}/{testResult?.totalMarks ?? 0} Marks ({testResult?.percentile ?? 100}%ile)
                    </Text>
                  </View>
                </View>
              </View>

              {/* Leaderboard List / Podium */}
              {renderLeaderboardBody()}

              {/* Modal Close Button */}
              <TouchableOpacity
                style={styles.leaderboardModalDoneBtn}
                onPress={() => setIsLeaderboardOpen(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.leaderboardModalDoneBtnText}>Close Leaderboard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* FULL SCREEN IMAGE PREVIEW MODAL */}
        <Modal visible={!!previewImageUrl} transparent animationType="fade">
          <View style={styles.imagePreviewBackdrop}>
            <TouchableOpacity 
              style={styles.imagePreviewCloseBtn} 
              onPress={() => setPreviewImageUrl(null)}
            >
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
            {previewImageUrl && (
              <Image 
                source={{ uri: previewImageUrl }} 
                style={styles.fullPreviewImage} 
                contentFit="contain" 
              />
            )}
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  const rawText = language === 'HI' ? (question.textHi || question.textEn) : (question.textEn || question.textHi);
  const currentText = extractLanguageText(rawText, language);

  const rawOptions = language === 'HI' ? (question.optionsHi || question.optionsEn) : (question.optionsEn || question.optionsHi);
  const currentOptions = (rawOptions || []).map((opt: string) => extractLanguageText(opt, language));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      
      {/* 1. TOP HEADER (Dark Navy) */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.jtLogo}>
            <Text style={styles.jtLogoText}>JT</Text>
          </View>
          <Text style={styles.testTitleText} numberOfLines={1}>
            {testInfo?.title || 'Mock Test'}
          </Text>
        </View>

        <View style={styles.topBarRight}>
          <View style={styles.timerBadge}>
            <Clock size={14} color="#10B981" />
            <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
          </View>

          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => setIsHelpModalOpen(true)}
          >
            <HelpCircle size={16} color="#F59E0B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. SUB-HEADER TOOLBAR (Question No. & Marks badges on the left, Tools on the right) */}
      <View style={styles.subHeader}>
        {/* Left: Question No Dark Circular Badge */}
        <View style={styles.qNumMarksGroup}>
          <View style={styles.qCircleBadge}>
            <Text style={styles.qCircleBadgeText}>{currentQ + 1}</Text>
          </View>
        </View>

        {/* Right: Font Zoom, Language Switcher, Drawer Menu */}
        <View style={styles.subHeaderRight}>
          {/* Font Zoom */}
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={handleCycleFontSize}
          >
            <Text style={styles.fontZoomText}>
              A <Text style={styles.fontZoomScale}>{fontSizeScale}x</Text>
            </Text>
          </TouchableOpacity>

          {/* Language Switcher */}
          <TouchableOpacity
            style={styles.langBtn}
            onPress={() => setLanguage((prev) => (prev === 'HI' ? 'EN' : 'HI'))}
          >
            <Text style={styles.langBtnText}>{language === 'HI' ? 'हिंदी' : 'English'}</Text>
          </TouchableOpacity>

          {/* Question Palette Menu Toggle */}
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setIsDrawerOpen(true)}
          >
            <Menu size={18} color="#334155" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. CLEAN QUESTION CARD CONTENT AREA */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.questionCard}>
          {/* Question Statement */}
          <Text
            style={[
              styles.questionStatement,
              { fontSize: 16.5 * fontSizeScale, lineHeight: 25 * fontSizeScale },
            ]}
          >
            {currentText}
          </Text>
          {Boolean(question.questionImageUrl && question.questionImageUrl.trim()) && (
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => setPreviewImageUrl(question.questionImageUrl)} 
              style={styles.imageCard}
            >
              <Image source={{ uri: question.questionImageUrl }} style={styles.qImage} contentFit="contain" />
              <View style={styles.tapToZoomBadge}>
                <ZoomIn size={10} color="#475569" />
                <Text style={styles.tapToZoomText}>Tap to zoom</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Options List */}
          <View style={styles.optionsContainer}>
            {currentOptions.map((opt: string, idx: number) => {
              const isSelected = answers[question.id] === idx;
              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  onPress={() => selectOption(idx)}
                  style={[
                    styles.optionItem,
                    isSelected && styles.optionItemSelected,
                  ]}
                >
                  <View style={styles.optionContentLeft}>
                    <Text
                      style={[
                        styles.optionNumText,
                        isSelected && styles.optionNumTextSelected,
                      ]}
                    >
                      {idx + 1}.
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.optionTitleText,
                          isSelected && styles.optionTitleTextSelected,
                          { fontSize: 14.5 * fontSizeScale },
                        ]}
                      >
                        {opt}
                      </Text>
                      {idx === 0 && Boolean(question.optAImageUrl && question.optAImageUrl.trim()) && (
                        <TouchableOpacity activeOpacity={0.9} onPress={() => setPreviewImageUrl(question.optAImageUrl)} style={styles.optImageCard}>
                          <Image source={{ uri: question.optAImageUrl }} style={styles.optImage} contentFit="contain" />
                        </TouchableOpacity>
                      )}
                      {idx === 1 && Boolean(question.optBImageUrl && question.optBImageUrl.trim()) && (
                        <TouchableOpacity activeOpacity={0.9} onPress={() => setPreviewImageUrl(question.optBImageUrl)} style={styles.optImageCard}>
                          <Image source={{ uri: question.optBImageUrl }} style={styles.optImage} contentFit="contain" />
                        </TouchableOpacity>
                      )}
                      {idx === 2 && Boolean(question.optCImageUrl && question.optCImageUrl.trim()) && (
                        <TouchableOpacity activeOpacity={0.9} onPress={() => setPreviewImageUrl(question.optCImageUrl)} style={styles.optImageCard}>
                          <Image source={{ uri: question.optCImageUrl }} style={styles.optImage} contentFit="contain" />
                        </TouchableOpacity>
                      )}
                      {idx === 3 && Boolean(question.optDImageUrl && question.optDImageUrl.trim()) && (
                        <TouchableOpacity activeOpacity={0.9} onPress={() => setPreviewImageUrl(question.optDImageUrl)} style={styles.optImageCard}>
                          <Image source={{ uri: question.optDImageUrl }} style={styles.optImage} contentFit="contain" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Circular checkmark badge on selected */}
                  {isSelected && (
                    <View style={styles.checkmarkCircle}>
                      <Check size={12} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Mark / Flag button under options */}
          <TouchableOpacity
            style={[
              styles.flagRowBtn,
              markedForReview.has(question.id) && styles.flagRowBtnActive,
            ]}
            activeOpacity={0.7}
            onPress={toggleReview}
          >
            <Flag
              size={14}
              color={markedForReview.has(question.id) ? '#9333EA' : '#64748B'}
              fill={markedForReview.has(question.id) ? '#9333EA' : 'none'}
            />
            <Text
              style={[
                styles.flagRowText,
                markedForReview.has(question.id) && styles.flagRowTextActive,
              ]}
            >
              {markedForReview.has(question.id) ? 'Marked for Review' : 'Mark for Review'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 4. BOTTOM FIXED ACTION BAR */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.prevBtn, currentQ === 0 && styles.prevBtnDisabled]}
          activeOpacity={0.8}
          disabled={currentQ === 0}
          onPress={() => setCurrentQ((prev) => Math.max(0, prev - 1))}
        >
          <Text style={[styles.prevText, currentQ === 0 && styles.prevTextDisabled]}>Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.clearBtn}
          activeOpacity={0.8}
          onPress={clearOption}
        >
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.saveNextBtn}
          activeOpacity={0.85}
          onPress={handleSaveAndNext}
        >
          <Text style={styles.saveNextText}>
            {currentQ < questions.length - 1 ? 'Save & Next' : 'Submit All'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 5. ULTRA-PREMIUM RIGHT SIDE DRAWER */}
      <Modal visible={isDrawerOpen} transparent animationType="fade">
        <View style={styles.rightDrawerOverlay}>
          <TouchableOpacity
            style={styles.rightDrawerBackdrop}
            activeOpacity={1}
            onPress={() => setIsDrawerOpen(false)}
          />

          <View style={styles.rightDrawerCard}>
            {/* Top Gradient Header */}
            <View style={styles.drawerHeader}>
              <View style={styles.drawerHeaderLeft}>
                <View style={styles.drawerHeaderIconBox}>
                  <Layers size={18} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.drawerTitle}>Question Palette</Text>
                  <Text style={styles.drawerSubTitle}>
                    {answeredCount}/{questions.length} Attempted
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setIsDrawerOpen(false)}
                style={styles.drawerCloseBtn}
              >
                <X size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>



            {/* Section Tab Filters if multiple sections exist */}
            {sections.length > 1 && (
              <View style={styles.drawerSecFilterWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}
                >
                  <TouchableOpacity
                    onPress={() => setSelectedDrawerSection('ALL')}
                    style={[
                      styles.drawerSecTabPill,
                      selectedDrawerSection === 'ALL' && styles.drawerSecTabPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.drawerSecTabPillText,
                        selectedDrawerSection === 'ALL' && styles.drawerSecTabPillTextActive,
                      ]}
                    >
                      All ({questions.length})
                    </Text>
                  </TouchableOpacity>

                  {sections.map((sec, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setSelectedDrawerSection(sec.name)}
                      style={[
                        styles.drawerSecTabPill,
                        selectedDrawerSection === sec.name && styles.drawerSecTabPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.drawerSecTabPillText,
                          selectedDrawerSection === sec.name && styles.drawerSecTabPillTextActive,
                        ]}
                      >
                        {sec.name} ({sec.count})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Questions Grid with Enhanced Cards */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 14, paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.qGridContainer}>
                {drawerQuestions.map((q: any) => {
                  const idx = q.globalIndex;
                  const status = getQuestionStatus(q.id);
                  const isCurrent = idx === currentQ;

                  let boxBg = '#FFFFFF';
                  let boxBorder = '#E2E8F0';
                  let textCol = '#475569';
                  let isDotMarked = false;

                  if (status === 'answered') {
                    boxBg = '#10B981';
                    boxBorder = '#059669';
                    textCol = '#FFFFFF';
                  } else if (status === 'marked') {
                    boxBg = '#9333EA';
                    boxBorder = '#7E22CE';
                    textCol = '#FFFFFF';
                  } else if (status === 'answered-marked') {
                    boxBg = '#7E22CE';
                    boxBorder = '#10B981';
                    textCol = '#FFFFFF';
                    isDotMarked = true;
                  } else if (status === 'not-answered') {
                    boxBg = '#FEF3C7';
                    boxBorder = '#FCD34D';
                    textCol = '#92400E';
                  }

                  return (
                    <TouchableOpacity
                      key={q.id || idx}
                      activeOpacity={0.7}
                      onPress={() => {
                        setCurrentQ(idx);
                        setIsDrawerOpen(false);
                      }}
                      style={[
                        styles.paletteCard,
                        { backgroundColor: boxBg, borderColor: boxBorder },
                        isCurrent && styles.paletteCardCurrent,
                      ]}
                    >
                      <Text style={[styles.paletteNumText, { color: textCol }]}>
                        {idx + 1}
                      </Text>

                      {isDotMarked && (
                        <View style={styles.dotIndicator} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Footer with Legend & Submit Button */}
            <View style={styles.drawerFooterModern}>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.legendLabel}>Answered</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D', borderWidth: 1 }]} />
                  <Text style={styles.legendLabel}>Not Answered</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: '#9333EA' }]} />
                  <Text style={styles.legendLabel}>Marked</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderWidth: 1 }]} />
                  <Text style={styles.legendLabel}>Not Visited</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.drawerSubmitBtnModern}
                activeOpacity={0.85}
                onPress={() => {
                  setIsDrawerOpen(false);
                  handleConfirmSubmit();
                }}
              >
                <Text style={styles.drawerSubmitTextModern}>Submit Full Test</Text>
                <Send size={15} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 6. HELP & INSTRUCTIONS MODAL */}
      <Modal visible={isHelpModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.helpCard}>
            <View style={styles.helpHeader}>
              <Text style={styles.helpTitle}>Test Instructions</Text>
              <TouchableOpacity onPress={() => setIsHelpModalOpen(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View style={styles.helpBody}>
              <Text style={styles.helpBullet}>• Tap options 1-4 to select your answer.</Text>
              <Text style={styles.helpBullet}>• Tap "Save & Next" to save and move forward.</Text>
              <Text style={styles.helpBullet}>• Tap "Mark & Next" to flag questions for review.</Text>
              <Text style={styles.helpBullet}>• Use the top language button to switch English/Hindi.</Text>
              <Text style={styles.helpBullet}>• Tap ☰ to open the question palette from the right.</Text>
            </View>
            <TouchableOpacity
              style={styles.helpCloseBtn}
              onPress={() => setIsHelpModalOpen(false)}
            >
              <Text style={styles.helpCloseBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 7. FULL SCREEN LOADING MODAL FOR SUBMITTING */}
      <Modal visible={submitting} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.helpCard, { alignItems: 'center', paddingVertical: 32 }]}>
            <ActivityIndicator size="large" color="#0072FF" />
            <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '700', color: '#0F172A' }}>Submitting Test...</Text>
            <Text style={{ marginTop: 8, fontSize: 13, color: '#64748B', textAlign: 'center' }}>Please wait while we calculate your score and rank.</Text>
          </View>
        </View>
      </Modal>

      {/* 8. FULL SCREEN IMAGE PREVIEW MODAL */}
      <Modal visible={!!previewImageUrl} transparent animationType="fade">
        <View style={styles.imagePreviewBackdrop}>
          <TouchableOpacity 
            style={styles.imagePreviewCloseBtn} 
            onPress={() => setPreviewImageUrl(null)}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {previewImageUrl && (
            <Image 
              source={{ uri: previewImageUrl }} 
              style={styles.fullPreviewImage} 
              contentFit="contain" 
            />
          )}
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  imageCard: {
    width: '100%',
    marginTop: 12,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  optImageCard: {
    width: '100%',
    marginTop: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optImage: {
    width: '100%',
    height: 110,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  expImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  tapToZoomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-end',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tapToZoomText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  imagePreviewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  imagePreviewCloseBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 50,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPreviewImage: {
    width: Dimensions.get('window').width - 32,
    height: Dimensions.get('window').height * 0.7,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },

  /* 1. TOP BAR */
  topBar: {
    backgroundColor: '#0072FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  jtLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jtLogoText: {
    color: '#0072FF',
    fontWeight: '900',
    fontSize: 12,
  },
  testTitleText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    flex: 1,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
  },
  timerText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  helpButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* 2. SUB-HEADER TOOLBAR */
  subHeader: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  qNumMarksGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qCircleBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0072FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qCircleBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  posMarkBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  posMarkText: {
    color: '#059669',
    fontWeight: '900',
    fontSize: 12,
  },
  negMarkBadge: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FFE4E6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  negMarkText: {
    color: '#E11D48',
    fontWeight: '900',
    fontSize: 12,
  },
  subHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  fontZoomText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
  },
  fontZoomScale: {
    color: '#0072FF',
  },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  menuBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 6,
    borderRadius: 8,
  },

  /* 3. QUESTION CARD */
  scrollArea: {
    flex: 1,
  },
  scrollInner: {
    padding: 14,
    paddingBottom: 24,
  },
  questionCard: {
    paddingVertical: 4,
  },
  questionStatement: {
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
  },
  optionItemSelected: {
    borderColor: '#0072FF',
    borderWidth: 2,
    backgroundColor: '#EFF6FF',
  },
  optionContentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionNumText: {
    fontSize: 15,
    fontStyle: 'italic',
    fontWeight: '700',
    color: '#94A3B8',
    marginRight: 10,
  },
  optionNumTextSelected: {
    color: '#0072FF',
    fontWeight: '900',
  },
  optionTitleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  optionTitleTextSelected: {
    color: '#0F172A',
    fontWeight: '800',
  },
  checkmarkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0072FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  flagRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  flagRowBtnActive: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
  },
  flagRowText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  flagRowTextActive: {
    color: '#9333EA',
    fontWeight: '800',
  },

  /* 4. BOTTOM BAR */
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  prevBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 11,
    borderRadius: 20,
    alignItems: 'center',
  },
  prevBtnDisabled: {
    opacity: 0.45,
    backgroundColor: '#F8FAFC',
  },
  prevText: {
    color: '#334155',
    fontWeight: '800',
    fontSize: 12,
  },
  prevTextDisabled: {
    color: '#94A3B8',
  },
  clearBtn: {
    flex: 0.8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 11,
    borderRadius: 20,
    alignItems: 'center',
  },
  clearText: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 12,
  },
  saveNextBtn: {
    flex: 1.2,
    backgroundColor: '#1677FF',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#1677FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  saveNextText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },

  /* 5. ULTRA-PREMIUM RIGHT SIDE DRAWER */
  rightDrawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  rightDrawerBackdrop: {
    flex: 1,
  },
  rightDrawerCard: {
    backgroundColor: '#FFFFFF',
    width: Math.min(width * 0.85, 340),
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
    display: 'flex',
    flexDirection: 'column',
  },
  drawerHeader: {
    backgroundColor: '#0072FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  drawerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drawerHeaderIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  drawerSubTitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  drawerCloseBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Section pill bar */
  drawerSecFilterWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 5,
  },
  drawerSecTabPill: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  drawerSecTabPillActive: {
    backgroundColor: '#0072FF',
    borderColor: '#0072FF',
  },
  drawerSecTabPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  drawerSecTabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  /* Question Grid Cards */
  qGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  paletteCard: {
    width: (Math.min(width * 0.85, 340) - 52) / 5,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 1.5,
    elevation: 1,
    position: 'relative',
  },
  paletteCardCurrent: {
    borderWidth: 2,
    borderColor: '#0072FF',
    transform: [{ scale: 1.05 }],
  },
  paletteNumText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  dotIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },

  /* Footer */
  drawerFooterModern: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendBox: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },
  drawerSubmitBtnModern: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  drawerSubmitTextModern: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },

  /* MODALS */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  helpCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    width: '100%',
    maxWidth: 340,
  },
  helpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  helpTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  helpBody: {
    gap: 8,
    marginBottom: 16,
  },
  helpBullet: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  helpCloseBtn: {
    backgroundColor: '#0072FF',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  helpCloseBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  /* RESULT MODAL */
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  resultIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  resultMainTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  resultSubTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 14,
  },
  resultScoreContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  resultScoreBox: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 10,
    marginBottom: 10,
  },
  resultScoreValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0072FF',
  },
  resultScoreMax: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '700',
  },
  resultScoreLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 2,
  },
  statsPillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statPillLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  resultBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  resultBackBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  resultBackBtnText: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 13,
  },
  resultPrimaryBtn: {
    flex: 1.3,
    paddingVertical: 12,
    backgroundColor: '#0072FF',
    borderRadius: 12,
    alignItems: 'center',
  },
  resultPrimaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  /* TEST REVIEW & SOLUTIONS SCREEN STYLES */
  reviewSafeArea: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  reviewNavBar: {
    backgroundColor: '#0072FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  reviewNavBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  reviewNavBackText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  reviewNavTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  reviewNavTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  reviewNavSubtitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  reviewLangBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  reviewLangBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  reviewScroll: {
    flex: 1,
  },
  reviewScrollContent: {
    padding: 14,
    paddingBottom: 90,
  },
  reviewHeroCard: {
    backgroundColor: '#0072FF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroBadgeText: {
    color: '#F59E0B',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  heroUserGreet: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 12,
  },
  scoreRowContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  scoreBoxLarge: {
    flex: 1.1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
  },
  scoreLabelSmall: {
    color: '#E0F2FE',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  scoreValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValueBig: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  scoreValueMax: {
    color: '#BAE6FD',
    fontSize: 14,
    fontWeight: '700',
  },
  scorePercentageText: {
    color: '#6EE7B7',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  rankPercentileBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'space-around',
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankItemLabel: {
    color: '#E0F2FE',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rankItemValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  rankItemTotal: {
    color: '#BAE6FD',
    fontSize: 10,
    fontWeight: '600',
  },
  rankDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 6,
  },
  heroSecondaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  heroSecItem: {
    alignItems: 'center',
    flex: 1,
  },
  heroSecLabel: {
    color: '#E0F2FE',
    fontSize: 10,
    fontWeight: '600',
  },
  heroSecValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  heroSecDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  /* LEADERBOARD ACTION BANNER */
  leaderboardActionBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  leaderboardBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  leaderboardIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardBannerTitle: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  liveLeaderboardTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveLeaderboardTagText: {
    color: '#15803D',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  leaderboardBannerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  leaderboardActionBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  leaderboardBtnText: {
    color: '#0072FF',
    fontWeight: '800',
    fontSize: 12,
  },

  /* LEADERBOARD MODAL STYLES */
  leaderboardModalBackdrop: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  leaderboardModalCard: {
    backgroundColor: '#F8FAFC',
    flex: 1,
    padding: 18,
    paddingTop: 48,
    paddingBottom: 24,
  },
  leaderboardModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  leaderboardModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  leaderboardTrophyWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  leaderboardModalSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },
  leaderboardCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myRankBanner: {
    backgroundColor: '#0072FF',
    borderRadius: 14,
    padding: 12,
    marginVertical: 12,
  },
  myRankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  myRankBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  myRankBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  myRankTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  myRankSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  leaderboardLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  leaderboardLoadingText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  leaderboardEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  leaderboardEmptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
    marginTop: 12,
  },
  leaderboardEmptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  /* PODIUM STYLES */
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 6,
    marginVertical: 8,
    gap: 8,
  },
  podiumCol: {
    alignItems: 'center',
    flex: 1,
  },
  podiumColLeft: {
    flex: 1,
  },
  podiumColCenter: {
    flex: 1.15,
  },
  podiumColRight: {
    flex: 1,
  },
  podiumAvatarWrap: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: 4,
  },
  podiumAvatarWrapCenter: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: 6,
  },
  podiumCrownEmoji: {
    fontSize: 22,
    marginBottom: -4,
  },
  podiumEmoji: {
    fontSize: 18,
    marginBottom: 1,
  },
  podiumEmojiMuted: {
    fontSize: 18,
    opacity: 0.35,
    marginBottom: 8,
  },
  podiumAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0072FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
  },
  podiumAvatarGold: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderColor: '#F59E0B',
    backgroundColor: '#0072FF',
    borderWidth: 3,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  podiumAvatarSilver: {
    borderColor: '#94A3B8',
  },
  podiumAvatarBronze: {
    borderColor: '#D97706',
  },
  podiumAvatarInitials: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  podiumAvatarInitialsGold: {
    color: '#FCD34D',
    fontWeight: '900',
    fontSize: 20,
  },
  podiumRankTag: {
    position: 'absolute',
    bottom: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  podiumRankTagGold: {
    backgroundColor: '#F59E0B',
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  podiumRankTagSilver: {
    backgroundColor: '#94A3B8',
  },
  podiumRankTagBronze: {
    backgroundColor: '#D97706',
  },
  podiumRankTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 8,
    textAlign: 'center',
  },
  podiumNameGold: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 8,
    textAlign: 'center',
  },
  podiumScore: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 1,
    marginBottom: 6,
  },
  podiumScoreGold: {
    fontSize: 12,
    fontWeight: '800',
    color: '#16A34A',
    marginTop: 1,
    marginBottom: 6,
  },
  youPillSmall: {
    backgroundColor: '#0072FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  youPillSmallText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  podiumPedestal: {
    width: '100%',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumPedestalGold: {
    height: 75,
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  podiumPedestalSilver: {
    height: 56,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  podiumPedestalBronze: {
    height: 44,
    backgroundColor: '#FFEDD5',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
  },
  podiumPedestalEmpty: {
    height: 44,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  podiumEmptyPedestalText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  podiumPedestalRankNum: {
    fontSize: 13,
    fontWeight: '900',
    color: '#64748B',
  },
  podiumPedestalRankNumGold: {
    fontSize: 16,
    fontWeight: '900',
    color: '#D97706',
  },
  podiumEmptyCol: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
    paddingTop: 36,
  },
  otherRankersTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  leaderboardList: {
    gap: 8,
    paddingBottom: 16,
  },
  leaderboardRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  leaderboardRowCurrentUser: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 1.5,
  },
  rankNumberBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankNumberBoxGold: {
    backgroundColor: '#F59E0B',
  },
  rankNumberBoxSilver: {
    backgroundColor: '#94A3B8',
  },
  rankNumberBoxBronze: {
    backgroundColor: '#D97706',
  },
  rankNumberText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#475569',
  },
  rankNumberTextMedal: {
    color: '#FFFFFF',
  },
  leaderboardUserCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  leaderboardAvatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0072FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardAvatarInitials: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  leaderboardUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  youPill: {
    backgroundColor: '#0072FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  youPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  leaderboardUserAcc: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  leaderboardScoreCol: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  leaderboardScoreVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#16A34A',
  },
  leaderboardScoreMax: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
  },
  leaderboardModalDoneBtn: {
    backgroundColor: '#0072FF',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  leaderboardModalDoneBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  filterSectionHeader: {
    marginBottom: 12,
  },
  filterTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  filterSectionCount: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  filterPillsScroll: {
    gap: 8,
    paddingBottom: 2,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  filterPillActive: {
    backgroundColor: '#0072FF',
    borderColor: '#0072FF',
  },
  filterPillWrong: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF5F5',
  },
  filterPillActiveWrong: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  filterPillCorrect: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  filterPillActiveCorrect: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  filterPillSkip: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  filterPillActiveSkip: {
    backgroundColor: '#64748B',
    borderColor: '#64748B',
  },
  filterPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  filterPillTextWrong: {
    color: '#DC2626',
  },
  filterPillTextCorrect: {
    color: '#16A34A',
  },
  filterPillTextSkip: {
    color: '#64748B',
  },
  filterPillTextActiveWhite: {
    color: '#FFFFFF',
  },
  reviewQuestionsList: {
    gap: 14,
  },
  emptyFilterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 10,
  },
  emptyFilterTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
    marginTop: 10,
  },
  emptyFilterSub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  reviewQCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewQHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  reviewQNumGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewQNumBadge: {
    backgroundColor: '#0072FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reviewQNumText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
  },
  reviewQSecName: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  qStatusBadgeCorrect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  qStatusBadgeTextCorrect: {
    color: '#15803D',
    fontSize: 10.5,
    fontWeight: '800',
  },
  qStatusBadgeWrong: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  qStatusBadgeTextWrong: {
    color: '#B91C1C',
    fontSize: 10.5,
    fontWeight: '800',
  },
  qStatusBadgeSkip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  qStatusBadgeTextSkip: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '800',
  },
  reviewQText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 22,
    marginBottom: 12,
  },
  reviewOptionsList: {
    gap: 8,
    marginBottom: 12,
  },
  reviewOptItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  reviewOptCorrect: {
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#10B981',
    padding: 10,
  },
  reviewOptWrong: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    padding: 10,
  },
  reviewOptCorrectTarget: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#22C55E',
    borderStyle: 'dashed',
    padding: 10,
  },
  reviewOptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  reviewOptIndexCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  reviewOptIndexCircleGreen: {
    backgroundColor: '#10B981',
  },
  reviewOptIndexCircleRed: {
    backgroundColor: '#EF4444',
  },
  reviewOptIndexText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
  },
  reviewOptIndexTextActive: {
    color: '#FFFFFF',
  },
  reviewOptText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  reviewOptTextCorrect: {
    fontSize: 13,
    color: '#065F46',
    fontWeight: '800',
    flex: 1,
    lineHeight: 18,
  },
  reviewOptTextWrong: {
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '700',
    flex: 1,
    lineHeight: 18,
  },
  reviewOptTextCorrectTarget: {
    fontSize: 13,
    color: '#15803D',
    fontWeight: '800',
    flex: 1,
    lineHeight: 18,
  },
  reviewOptBadgeWrapper: {
    marginTop: 6,
    marginLeft: 30,
  },
  optBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  optBadgeGreenText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  optBadgeRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444',
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  optBadgeRedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  optBadgeGreenOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  optBadgeGreenOutlineText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
  },
  explanationBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 4,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  explanationTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  explanationBodyText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    fontWeight: '500',
  },
  reviewBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 8,
  },
  reviewReattemptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  reviewReattemptBtnText: {
    color: '#0072FF',
    fontWeight: '800',
    fontSize: 13,
  },
  reviewDoneBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0072FF',
    paddingVertical: 12,
    borderRadius: 12,
  },
  reviewDoneBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
