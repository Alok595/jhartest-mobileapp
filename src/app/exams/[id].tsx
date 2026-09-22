import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PlayCircle, ShieldAlert, ArrowLeft, Languages } from 'lucide-react-native';

export default function ExamDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const exam = {
    name: 'JSSC CGL Full Mock Test 1',
    category: 'Paper 3 - General Knowledge & Aptitude',
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0072FF" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Banner Header */}
        <View style={styles.heroHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.heroBackBtn} activeOpacity={0.7}>
            <ArrowLeft color="#FFFFFF" size={24} />
          </TouchableOpacity>
          <Text style={styles.categoryBadge}>{exam.category}</Text>
          <Text style={styles.heroTitle}>{exam.name}</Text>
          <Text style={styles.heroSubText}>Read the instructions and marking scheme below to begin.</Text>
        </View>

        {/* Instructions Card */}
        <View style={styles.contentSection}>
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
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.startButton}
          activeOpacity={0.85}
          onPress={() => router.push(`/test/${id}`)}
        >
          <Text style={styles.startButtonText}>Start Test Now</Text>
          <PlayCircle size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
