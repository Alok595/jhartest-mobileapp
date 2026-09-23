import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, ChevronRight, ArrowLeft, Play } from 'lucide-react-native';
import { getApiBaseUrl } from '../../../services/api';

export default function SubcategoryExploreScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [exams, setExams] = useState<any[]>([]);
  const [testSeries, setTestSeries] = useState<any[]>([]);
  const [subcategory, setSubcategory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const subRes = await fetch(`${getApiBaseUrl()}/subcategories/${id}`);
        const subData = await subRes.json();
        setSubcategory(subData);

        // Fetch all exams, we will filter locally for now (in real app backend should filter)
        const examsRes = await fetch(`${getApiBaseUrl()}/exams`);
        const allExams = await examsRes.json();
        const subExams = allExams.filter((e: any) => e.subcategoryId === id);
        setExams(subExams);
        
        // Fetch test series
        if (subExams.length > 0) {
          const tsRes = await fetch(`${getApiBaseUrl()}/test-series`);
          const allTs = await tsRes.json();
          setTestSeries(allTs);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchData();
    }
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <ArrowLeft color="#0F172A" size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{subcategory?.name || 'Test Series'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {exams.length === 0 ? (
          <View style={styles.emptyCard}>
            <FileText color="#CBD5E1" size={36} />
            <Text style={styles.emptyText}>No test series available in this topic yet.</Text>
          </View>
        ) : (
          exams.map((exam: any) => {
            const seriesList = testSeries.filter((ts: any) => ts.examId === exam.id);
            return (
              <View key={exam.id} style={styles.examGroup}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{exam.name}</Text>
                  <Text style={styles.sectionCount}>{seriesList.length} Series</Text>
                </View>

                {seriesList.length === 0 && (
                  <View style={styles.emptySubCard}>
                    <Text style={styles.emptySubText}>No test series created under this exam yet.</Text>
                  </View>
                )}

                {seriesList.map((series: any) => {
                  const discountPercent = series.price && series.discountPrice && series.price > series.discountPrice 
                    ? Math.round(((series.price - series.discountPrice) / series.price) * 100) 
                    : 0;
                  const finalPrice = series.discountPrice || series.price;

                  return (
                    <TouchableOpacity 
                      key={series.id} 
                      style={styles.card}
                      onPress={() => router.push(`/series/${series.id}`)}
                      activeOpacity={0.8}
                    >
                      {/* Left Side: Thumbnail with New Badge */}
                      <View style={styles.thumbnailContainer}>
                        {series.image ? (
                          <Image source={{ uri: series.image }} style={styles.thumbnailImage} />
                        ) : (
                          <View style={styles.thumbnailPlaceholder}>
                            <Play size={28} color={!series.isFree ? '#059669' : '#0284C7'} />
                          </View>
                        )}
                        <View style={styles.newBadge}>
                          <View style={styles.newBadgeDot} />
                          <Text style={styles.newBadgeText}>New</Text>
                        </View>
                      </View>

                      {/* Right Side: Content */}
                      <View style={styles.cardContent}>
                        <View>
                          <Text style={[styles.cardTitle, { fontSize: 15 }]} numberOfLines={2}>
                            {series.title}
                          </Text>
                          
                          <View style={styles.priceRow}>
                            {!series.isFree && (
                              <>
                                <Text style={styles.finalPrice}>
                                  ₹ {finalPrice}
                                </Text>
                                {series.price && series.discountPrice && (
                                  <Text style={styles.originalPrice}>₹ {series.price}</Text>
                                )}
                                
                                {discountPercent > 0 && (
                                  <View style={styles.cardDiscountPill}>
                                    <Text style={styles.cardDiscountText}>{discountPercent}% off</Text>
                                  </View>
                                )}
                              </>
                            )}
                          </View>
                        </View>

                        {/* Action Button Row */}
                        <View style={{ marginTop: 'auto', flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 6 }}>
                          <View style={{ 
                            backgroundColor: '#0072FF', 
                            paddingHorizontal: 12, 
                            paddingVertical: 5, 
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                          }}>
                            <Text style={{ 
                              color: '#FFFFFF', 
                              fontSize: 11, 
                              fontWeight: '700' 
                            }}>
                              {!series.isFree ? 'Buy Series' : 'View Series'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC'
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  content: {
    padding: 16,
  },
  examGroup: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 10,
  },
  emptySubCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 10,
  },
  emptySubText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    padding: 8,
    gap: 12,
  },
  thumbnailContainer: {
    width: 145,
    height: 95,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    contentFit: 'contain',
  },
  thumbnailPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    width: '100%',
    height: '100%',
  },
  newBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderBottomRightRadius: 8,
  },
  newBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
    marginRight: 4,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 18,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  finalPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  originalPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  cardDiscountPill: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  cardDiscountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },
});
