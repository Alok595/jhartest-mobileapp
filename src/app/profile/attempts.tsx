import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Clock, ArrowLeft, Award, Calendar, RefreshCcw } from 'lucide-react-native';
import { fetchUserAttempts } from '../../services/api';

export default function AttemptsHistoryScreen() {
  const router = useRouter();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAttempts = async () => {
    setLoading(true);
    const data = await fetchUserAttempts();
    if (data && Array.isArray(data)) {
      setAttempts(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAttempts();
  }, []);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attempt History</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadAttempts}>
          <RefreshCcw size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#0072FF" />
            <Text style={styles.loadingText}>Loading your history...</Text>
          </View>
        ) : attempts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Award size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Attempts Yet</Text>
            <Text style={styles.emptySub}>Take a mock test to see your performance history here.</Text>
            <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/(tabs)')}>
              <Text style={styles.exploreBtnText}>Explore Tests</Text>
            </TouchableOpacity>
          </View>
        ) : (
          attempts.map((attempt) => (
            <TouchableOpacity 
              key={attempt.id} 
              style={styles.card} 
              activeOpacity={0.7}
              onPress={() => {
                 router.push({ pathname: '/result/[id]', params: { id: attempt.id } });
              }}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.testTitle} numberOfLines={1}>{attempt.testTitle || 'Mock Test'}</Text>
                  <View style={styles.dateRow}>
                    <Calendar size={12} color="#6B7280" />
                    <Text style={styles.dateText}>{formatDate(attempt.createdAt)}</Text>
                  </View>
                </View>
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: attempt.status === 'SUBMITTED' ? '#EFF6FF' : '#F1F5F9' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: attempt.status === 'SUBMITTED' ? '#0072FF' : '#64748B' }
                  ]}>
                    {attempt.status === 'SUBMITTED' ? 'Completed' : 'Draft'}
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Score</Text>
                  <Text style={[styles.statValue, { color: '#0072FF' }]}>{attempt.score}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Accuracy</Text>
                  <Text style={[styles.statValue, { color: '#0072FF' }]}>{attempt.accuracy}%</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Time</Text>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4}}>
                    <Clock size={12} color="#64748B" />
                    <Text style={styles.timeValue}>{formatTime(attempt.timeTaken || 0)}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  backBtn: { padding: 8, marginLeft: -8 },
  refreshBtn: { padding: 8, marginRight: -8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  loadingBox: { alignItems: 'center', marginTop: 100 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B', fontWeight: '600' },
  emptyBox: { alignItems: 'center', marginTop: 80, padding: 24, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 20 },
  exploreBtn: { backgroundColor: '#0072FF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, shadowColor: '#0072FF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 2 },
  exploreBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#0072FF', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardHeaderLeft: { flex: 1, marginRight: 12 },
  testTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 6 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  statCol: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#E2E8F0', marginVertical: 4 },
  statLabel: { fontSize: 11, color: '#64748B', fontWeight: '600', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '900' },
  timeValue: { fontSize: 14, fontWeight: '700', color: '#0F172A' }
});
