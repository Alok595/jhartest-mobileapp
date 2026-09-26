import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  PackageOpen,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Lock,
  ChevronRight,
  Layers,
  Sparkles,
  Calendar,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  BookOpen,
  LogIn,
  RotateCw,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { fetchMyOrders } from '../../services/api';

type FilterTab = 'ALL' | 'ACTIVE' | 'PENDING' | 'REJECTED';

export default function PurchasesTab() {
  const router = useRouter();
  const { user } = useAuth();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const res = await fetchMyOrders();
      if (res?.success && Array.isArray(res.data)) {
        setOrders(res.data);
      }
    } catch (err) {
      console.log('Error loading orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [user]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Recent';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'ALL') return orders;
    if (activeFilter === 'ACTIVE') return orders.filter((o) => o.status === 'APPROVED');
    if (activeFilter === 'PENDING')
      return orders.filter((o) => o.status === 'PENDING' || o.status === 'UNDER_REVIEW');
    if (activeFilter === 'REJECTED')
      return orders.filter((o) => o.status === 'REJECTED' || o.status === 'CANCELLED');
    return orders;
  }, [orders, activeFilter]);

  const counts = useMemo(() => {
    const active = orders.filter((o) => o.status === 'APPROVED').length;
    const pending = orders.filter(
      (o) => o.status === 'PENDING' || o.status === 'UNDER_REVIEW'
    ).length;
    const rejected = orders.filter(
      (o) => o.status === 'REJECTED' || o.status === 'CANCELLED'
    ).length;
    return { all: orders.length, active, pending, rejected };
  }, [orders]);

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Batches</Text>
          <Text style={styles.headerSubtitle}>Access your enrolled courses & tests</Text>
        </View>
        <View style={styles.loginRequiredContainer}>
          <View style={styles.lockIconCircle}>
            <Lock size={36} color="#0072FF" />
          </View>
          <Text style={styles.loginTitle}>Sign in to view your batches</Text>
          <Text style={styles.loginSub}>
            Track your course purchases, verification status, and continue learning directly.
          </Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#0072FF', '#0052D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginGradient}
            >
              <Text style={styles.loginBtnText}>Log In to Your Account</Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: any }) => {
    const isApproved = item.status === 'APPROVED';
    const isPending = item.status === 'PENDING' || item.status === 'UNDER_REVIEW';
    const isRejected = item.status === 'REJECTED' || item.status === 'CANCELLED';

    const targetData = item.folder || item.series;
    const targetName =
      targetData?.name || targetData?.title || 'Comprehensive Preparation Batch';
    const targetImage = targetData?.image || targetData?.thumbnail;
    const targetId = targetData?.id;
    const isSeries = !!item.seriesId;
    const typeLabel = isSeries ? 'Test Series' : 'Batch Course';
    const typeRoute = isSeries ? 'series' : 'folder';

    const orderCode = item.id ? item.id.substring(0, 8).toUpperCase() : 'ORDER';

    return (
      <View style={[styles.card, isApproved ? styles.cardActive : styles.cardInactive]}>
        {/* Card Top Category & Status Header */}
        <View style={styles.cardTopRow}>
          <View style={[styles.typeBadge, isSeries ? styles.seriesBadge : styles.batchBadge]}>
            {isSeries ? (
              <BookOpen size={13} color="#0072FF" />
            ) : (
              <Layers size={13} color="#0072FF" />
            )}
            <Text
              style={[
                styles.typeBadgeText,
                { color: '#0072FF' },
              ]}
            >
              {typeLabel}
            </Text>
          </View>

          {isApproved && (
            <View style={[styles.statusPill, styles.approvedPill]}>
              <View style={styles.greenDot} />
              <CheckCircle2 size={13} color="#059669" />
              <Text style={styles.approvedText}>Active Access</Text>
            </View>
          )}

          {isPending && (
            <View style={[styles.statusPill, styles.pendingPill]}>
              <Clock size={13} color="#D97706" />
              <Text style={styles.pendingText}>Under Review</Text>
            </View>
          )}

          {isRejected && (
            <View style={[styles.statusPill, styles.rejectedPill]}>
              <XCircle size={13} color="#DC2626" />
              <Text style={styles.rejectedText}>Declined</Text>
            </View>
          )}
        </View>

        {/* Card Main Information */}
        <View style={styles.cardMain}>
          <View style={styles.imageWrapper}>
            {targetImage ? (
              <Image source={{ uri: targetImage }} style={styles.batchImage} />
            ) : (
              <LinearGradient
                colors={['#1E293B', '#0F172A']}
                style={styles.batchImagePlaceholder}
              >
                {isSeries ? (
                  <BookOpen size={28} color="#94A3B8" />
                ) : (
                  <Layers size={28} color="#94A3B8" />
                )}
              </LinearGradient>
            )}
          </View>

          <View style={styles.infoWrapper}>
            <Text style={styles.batchTitle} numberOfLines={2}>
              {targetName}
            </Text>

            <View style={styles.dateMetaRow}>
              <Calendar size={13} color="#64748B" />
              <Text style={styles.dateMetaText}>
                Purchased on {formatDate(item.createdAt)}
              </Text>
            </View>

            {isApproved && (
              <View style={styles.validityBadge}>
                <Sparkles size={11} color="#059669" />
                <Text style={styles.validityText}>Full Access Unlocked</Text>
              </View>
            )}
          </View>
        </View>

        {/* Status Callout Banner */}
        {isPending && (
          <View style={styles.pendingBanner}>
            <AlertCircle size={16} color="#B45309" style={styles.bannerIcon} />
            <View style={styles.bannerTextContent}>
              <Text style={styles.pendingBannerTitle}>Payment verification in progress</Text>
              <Text style={styles.pendingBannerSub}>
                Admin is reviewing your transaction screenshot. Content will unlock once verified.
              </Text>
            </View>
          </View>
        )}

        {isRejected && (
          <View style={styles.rejectedBanner}>
            <AlertCircle size={16} color="#B91C1C" style={styles.bannerIcon} />
            <View style={styles.bannerTextContent}>
              <Text style={styles.rejectedBannerTitle}>Payment not approved</Text>
              <Text style={styles.rejectedBannerSub}>
                {item.rejectionReason || 'UTR / Payment slip could not be matched. Please contact support.'}
              </Text>
            </View>
          </View>
        )}

        {/* Card Footer: Invoice metadata & Action Button */}
        <View style={styles.cardFooter}>
          <View style={styles.invoiceLeft}>
            <View style={styles.orderIdBadge}>
              <FileText size={12} color="#64748B" />
              <Text style={styles.orderIdText}>#{orderCode}</Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Paid:</Text>
              <Text style={styles.priceAmount}>₹{item.amount || '0'}</Text>
            </View>
          </View>

          {isApproved ? (
            <TouchableOpacity
              style={styles.accessButton}
              activeOpacity={0.8}
              onPress={() => {
                if (targetId) {
                  if (isSeries) {
                    router.push(`/series/${targetId}` as any);
                  } else {
                    router.push(`/explore/folder/${targetId}` as any);
                  }
                }
              }}
            >
              <LinearGradient
                colors={['#0072FF', '#0052D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.accessGradient}
              >
                <Text style={styles.accessBtnText}>Open Batch</Text>
                <ChevronRight size={15} color="#FFFFFF" strokeWidth={2.5} />
              </LinearGradient>
            </TouchableOpacity>
          ) : isPending ? (
            <View style={styles.pendingWaitBadge}>
              <Clock size={13} color="#B45309" />
              <Text style={styles.pendingWaitText}>Checking Slip</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.helpBtn}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)')}
            >
              <HelpCircle size={13} color="#64748B" />
              <Text style={styles.helpBtnText}>Retry Order</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>My Batches</Text>
              <Text style={styles.headerSubtitle}>Student Enrolled Programs</Text>
            </View>
          </View>
        </View>

        <View style={styles.loginRequiredContainer}>
          <View style={styles.lockIconCircle}>
            <Lock size={36} color="#0072FF" />
          </View>
          <Text style={styles.loginTitle}>Sign in to view My Batches</Text>
          <Text style={styles.loginSub}>
            Please log in to your student account to access your purchased batches, video courses, notes, and test series.
          </Text>
          <TouchableOpacity
            style={styles.loginBtn}
            activeOpacity={0.88}
            onPress={() => router.push('/(auth)/login')}
          >
            <LinearGradient
              colors={['#0072FF', '#0052D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginGradient}
            >
              <LogIn size={18} color="#FFFFFF" />
              <Text style={styles.loginBtnText}>Log In / Register Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Screen Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>My Batches</Text>
            <Text style={styles.headerSubtitle}>
              {orders.length === 1
                ? '1 Enrolled Program'
                : `${orders.length} Enrolled Programs`}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={styles.refreshBtn}
              activeOpacity={0.7}
              onPress={onRefresh}
              disabled={refreshing}
            >
              <RotateCw size={16} color="#0072FF" />
            </TouchableOpacity>
            <View style={styles.headerBadge}>
              <Layers size={14} color="#0072FF" />
              <Text style={styles.headerBadgeText}>{counts.active} Active</Text>
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        {orders.length > 0 && (
          <View style={styles.filterBar}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === 'ALL' && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter('ALL')}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === 'ALL' && styles.filterTextActive,
                ]}
              >
                All ({orders.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === 'ACTIVE' && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter('ACTIVE')}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === 'ACTIVE' && styles.filterTextActive,
                ]}
              >
                Active ({counts.active})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === 'PENDING' && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter('PENDING')}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === 'PENDING' && styles.filterTextActive,
                ]}
              >
                Under Review ({counts.pending})
              </Text>
            </TouchableOpacity>

            {counts.rejected > 0 && (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  activeFilter === 'REJECTED' && styles.filterChipActive,
                ]}
                onPress={() => setActiveFilter('REJECTED')}
              >
                <Text
                  style={[
                    styles.filterText,
                    activeFilter === 'REJECTED' && styles.filterTextActive,
                  ]}
                >
                  Declined ({counts.rejected})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Main List */}
      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#0072FF" />
          <Text style={styles.loadingText}>Loading your enrolled batches...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0072FF']}
              tintColor="#0072FF"
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <PackageOpen size={44} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>
                {activeFilter === 'ALL'
                  ? 'No Batches Enrolled Yet'
                  : `No ${activeFilter.toLowerCase()} batches`}
              </Text>
              <Text style={styles.emptySub}>
                {activeFilter === 'ALL'
                  ? 'Explore our premium test series and batches to start practicing with live rankings.'
                  : 'You have no batches under this filter status.'}
              </Text>
              {activeFilter === 'ALL' && (
                <TouchableOpacity
                  style={styles.exploreBtn}
                  onPress={() => router.push('/(tabs)')}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#0072FF', '#0052D4']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.exploreGradient}
                  >
                    <Text style={styles.exploreBtnText}>Explore Store</Text>
                    <ArrowRight size={16} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  refreshBtn: {
    padding: 7,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0072FF',
  },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: {
    backgroundColor: '#0072FF',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  /* Card Design */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  cardActive: {
    borderColor: '#E2E8F0',
  },
  cardInactive: {
    borderColor: '#F1F5F9',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  batchBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  seriesBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  approvedPill: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  approvedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  pendingPill: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  rejectedPill: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  cardMain: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 14,
  },
  imageWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  batchImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  batchImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  batchTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 21,
    marginBottom: 6,
  },
  dateMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  dateMetaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  validityBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  validityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0072FF',
  },
  /* Banner callouts */
  pendingBanner: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 8,
    alignItems: 'flex-start',
  },
  pendingBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  pendingBannerSub: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 16,
  },
  rejectedBanner: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 8,
    alignItems: 'flex-start',
  },
  rejectedBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 2,
  },
  rejectedBannerSub: {
    fontSize: 11,
    color: '#B91C1C',
    lineHeight: 16,
  },
  bannerIcon: {
    marginTop: 1,
  },
  bannerTextContent: {
    flex: 1,
  },
  /* Footer */
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  invoiceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  orderIdText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: 'monospace',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  priceLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  priceAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  accessButton: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  accessGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  accessBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  pendingWaitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  pendingWaitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  helpBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  /* Empty States */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  exploreGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  /* Login Required */
  loginRequiredContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  lockIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  loginTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  loginSub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  loginBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  loginGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
