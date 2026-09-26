import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Alert, TextInput, Platform, Animated, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Folder, 
  FileText, 
  ShoppingCart, 
  ArrowLeft, 
  ChevronRight, 
  Lock, 
  Copy, 
  RefreshCw,
  RotateCw, 
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Check,
  Clock,
  Zap,
  HelpCircle,
  Smartphone,
  Award,
  ClipboardCheck,
  TrendingUp,
  BookOpen,
  Info,
  User,
  Mail,
  CreditCard,
  QrCode
} from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Clipboard from 'expo-clipboard';
import { getApiBaseUrl, getCachedData, setCachedData, apiClient } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

export default function FolderExploreScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [folder, setFolder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Access Control States
  const [hasAccess, setHasAccess] = useState(false); // default false for security
  const [accessReason, setAccessReason] = useState('NO_ORDER');
  const [orderData, setOrderData] = useState<any>(null);
  
  // Payment Settings & 2-Part Flow
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [selectedQrId, setSelectedQrId] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<'details' | 'qr' | 'form'>('details');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [studentName, setStudentName] = useState(user?.name || '');
  const [studentPhone, setStudentPhone] = useState(user?.phone || '');
  const [studentEmail, setStudentEmail] = useState(user?.email || '');
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [purchasedFolderIds, setPurchasedFolderIds] = useState<string[]>([]);
  const [purchasedSeriesIds, setPurchasedSeriesIds] = useState<string[]>([]);

  // Animated Glowing Button Border
  const borderAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(borderAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: false,
        }),
        Animated.timing(borderAnim, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: false,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const animatedBorderColor = borderAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#86EFAC', '#FDE047', '#38BDF8'], // smooth glow from Emerald -> Gold -> Sky Cyan
  });
  const animatedScale = borderAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.015, 1],
  });

  useEffect(() => {
    if (user) {
      if (user.name && !studentName) setStudentName(user.name);
      if (user.phone && !studentPhone) setStudentPhone(user.phone);
      if (user.email && !studentEmail) setStudentEmail(user.email);
    }
  }, [user]);

  const fetchFolder = async () => {
    try {
      const qs = user?.id ? `?userId=${user.id}` : '';
      const res = await fetch(`${getApiBaseUrl()}/folders/${id}${qs}`);
      const data = await res.json();
      setFolder(data);
      setCachedData(`folder_${id}`, data);
      return data;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const checkAccess = async (folderData: any) => {
    if (!folderData?.isPaid) {
      setHasAccess(true);
      return;
    }

    const userId = user?.id || '';
    const phone = user?.phone || studentPhone || '';
    const email = user?.email || studentEmail || '';

    try {
      const qs = new URLSearchParams();
      qs.append('folderId', id as string);
      if (userId) qs.append('userId', userId);
      if (phone) qs.append('phone', phone);
      if (email) qs.append('email', email);

      const res = await apiClient.get(`/orders/check-access?${qs.toString()}`);
      if (res?.data?.success) {
        setHasAccess(res.data.hasAccess);
        if (res.data.hasAccess) {
          if (userId) setCachedData(`access_folder_${id}_${userId}`, true);
        } else {
          setAccessReason(res.data.reason || 'NO_ORDER');
          setOrderData(res.data.order || null);
          if (userId) setCachedData(`access_folder_${id}_${userId}`, false);
        }
      }
    } catch (err) {
      console.error('Error checking folder access:', err);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/payment-settings`);
      const data = await res.json();
      if (data.success) setPaymentSettings(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const initialize = async () => {
    // 1. Instant Cache check (< 1ms)
    try {
      const cached = await getCachedData<any>(`folder_${id}`);
      if (cached) {
        setFolder(cached);
        if (!cached.isPaid) {
          setHasAccess(true);
        } else if (user?.id) {
          const cachedAccess = await getCachedData<boolean>(`access_folder_${id}_${user.id}`);
          if (cachedAccess === true) {
            setHasAccess(true);
          }
        }
        setLoading(false);
      }
    } catch (e) {}

    // 2. Background fresh fetch
    const fDataPromise = fetchFolder();
    let ordersPromise: Promise<any> | null = null;
    
    if (user?.id) {
      ordersPromise = apiClient.get(`/orders/my-orders?userId=${user.id}&folderId=${id}`)
        .then(res => res)
        .catch(() => null);
    }

    const fData = await fDataPromise;
    const promises: Promise<any>[] = [];

    if (fData?.isPaid) {
      promises.push(fetchPaymentSettings());
      promises.push(checkAccess(fData));
    } else {
      setHasAccess(true);
    }

    if (ordersPromise) {
      promises.push(ordersPromise.then((res: any) => {
        if (res?.data?.success && res.data?.data) {
           const pFolders = res.data.data.filter((o:any) => o.status === 'APPROVED' && o.folderId).map((o:any) => o.folderId);
           const pSeries = res.data.data.filter((o:any) => o.status === 'APPROVED' && o.seriesId).map((o:any) => o.seriesId);
           setPurchasedFolderIds(pFolders);
           setPurchasedSeriesIds(pSeries);
        }
      }));
    }

    await Promise.all(promises);

    setLoading(false);
  };

  useEffect(() => {
    if (id) initialize();
  }, [id, user?.id, user?.phone, user?.email]);

  const spinAnim = useRef(new Animated.Value(0)).current;

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      })
    ).start();

    try {
      await initialize();
    } catch (e) {
      console.warn('Folder refresh error:', e);
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

  // Multi-QR Code Parser from Admin Payment Settings
  let qrCodesList: any[] = [];
  if (paymentSettings?.qrCodesJson) {
    try {
      qrCodesList = JSON.parse(paymentSettings.qrCodesJson);
    } catch (e) {}
  }

  const currentQr = qrCodesList.find((q: any) => q.id === selectedQrId) || 
                    qrCodesList.find((q: any) => q.isSelected) || 
                    qrCodesList[0];

  const activeUpiId = (currentQr?.upiId !== undefined && currentQr?.upiId !== null) 
    ? currentQr.upiId.trim() 
    : (paymentSettings?.upiId || '').trim();
  const activeQrUrl = currentQr?.qrImageUrl || paymentSettings?.qrImageUrl;

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedUpi(true);
    Alert.alert('Copied!', `UPI ID copied to clipboard: ${text}`);
    setTimeout(() => setCopiedUpi(false), 3000);
  };

  const openWhatsAppHelp = () => {
    const finalPrice = folder?.discountPrice || folder?.price || 0;
    const message = `Hello JharTest, I need help with purchasing "${folder?.name || 'Package'}" (Price: ₹${finalPrice}).`;
    const whatsappUrl = `whatsapp://send?phone=917903466871&text=${encodeURIComponent(message)}`;
    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert('Notice', 'Could not open WhatsApp. Please contact 7903466871 manually.');
    });
  };

  const openWhatsAppSupport = () => {
    const utr = orderData?.transactionId || transactionId || '';
    const message = `Hello JharTest, I have submitted payment for "${folder?.name || 'Course'}"${utr ? ` (UTR / Txn ID: ${utr})` : ''}. Please verify and activate my access.`;
    const whatsappUrl = `whatsapp://send?phone=917903466871&text=${encodeURIComponent(message)}`;
    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert('Notice', 'Could not open WhatsApp. Please contact 7903466871 manually.');
    });
  };

  const handleProceedToPayment = () => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please sign in to your student account first to enroll in this course and save your purchase.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log In Now', onPress: () => router.push('/(auth)/login') }
        ]
      );
      return;
    }
    setPaymentStep('qr');
  };

  const validatePaymentInputs = () => {
    const cleanName = studentName.trim();
    const rawPhone = studentPhone.trim().replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 12 && rawPhone.startsWith('91') ? rawPhone.slice(2) : rawPhone;
    const cleanEmail = studentEmail.trim().toLowerCase();
    const cleanTxn = transactionId.trim().replace(/\s+/g, '');

    if (!cleanName || cleanName.length < 2) {
      Alert.alert('Invalid Name', 'Please enter your full name (at least 2 characters).');
      return null;
    }

    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      Alert.alert(
        'Invalid Phone Number',
        'Please enter a valid 10-digit mobile number (e.g. 9876543210) to receive your enrollment confirmation.'
      );
      return null;
    }

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address (e.g. student@gmail.com).');
      return null;
    }

    if (!cleanTxn || cleanTxn.length < 8 || cleanTxn.length > 24) {
      Alert.alert(
        'Invalid UTR / Transaction ID',
        'Please enter the 12-digit UTR or Transaction ID from your payment app (PhonePe, Google Pay, Paytm, or BHIM).'
      );
      return null;
    }

    // Guard against dummy/fake inputs
    if (/^(.)\1+$/.test(cleanTxn) || cleanTxn === '12345678' || cleanTxn === '123456789012') {
      Alert.alert(
        'Invalid UTR Number',
        'Please enter the genuine UTR / Transaction ID from your payment confirmation screen.'
      );
      return null;
    }

    return {
      cleanName,
      cleanPhone,
      cleanEmail: cleanEmail || user?.email || '',
      cleanTxn,
    };
  };

  const submitPayment = async () => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please sign in to your student account first to submit your order.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log In Now', onPress: () => router.push('/(auth)/login') }
        ]
      );
      return;
    }

    const validated = validatePaymentInputs();
    if (!validated) return;

    setSubmitting(true);
    try {
      const finalPrice = folder.discountPrice || folder.price;
      const res = await apiClient.post('/orders', {
        userId: user?.id,
        folderId: id,
        amount: finalPrice,
        transactionId: validated.cleanTxn,
        studentName: validated.cleanName,
        studentPhone: validated.cleanPhone,
        studentEmail: validated.cleanEmail,
        upiId: activeUpiId,
      });

      const data = res.data;
      if (data.success) {
        // Immediately transition UI to Pending state so the user sees the confirmation
        setHasAccess(false);
        setAccessReason('PENDING');
        setOrderData(data.data || { transactionId: transactionId.trim() });

        Alert.alert(
          'Verification Submitted!', 
          'Your payment request has been received. Tap "Send WhatsApp" to share your details for instant activation.',
          [
            { 
              text: 'Send WhatsApp', 
              onPress: async () => {
                const orderId = data.data?.id;
                const approveUrl = orderId ? `${getApiBaseUrl()}/orders/${orderId}?action=approve` : '';
                const rejectUrl = orderId ? `${getApiBaseUrl()}/orders/${orderId}?action=reject` : '';
                const message = `Hello JharTest, I have submitted a payment request for a premium folder.\n\n📚 Folder: ${folder.name}\n💰 Amount: ₹${finalPrice}\n👤 Name: ${studentName.trim()}\n📱 Phone: ${studentPhone.trim()}\n📧 Email: ${studentEmail.trim() || user?.email || 'N/A'}\n🔖 UTR / Transaction ID: ${transactionId.trim()}\n\n✅ Approve Link:\n${approveUrl}\n\n❌ Reject Link:\n${rejectUrl}`;
                const whatsappUrl = `whatsapp://send?phone=917903466871&text=${encodeURIComponent(message)}`;
                try {
                  await Linking.openURL(whatsappUrl);
                } catch (e) {
                  Alert.alert('Notice', 'Could not open WhatsApp. Please contact 7903466871 manually.');
                }
                await checkAccess(folder);
              } 
            },
            {
              text: 'View Status',
              onPress: () => {
                checkAccess(folder);
              },
              style: 'cancel'
            }
          ]
        );
      } else {
        Alert.alert('Error', data.error || 'Failed to submit request');
      }
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please check your network.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </SafeAreaView>
    );
  }

  if (!folder) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text>Folder not found.</Text>
      </SafeAreaView>
    );
  }

  // --- Payment Pending Screen ---
  if (!hasAccess && accessReason === 'PENDING') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>{folder.name}</Text>
            <Text style={styles.headerSub}>Payment Verification</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.pendingScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.pendingCenterContent}>
            {/* Centered Icon */}
            <View style={styles.pendingIconOuterCircle}>
              <View style={styles.pendingIconBox}>
                <Clock size={40} color="#059669" />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.pendingTitle}>Payment Verification Pending</Text>

            {/* Activation Time Message */}
            <View style={styles.pendingTimeBadge}>
              <Zap size={14} color="#B45309" />
              <Text style={styles.pendingTimeText}>Will be activated in a few minutes</Text>
            </View>

            {/* Centered Order Details Card */}
            <View style={styles.pendingInfoCard}>
              <View style={styles.pendingInfoRow}>
                <Text style={styles.pendingInfoLabel}>Course Package:</Text>
                <Text style={styles.pendingInfoValue} numberOfLines={1}>{folder.name}</Text>
              </View>
              {orderData?.transactionId ? (
                <View style={[styles.pendingInfoRow, { marginTop: 8 }]}>
                  <Text style={styles.pendingInfoLabel}>UTR / Txn ID:</Text>
                  <Text style={[styles.pendingInfoValue, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '700' }]}>
                    {orderData.transactionId}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.pendingInfoRow, { marginTop: 8 }]}>
                <Text style={styles.pendingInfoLabel}>Verification Status:</Text>
                <View style={styles.pendingStatusPill}>
                  <Text style={styles.pendingStatusText}>Under Review</Text>
                </View>
              </View>
            </View>

            {/* Message */}
            <Text style={styles.pendingDesc}>
              Your payment request has been received. Our admin team will verify the details and activate your course within a few minutes.
            </Text>

            {/* WhatsApp Query & Instant Activation Box */}
            <View style={styles.pendingWhatsappCard}>
              <Text style={styles.pendingWhatsappTitle}>Any query or need faster activation?</Text>
              <Text style={styles.pendingWhatsappSub}>
                Send your payment screenshot directly to our WhatsApp support:
              </Text>
              <TouchableOpacity 
                style={styles.pendingWhatsappBtn} 
                onPress={openWhatsAppSupport}
                activeOpacity={0.85}
              >
                <Text style={styles.pendingWhatsappBtnText}>Chat on WhatsApp: 79034 66871</Text>
              </TouchableOpacity>
            </View>

            {/* Refresh / Check Status Button */}
            <TouchableOpacity 
              style={[styles.refreshBtn, refreshing && { opacity: 0.75 }]} 
              onPress={handleRefreshStatus} 
              disabled={refreshing}
              activeOpacity={0.85}
            >
              <RefreshCw size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.refreshBtnText}>{refreshing ? 'Checking Status...' : 'Check Status / Refresh'}</Text>
            </TouchableOpacity>

            {/* Back Button */}
            <TouchableOpacity 
              style={styles.pendingBackBtn} 
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={styles.pendingBackBtnText}>← Back to Course Catalog</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Payment Form / Lock Screen ---
  if (!hasAccess && (accessReason === 'NO_ORDER' || accessReason === 'EXPIRED')) {
    const finalPrice = folder.discountPrice || folder.price || 0;
    const originalPrice = folder.price || finalPrice;
    const isDiscounted = folder.discountPrice && folder.discountPrice < folder.price;
    const discountPercent = isDiscounted 
      ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100) 
      : 0;

    const testsCount = folder.testSeries?.length || 0;
    const materialsCount = folder.materials?.length || 0;
    const subfoldersCount = folder.children?.length || 0;

    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Navigation Bar */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => {
              if (paymentStep === 'form') setPaymentStep('qr');
              else if (paymentStep === 'qr') setPaymentStep('details');
              else router.back();
            }} 
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>{folder.name}</Text>
            <Text style={styles.headerSub}>
              {paymentStep === 'details' 
                ? 'Course Overview' 
                : paymentStep === 'qr'
                ? 'Part 1: Scan & Pay via UPI'
                : 'Part 2: Submit Verification Details'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity 
              onPress={handleRefreshStatus} 
              style={styles.helpIconBtn}
              activeOpacity={0.75}
              disabled={refreshing}
            >
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <RotateCw size={19} color="#0072FF" />
              </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={openWhatsAppHelp} 
              style={styles.helpIconBtn}
              activeOpacity={0.75}
            >
              <HelpCircle size={22} color="#059669" />
            </TouchableOpacity>
          </View>
        </View>

        {paymentStep === 'details' ? (
          /* ================= PAGE 1: COURSE OVERVIEW ================= */
          <ScrollView
            contentContainerStyle={styles.detailsScroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefreshStatus} colors={['#0072FF']} />
            }
          >
            {/* Top Badges */}
            <View style={styles.mainBadgeRow}>
              <View style={styles.mainPackageBadge}>
                <Sparkles size={12} color="#00C853" />
                <Text style={styles.mainPackageBadgeText}>PREMIUM PACKAGE</Text>
              </View>
              <View style={styles.mainValidityBadge}>
                <Clock size={12} color="#00C853" />
                <Text style={styles.mainValidityBadgeText}>
                  {folder.validity ? `${folder.validity} Days Access` : '365 Days Access'}
                </Text>
              </View>
            </View>

            {/* Title & Description */}
            <Text style={styles.mainScreenTitle}>{folder.name}</Text>
            
            <Text style={styles.mainScreenDesc}>
              {folder.description ||
                'Complete preparation package with full mock tests, high-yield PDF revision notes, and chapter-wise learning modules.'}
            </Text>

            {/* Special Offer Price Box */}
            <View style={styles.mainPriceBox}>
              <View>
                <Text style={styles.mainPriceLabel}>SPECIAL OFFER PRICE</Text>
                <View style={styles.mainPriceFigures}>
                  <Text style={styles.mainFinalPrice}>₹{finalPrice}</Text>
                  {isDiscounted && (
                    <Text style={styles.mainOriginalPrice}>₹{folder.price}</Text>
                  )}
                  {isDiscounted && (
                    <View style={styles.mainDiscountBadge}>
                      <Text style={styles.mainDiscountText}>{discountPercent}% OFF</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.mainSyllabusTag}>
                <ShieldCheck size={13} color="#008A38" />
                <Text style={styles.mainSyllabusTagText}>Full Syllabus</Text>
              </View>
            </View>

            {/* Primary Action Button with Animated Glowing Border */}
            <Animated.View
              style={{
                transform: [{ scale: animatedScale }],
                borderRadius: 16,
                borderWidth: 2,
                borderColor: animatedBorderColor,
                backgroundColor: '#00C853',
                shadowColor: '#00C853',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
                elevation: 5,
                marginBottom: 10,
                overflow: 'hidden',
              }}
            >
              <TouchableOpacity
                style={styles.mainPayBtn}
                onPress={() => setPaymentStep('qr')}
                activeOpacity={0.88}
              >
                <Text style={styles.mainPayBtnText}>Continue to Payment (₹{finalPrice})</Text>
                <ChevronRight size={20} color="#FFFFFF" strokeWidth={3} />
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.mainTrustRow}>
              <CheckCircle2 size={13} color="#00C853" />
              <Text style={styles.mainTrustText}>Instant Activation • 100% Verified Exam Syllabus</Text>
            </View>

            {/* 4 Clean Feature Items */}
            <View style={styles.mainFeaturesSection}>
              <Text style={styles.mainFeaturesSectionTitle}>Included in this package</Text>

              <View style={styles.mainFeaturesGrid}>
                {/* 1. Rank & Analytics */}
                <View style={styles.mainFeatureItem}>
                  <View style={styles.mainFeatureIconWrap}>
                    <TrendingUp size={16} color="#00C853" />
                  </View>
                  <View style={styles.mainFeatureTextWrap}>
                    <Text style={styles.mainFeatureName}>Rank & Analytics</Text>
                    <Text style={styles.mainFeatureSub}>State-level rank, percentile & speed analysis</Text>
                  </View>
                </View>

                {/* 2. Detailed Report Card */}
                <View style={styles.mainFeatureItem}>
                  <View style={styles.mainFeatureIconWrap}>
                    <Award size={16} color="#00C853" />
                  </View>
                  <View style={styles.mainFeatureTextWrap}>
                    <Text style={styles.mainFeatureName}>Instant Report Card</Text>
                    <Text style={styles.mainFeatureSub}>Accuracy, score breakdown & question time metrics</Text>
                  </View>
                </View>

                {/* 3. Question Analysis with Solutions */}
                <View style={styles.mainFeatureItem}>
                  <View style={styles.mainFeatureIconWrap}>
                    <BookOpen size={16} color="#00C853" />
                  </View>
                  <View style={styles.mainFeatureTextWrap}>
                    <Text style={styles.mainFeatureName}>Question Analysis with Solutions</Text>
                    <Text style={styles.mainFeatureSub}>Step-by-step explanations for every question</Text>
                  </View>
                </View>

                {/* 4. Based on Exam Pattern */}
                <View style={styles.mainFeatureItem}>
                  <View style={styles.mainFeatureIconWrap}>
                    <CheckCircle2 size={16} color="#00C853" />
                  </View>
                  <View style={styles.mainFeatureTextWrap}>
                    <Text style={styles.mainFeatureName}>Based on Exam Pattern</Text>
                    <Text style={styles.mainFeatureSub}>Strictly designed as per latest official syllabus & marking scheme</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Direct WhatsApp Help */}
            <TouchableOpacity 
              style={styles.mainWhatsappBtn} 
              onPress={openWhatsAppHelp}
              activeOpacity={0.7}
            >
              <HelpCircle size={15} color="#059669" />
              <Text style={styles.mainWhatsappText}>Have questions before enrolling? Chat on WhatsApp</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : paymentStep === 'qr' ? (
          /* ================= PAGE 2 (PART 1): SCAN & PAY VIA UPI ================= */
          <ScrollView contentContainerStyle={styles.detailsScroll} showsVerticalScrollIndicator={false}>
            {/* Price & Status Header */}
            <View style={styles.compactPriceHeader}>
              <View style={styles.compactPriceLeft}>
                <Sparkles size={13} color="#00C853" />
                <Text style={styles.compactPriceCourseName} numberOfLines={1}>{folder.name}</Text>
              </View>
              <View style={styles.compactPriceBadge}>
                <Text style={styles.compactPriceTextMain}>₹{finalPrice}</Text>
              </View>
            </View>

            {/* UPI ID Pill with Copy (Only shown if UPI ID is configured) */}
            {activeUpiId ? (
              <View style={styles.upiContainer}>
                <View style={styles.upiInfo}>
                  <Text style={styles.upiTag}>OFFICIAL UPI ID</Text>
                  <Text style={styles.upiText} selectable={true}>{activeUpiId}</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.copyBtn, copiedUpi && styles.copyBtnSuccess]} 
                  onPress={() => copyToClipboard(activeUpiId)}
                  activeOpacity={0.8}
                >
                  {copiedUpi ? (
                    <>
                      <Check size={13} color="#FFFFFF" strokeWidth={3} />
                      <Text style={styles.copyBtnTextSuccess}>Copied</Text>
                    </>
                  ) : (
                    <>
                      <Copy size={13} color="#FFFFFF" />
                      <Text style={styles.copyBtnText}>Copy</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Dynamic QR Code Image (Clean & Centered) */}
            <View style={styles.qrFrame}>
              {activeQrUrl ? (
                <Image 
                  source={{ uri: activeQrUrl }} 
                  style={styles.qrImage}
                  contentFit="contain" 
                />
              ) : (
                <Image 
                  source={require('../../../../assets/images/qr_code.png')} 
                  style={styles.qrImage}
                  contentFit="contain" 
                />
              )}
            </View>

            {/* Styled Payment Apps Badges */}
            <View style={styles.appBadgesRow}>
              {['Google Pay', 'PhonePe', 'Paytm', 'BHIM UPI', 'Cred'].map((app) => (
                <View key={app} style={styles.appBadgePill}>
                  <Text style={styles.appBadgeText}>{app}</Text>
                </View>
              ))}
            </View>

            {paymentSettings?.instructions ? (
              <View style={styles.instructionNote}>
                <Info size={13} color="#0284C7" style={{ marginTop: 1, marginRight: 6 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.instructionBody}>{paymentSettings.instructions}</Text>
                </View>
              </View>
            ) : null}

            {/* Action to proceed to Step 2 Form with Animated Glowing Border */}
            <Animated.View
              style={{
                transform: [{ scale: animatedScale }],
                borderRadius: 14,
                borderWidth: 2,
                borderColor: animatedBorderColor,
                backgroundColor: '#00C853',
                shadowColor: '#00C853',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
                elevation: 5,
                marginTop: 8,
                marginBottom: 6,
                overflow: 'hidden',
              }}
            >
              <TouchableOpacity 
                style={styles.proceedVerifyBtn} 
                onPress={() => setPaymentStep('form')}
                activeOpacity={0.85}
              >
                <Text style={styles.proceedVerifyBtnText}>I Have Paid • Enter Details</Text>
                <ChevronRight size={18} color="#FFFFFF" strokeWidth={3} />
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity 
              style={styles.whatsappHelpRow} 
              onPress={openWhatsAppHelp}
              activeOpacity={0.7}
            >
              <HelpCircle size={13} color="#00C853" />
              <Text style={styles.whatsappHelpText}>Need help? Chat on WhatsApp</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          /* ================= PAGE 3 (PART 2): FILL DETAILS & SUBMIT ================= */
          <ScrollView contentContainerStyle={styles.detailsScroll} showsVerticalScrollIndicator={false}>
            {/* Form Box - Compact & Premium */}
            <View style={styles.formCard}>
              <View style={styles.compactFormHeader}>
                <View>
                  <Text style={styles.compactFormTitle}>Submit Payment Verification</Text>
                  <Text style={styles.compactFormSub}>Fast automatic course unlock</Text>
                </View>
                <View style={styles.compactPriceBadge}>
                  <Text style={styles.compactPriceTextMain}>₹{finalPrice}</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Enter student full name"
                  placeholderTextColor="#94A3B8"
                  value={studentName}
                  onChangeText={setStudentName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>WhatsApp / Mobile Number *</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={studentPhone}
                  onChangeText={setStudentPhone}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email ID (Optional)</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="your.email@example.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={studentEmail}
                  onChangeText={setStudentEmail}
                />
              </View>

              {/* UTR Input - Compact Highlighted */}
              <View style={styles.utrHighlightGroup}>
                <View style={styles.utrLabelRow}>
                  <Text style={styles.utrLabel}>12-Digit UTR / Txn ID *</Text>
                  <View style={styles.mandatoryBadge}>
                    <Text style={styles.mandatoryText}>REQUIRED</Text>
                  </View>
                </View>
                <TextInput
                  style={styles.utrInputField}
                  placeholder="e.g. 425689123456"
                  placeholderTextColor="#94A3B8"
                  keyboardType="default"
                  autoCapitalize="characters"
                  value={transactionId}
                  onChangeText={setTransactionId}
                />

                {/* Helper Callout for UTR (Compact 1-line) */}
                <View style={styles.utrHelpBox}>
                  <Text style={styles.utrHelpItem}>
                    💡 <Text style={{ fontWeight: '700' }}>PhonePe</Text> (UTR) • <Text style={{ fontWeight: '700' }}>GPay</Text> (UPI Txn ID) • <Text style={{ fontWeight: '700' }}>Paytm</Text> (Ref No)
                  </Text>
                </View>
              </View>

              {/* Submit Action with Animated Glowing Border */}
              <Animated.View
                style={{
                  transform: [{ scale: animatedScale }],
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: animatedBorderColor,
                  backgroundColor: '#00C853',
                  shadowColor: '#00C853',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 8,
                  elevation: 5,
                  overflow: 'hidden',
                }}
              >
                <TouchableOpacity 
                  style={[styles.mainSubmitBtn, submitting && { opacity: 0.7 }]} 
                  onPress={submitPayment}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.mainSubmitBtnText}>Verifying Details...</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <CheckCircle2 size={16} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
                      <Text style={styles.mainSubmitBtnText}>Verify Payment & Unlock</Text>
                      <ChevronRight size={16} color="#FFFFFF" strokeWidth={3} style={{ marginLeft: 4 }} />
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>

              <TouchableOpacity 
                style={styles.backToQrBtn} 
                onPress={() => setPaymentStep('qr')}
                activeOpacity={0.7}
              >
                <ArrowLeft size={13} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.backToQrText}>Back to QR Code</Text>
              </TouchableOpacity>
            </View>

            {/* Direct WhatsApp Help */}
            <TouchableOpacity 
              style={styles.whatsappHelpRow} 
              onPress={openWhatsAppHelp}
              activeOpacity={0.7}
            >
              <HelpCircle size={13} color="#00C853" />
              <Text style={styles.whatsappHelpText}>Need assistance? Chat on WhatsApp</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // --- Normal Content Render (hasAccess = true) ---
  const userOwnsCurrentFolder = hasAccess && folder.isPaid;
  const hasContent = 
    (folder.children && folder.children.length > 0) || 
    (folder.materials && folder.materials.length > 0) || 
    (folder.testSeries && folder.testSeries.length > 0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Navigation Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {folder.name}
          </Text>
          <Text style={styles.headerSub}>Explore Content Catalog</Text>
        </View>
        <TouchableOpacity
          onPress={handleRefreshStatus}
          style={styles.helpIconBtn}
          activeOpacity={0.75}
          disabled={refreshing}
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <RotateCw size={19} color="#0072FF" />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {folder.isPaid && (
        <View style={styles.enrolledBanner}>
          <View style={styles.enrolledBadgeIcon}>
            <CheckCircle2 size={16} color="#059669" />
          </View>
          <View>
            <Text style={styles.enrolledText}>Enrolled & Active</Text>
            <Text style={styles.enrolledSub}>You have full access to all items in this folder</Text>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefreshStatus} colors={['#0072FF']} />
        }
      >
        {!hasContent && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Folder size={40} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>Folder is Empty</Text>
            <Text style={styles.emptyText}>There are no materials or test series uploaded in this section yet.</Text>
          </View>
        )}

        {/* Sub-Folders & Packages */}
        {folder.children && folder.children.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Folders & Packages</Text>
              <Text style={styles.sectionCount}>{folder.children.length} Items</Text>
            </View>
            {folder.children.map((child: any) => {
              const discountPercent = child.price && child.discountPrice && child.price > child.discountPrice
                ? Math.round(((child.price - child.discountPrice) / child.price) * 100)
                : 0;
              const finalPrice = child.discountPrice || child.price || 0;
              const isSubOwned = userOwnsCurrentFolder || purchasedFolderIds.includes(child.id);

              return (
                <TouchableOpacity
                  key={child.id}
                  style={styles.courseCard}
                  activeOpacity={0.82}
                  onPress={() => router.push(`/explore/folder/${child.id}`)}
                >
                  {/* Left Side: Thumbnail with New Badge */}
                  <View style={styles.thumbnailContainer}>
                    {child.image ? (
                      <Image source={{ uri: child.image }} style={styles.thumbnailImage} />
                    ) : (
                      <View style={styles.thumbnailPlaceholder}>
                        {child.isPaid ? (
                          <ShoppingCart size={28} color="#059669" />
                        ) : (
                          <Folder size={28} color="#0284C7" />
                        )}
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
                      <Text style={styles.folderCardTitle} numberOfLines={2}>
                        {child.name}
                      </Text>
                      
                      <View style={styles.priceRow}>
                        {child.isPaid && (
                          <>
                            <Text style={styles.finalPrice}>
                              ₹ {finalPrice}
                            </Text>
                            {child.price && child.discountPrice && (
                              <Text style={styles.originalPrice}>₹ {child.price}</Text>
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

                    {/* Action Button Row - Full Width Green & Compact Height */}
                    <View style={{ marginTop: 'auto', paddingTop: 3 }}>
                      <View style={{ 
                        backgroundColor: child.isPaid && !isSubOwned ? '#00C853' : '#D1FAE5', 
                        paddingVertical: 5, 
                        borderRadius: 6,
                        width: '100%',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: child.isPaid && !isSubOwned ? '#00C853' : 'transparent',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.15,
                        shadowRadius: 1.5,
                        elevation: 1,
                      }}>
                        <Text style={{ 
                          color: child.isPaid && !isSubOwned ? '#FFFFFF' : '#047857', 
                          fontSize: 11.5, 
                          fontWeight: '900',
                          textAlign: 'center',
                          letterSpacing: 0.2,
                        }}>
                          {child.isPaid && !isSubOwned ? 'Buy Now' : 'Start Now'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Materials (PDFs / Docs) */}
        {folder.materials && folder.materials.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Reading Materials & PDFs</Text>
              <Text style={styles.sectionCount}>{folder.materials.length} Docs</Text>
            </View>
            {folder.materials.map((mat: any) => (
              <TouchableOpacity
                key={mat.id}
                style={styles.card}
                activeOpacity={0.8}
                onPress={async () => {
                  if (mat.pdfUrl) {
                    try {
                      await WebBrowser.openBrowserAsync(mat.pdfUrl);
                    } catch (e) {
                      Linking.openURL(mat.pdfUrl).catch(() => {
                        Alert.alert('Error', 'Unable to open PDF link.');
                      });
                    }
                  } else {
                    Alert.alert('Notice', 'No PDF attached to this material.');
                  }
                }}
              >
                <View style={[styles.iconBox, { backgroundColor: '#FFF1F2' }]}>
                  <FileText size={24} color="#E11D48" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{mat.title}</Text>
                  <Text style={styles.cardSubtitle}>
                    {mat.type ? `${mat.type} • ` : ''}{mat.isFree ? 'Free Access Document' : 'Premium Document'}
                  </Text>
                </View>
                <View style={styles.openPdfPill}>
                  <Text style={styles.openPdfPillText}>Read</Text>
                  <ChevronRight size={14} color="#E11D48" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Test Series */}
        {folder.testSeries && folder.testSeries.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Test Series & Mock Tests</Text>
              <Text style={styles.sectionCount}>{folder.testSeries.length} Series</Text>
            </View>
            {folder.testSeries.map((ts: any) => {
              const isFree = ts.isFree || ts.price === 0 || !ts.price;
              const isAttemptCompleted =
                ts.userAttemptsCount >= (ts.maxAttempts || 2) && ts.latestAttemptId;
              const hasAttempts = ts.userAttemptsCount > 0;
              const finalPrice = ts.discountPrice || ts.price;
              const isSeriesOwned = userOwnsCurrentFolder || purchasedSeriesIds.includes(ts.id);

              return (
                <TouchableOpacity
                  key={ts.id}
                  style={styles.compactTestCard}
                  activeOpacity={0.82}
                  onPress={() => router.push(`/series/${ts.id}`)}
                >
                  {/* Left: Small Icon */}
                  <View style={styles.compactTestIconBadge}>
                    {ts.thumbnail ? (
                      <Image source={{ uri: ts.thumbnail }} style={styles.compactTestIconImg} />
                    ) : (
                      <ClipboardCheck size={18} color="#00C853" strokeWidth={2.3} />
                    )}
                  </View>

                  {/* Middle: Title & Inline Stats */}
                  <View style={styles.compactTestInfo}>
                    <View style={styles.compactTestTitleRow}>
                      <Text style={styles.compactTestTitle} numberOfLines={1}>
                        {ts.title}
                      </Text>
                      {isFree ? (
                        <View style={styles.compactFreeBadge}>
                          <Text style={styles.compactFreeText}>FREE</Text>
                        </View>
                      ) : (
                        <Text style={styles.compactPriceText}>₹{finalPrice}</Text>
                      )}
                    </View>

                    <Text style={styles.compactStatsText} numberOfLines={1}>
                      <Text style={{ color: '#008A38', fontWeight: '800' }}>{ts.totalQuestions || 0} Qs</Text>
                      <Text style={{ color: '#CBD5E1' }}>  •  </Text>
                      <Text>{ts.duration || 60}m</Text>
                      <Text style={{ color: '#CBD5E1' }}>  •  </Text>
                      <Text>{ts.totalMarks || 100} Marks</Text>
                    </Text>
                  </View>

                  {/* Right: Same-Line Action Button */}
                  <View style={styles.compactBtnWrapper}>
                    {isAttemptCompleted ? (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          if (ts.firstTestId && ts.latestAttemptId) {
                            router.push(
                              `/test/${ts.firstTestId}?viewMode=review&attemptId=${ts.latestAttemptId}`
                            );
                          }
                        }}
                        style={styles.compactBtnDone}
                      >
                        <Text style={styles.compactBtnDoneText}>View Result</Text>
                        <CheckCircle2 size={11} color="#059669" />
                      </TouchableOpacity>
                    ) : ts.inProgressAttemptId ? (
                      <View style={styles.compactBtnStart}>
                        <Text style={styles.compactBtnStartText}>Resume</Text>
                        <ChevronRight size={11} color="#FFFFFF" />
                      </View>
                    ) : hasAttempts ? (
                      <View style={styles.compactBtnReattempt}>
                        <Text style={styles.compactBtnReattemptText}>Re-Attempt</Text>
                        <ChevronRight size={11} color="#0072FF" />
                      </View>
                    ) : (
                      <View style={!isFree && !isSeriesOwned ? styles.compactBtnStart : styles.compactBtnReattempt}>
                        <Text style={!isFree && !isSeriesOwned ? styles.compactBtnStartText : styles.compactBtnReattemptText}>
                          {!isFree && !isSeriesOwned ? 'Buy' : 'Start Test'}
                        </Text>
                        <ChevronRight size={11} color={!isFree && !isSeriesOwned ? "#FFFFFF" : "#0072FF"} />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', letterSpacing: -0.2 },
  headerSub: { fontSize: 12, color: '#64748B', fontWeight: '500' },

  scrollContent: { padding: 16, paddingBottom: 40 },
  enrolledBanner: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#D1FAE5',
  },
  enrolledBadgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  enrolledText: { color: '#047857', fontWeight: '800', fontSize: 13 },
  enrolledSub: { color: '#065F46', fontSize: 11, fontWeight: '500' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyIconCircle: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B', marginBottom: 6 },
  emptyText: { color: '#64748B', fontSize: 14, textAlign: 'center', lineHeight: 20 },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionCount: { fontSize: 12, fontWeight: '700', color: '#94A3B8', backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardInfo: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 3 },
  cardSubtitle: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  openPdfPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF1F2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  openPdfPillText: { fontSize: 12, fontWeight: '700', color: '#E11D48', marginRight: 2 },

  compactTestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 9,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  compactTestIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  compactTestIconImg: {
    width: '100%',
    height: '100%',
    borderRadius: 9,
  },
  compactTestInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  compactTestTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  compactTestTitle: {
    flexShrink: 1,
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  compactFreeBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  compactFreeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#00C853',
  },
  compactPriceText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  compactStatsText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
  },
  compactBtnWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactBtnDone: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  compactBtnDoneText: {
    color: '#059669',
    fontSize: 10.5,
    fontWeight: '800',
  },
  compactBtnReattempt: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  compactBtnReattemptText: {
    color: '#0072FF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  compactBtnStart: {
    backgroundColor: '#00C853',
    paddingHorizontal: 11,
    paddingVertical: 5.5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    shadowColor: '#00C853',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  compactBtnStartText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },

  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    padding: 7,
    gap: 10,
  },
  thumbnailContainer: {
    width: 140,
    height: 92,
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
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderBottomRightRadius: 7,
  },
  newBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#4ADE80',
    marginRight: 3,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  folderCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 16,
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 2,
  },
  finalPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  originalPrice: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  cardDiscountPill: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 2,
  },
  cardDiscountText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#EF4444',
  },

  // Help Icon in Header
  helpIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
  },

  // 2-Page Scroll Views
  detailsScroll: {
    padding: 14,
    paddingBottom: 85,
  },
  paymentScroll: {
    padding: 14,
    paddingBottom: 85,
  },

  // Seamless Main Screen Styles
  mainBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  mainPackageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  mainPackageBadgeText: {
    color: '#00C853',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  mainValidityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  mainValidityBadgeText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
  },
  mainScreenTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 30,
    marginBottom: 6,
  },
  mainScreenDesc: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  mainPriceBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  mainPriceLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#008A38',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  mainPriceFigures: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  mainFinalPrice: {
    fontSize: 28,
    fontWeight: '900',
    color: '#006027',
  },
  mainOriginalPrice: {
    fontSize: 15,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  mainDiscountBadge: {
    backgroundColor: '#00C853',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  mainDiscountText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '900',
  },
  mainSyllabusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  mainSyllabusTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#008A38',
  },
  mainPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 6,
  },
  mainPayBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  mainTrustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 20,
  },
  mainTrustText: {
    color: '#008A38',
    fontSize: 11,
    fontWeight: '700',
  },

  // Main Features
  mainFeaturesSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  mainFeaturesSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 14,
  },
  mainFeaturesGrid: {
    gap: 12,
  },
  mainFeatureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  mainFeatureIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  mainFeatureTextWrap: {
    flex: 1,
  },
  mainFeatureName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  mainFeatureSub: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },

  mainWhatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    marginBottom: 10,
  },
  mainWhatsappText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },

  // Payment Box (QR & UPI)
  paymentBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  stepBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stepPill: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stepPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00C853',
    letterSpacing: 0.5,
  },
  stepHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  paymentBoxSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    marginTop: 2,
  },
  scannerSelectorContainer: {
    marginBottom: 14,
  },
  qrTabsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  qrTabButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qrTabButtonActive: {
    backgroundColor: '#00C853',
    borderColor: '#00C853',
  },
  qrTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  qrTabTextActive: {
    color: '#FFFFFF',
  },
  upiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
  },
  upiInfo: {
    flex: 1,
    marginRight: 10,
  },
  upiTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  upiText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C853',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#00C853',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  copyBtnSuccess: {
    backgroundColor: '#00A844',
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  copyBtnTextSuccess: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  qrFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#A7F3D0',
    marginBottom: 10,
    alignSelf: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  qrImage: {
    width: 230,
    height: 230,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  appBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  appBadgePill: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  appBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
  },
  instructionNote: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  instructionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0369A1',
    marginBottom: 2,
  },
  instructionBody: {
    fontSize: 12,
    color: '#0284C7',
    lineHeight: 16,
  },

  // 2-Step Trigger Card ("Have you paid?")
  haveYouPaidCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  haveYouPaidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  haveYouPaidIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  haveYouPaidTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
  },
  haveYouPaidDesc: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
    lineHeight: 17,
  },
  proceedVerifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 6,
  },
  proceedVerifyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginRight: 6,
  },
  whatsappHelpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  whatsappHelpText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00C853',
    marginLeft: 6,
    textDecorationLine: 'underline',
  },

  // Step 2 Styles
  stepTwoWrapper: {
    width: '100%',
  },
  // Compact Price Header for Step 2 and 3
  compactPriceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  compactPriceLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
  },
  compactPriceCourseName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  compactPriceBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  compactPriceTextMain: {
    fontSize: 13,
    fontWeight: '900',
    color: '#008A38',
  },

  // Compact Form Styles
  compactFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  compactFormTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  compactFormSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 6,
  },
  formMainSub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  inputField: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  inputHint: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 2,
  },
  utrHighlightGroup: {
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    marginBottom: 12,
  },
  utrLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  utrLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#065F46',
  },
  mandatoryBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mandatoryText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#008A38',
  },
  utrInputField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#00C853',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  utrHelpBox: {
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  utrHelpTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 2,
  },
  utrHelpItem: {
    fontSize: 9.5,
    color: '#047857',
    lineHeight: 14,
  },
  mainSubmitBtn: {
    backgroundColor: '#00C853',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  mainSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  backToQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginTop: 6,
  },
  backToQrText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },

  // Pending Screen Styles (All Centered)
  pendingScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingVertical: 32,
  },
  pendingCenterContent: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingIconOuterCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#A7F3D0',
  },
  pendingIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  pendingTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 16,
  },
  pendingTimeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
    marginLeft: 6,
  },
  pendingInfoCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  pendingInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingInfoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  pendingInfoValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    maxWidth: '65%',
    textAlign: 'right',
  },
  pendingStatusPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  pendingDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  pendingWhatsappCard: {
    width: '100%',
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    marginBottom: 18,
  },
  pendingWhatsappTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
    textAlign: 'center',
    marginBottom: 4,
  },
  pendingWhatsappSub: {
    fontSize: 12,
    color: '#047857',
    textAlign: 'center',
    marginBottom: 12,
  },
  pendingWhatsappBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  pendingWhatsappBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  refreshBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 10,
  },
  refreshBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  pendingBackBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBackBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
});
