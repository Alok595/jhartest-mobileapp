import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Alert, TextInput, Platform } from 'react-native';
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
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Check,
  Clock,
  Zap,
  HelpCircle,
  Smartphone,
  Award
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
  
  // Payment Settings & 2-Page Flow
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [selectedQrId, setSelectedQrId] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<'details' | 'payment'>('details');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [studentName, setStudentName] = useState(user?.name || '');
  const [studentPhone, setStudentPhone] = useState(user?.phone || '');
  const [studentEmail, setStudentEmail] = useState(user?.email || '');
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFolder = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/folders/${id}`);
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
        if (!res.data.hasAccess) {
          setAccessReason(res.data.reason || 'NO_ORDER');
          setOrderData(res.data.order || null);
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
        }
        setLoading(false);
      }
    } catch (e) {}

    // 2. Background fresh fetch
    const fData = await fetchFolder();
    if (fData?.isPaid) {
      await fetchPaymentSettings();
      await checkAccess(fData);
    } else {
      setHasAccess(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (id) initialize();
  }, [id, user?.id, user?.phone, user?.email]);

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    await checkAccess(folder);
    setRefreshing(false);
  };

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

  const activeUpiId = currentQr?.upiId || paymentSettings?.upiId || '6202585952';
  const activeQrUrl = currentQr?.qrImageUrl || paymentSettings?.qrImageUrl;

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedUpi(true);
    Alert.alert('Copied!', `UPI ID copied to clipboard: ${text}`);
    setTimeout(() => setCopiedUpi(false), 3000);
  };

  const openWhatsAppHelp = () => {
    const finalPrice = folder?.discountPrice || folder?.price || 0;
    const message = `Hello Jharkhand Warrior, I need help with purchasing "${folder?.name || 'Package'}" (Price: ₹${finalPrice}).`;
    const whatsappUrl = `whatsapp://send?phone=917903466871&text=${encodeURIComponent(message)}`;
    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert('Notice', 'Could not open WhatsApp. Please contact 7903466871 manually.');
    });
  };

  const openWhatsAppSupport = () => {
    const utr = orderData?.transactionId || transactionId || '';
    const message = `Hello Jharkhand Warrior, I have submitted payment for "${folder?.name || 'Course'}"${utr ? ` (UTR / Txn ID: ${utr})` : ''}. Please verify and activate my access.`;
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
    setPaymentStep('payment');
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

    if (!studentName.trim() || !studentPhone.trim() || !transactionId.trim()) {
      Alert.alert('Required Fields', 'Please fill in Name, Phone, and 12-digit UTR/Transaction ID');
      return;
    }
    if (transactionId.trim().length < 8) {
      Alert.alert('Invalid UTR', 'Please enter a valid Transaction/UTR ID from your payment receipt');
      return;
    }

    setSubmitting(true);
    try {
      const finalPrice = folder.discountPrice || folder.price;
      const res = await fetch(`${getApiBaseUrl()}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          folderId: id,
          amount: finalPrice,
          transactionId: transactionId.trim(),
          studentName: studentName.trim(),
          studentPhone: studentPhone.trim(),
          studentEmail: studentEmail.trim(),
          upiId: activeUpiId,
        })
      });
      const data = await res.json();
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
                const message = `Hello Jharkhand Warrior, I have submitted a payment request for a premium folder.\n\n📚 Folder: ${folder.name}\n💰 Amount: ₹${finalPrice}\n👤 Name: ${studentName.trim()}\n📱 Phone: ${studentPhone.trim()}\n🔖 UTR / Transaction ID: ${transactionId.trim()}`;
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
              if (paymentStep === 'payment') {
                setPaymentStep('details');
              } else {
                router.back();
              }
            }} 
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>{folder.name}</Text>
            <Text style={styles.headerSub}>
              {paymentStep === 'details' ? 'Course Overview & Curriculum' : 'Payment & Verification'}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={openWhatsAppHelp} 
            style={styles.helpIconBtn}
            activeOpacity={0.75}
          >
            <HelpCircle size={22} color="#059669" />
          </TouchableOpacity>
        </View>

        {paymentStep === 'details' ? (
          /* ================= PAGE 1: COURSE DETAILS & OVERVIEW ================= */
          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.detailsScroll} showsVerticalScrollIndicator={false}>
              {/* Hero Package Banner */}
              <View style={styles.heroCard}>
                <View style={styles.heroBadgeRow}>
                  <View style={styles.premiumPill}>
                    <Sparkles size={12} color="#F59E0B" />
                    <Text style={styles.premiumPillText}>PREMIUM COURSE PACKAGE</Text>
                  </View>
                  <View style={styles.lockedPill}>
                    <Lock size={12} color="#94A3B8" />
                    <Text style={styles.lockedPillText}>ENROLLMENT OPEN</Text>
                  </View>
                </View>

                <Text style={styles.heroTitle}>{folder.name}</Text>
                
                {folder.description ? (
                  <Text style={styles.heroDesc}>{folder.description}</Text>
                ) : (
                  <Text style={styles.heroDesc}>
                    Complete preparation package with full mock tests, high-yield PDF revision notes, and chapter-wise learning modules.
                  </Text>
                )}

                {/* Pricing Banner */}
                <View style={styles.heroPriceRow}>
                  <View>
                    <Text style={styles.heroPriceLabel}>SPECIAL OFFER PRICE</Text>
                    <View style={styles.priceFigures}>
                      <Text style={styles.heroPriceFinal}>₹{finalPrice}</Text>
                      {isDiscounted && (
                        <Text style={styles.heroPriceOriginal}>₹{folder.price}</Text>
                      )}
                      {isDiscounted && (
                        <View style={styles.discountPill}>
                          <Text style={styles.discountPillText}>{discountPercent}% OFF</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.validityBadge}>
                    <Clock size={14} color="#047857" />
                    <Text style={styles.validityBadgeText}>
                      {folder.validity ? `${folder.validity} Days Access` : '365 Days Access'}
                    </Text>
                  </View>
                </View>

                <View style={styles.heroSecurityNote}>
                  <ShieldCheck size={14} color="#10B981" />
                  <Text style={styles.heroSecurityText}>Instant Activation • 100% Verified Syllabus</Text>
                </View>
              </View>

              {/* What You Get in this Package */}
              <View style={styles.featuresCard}>
                <View style={styles.featuresHeader}>
                  <View style={styles.featuresIconCircle}>
                    <Award size={18} color="#4F46E5" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.featuresTitle}>What You Get In This Package</Text>
                    <Text style={styles.featuresSub}>Curated by expert teachers for Jharkhand competitive exams</Text>
                  </View>
                </View>

                <View style={styles.featureList}>
                  {/* Test Series feature */}
                  <View style={styles.featureItem}>
                    <View style={[styles.featureBullet, { backgroundColor: '#EEF2FF' }]}>
                      <Zap size={16} color="#4F46E5" />
                    </View>
                    <View style={styles.featureTextCol}>
                      <Text style={styles.featureHeading}>
                        {testsCount > 0 ? `${testsCount} Mock Tests Included` : 'Full & Subject Mock Tests'}
                      </Text>
                      <Text style={styles.featureDetail}>
                        Real exam interface with timer, negative marking, instant rank, scorecard and detailed solutions.
                      </Text>
                    </View>
                  </View>

                  {/* Materials feature */}
                  <View style={styles.featureItem}>
                    <View style={[styles.featureBullet, { backgroundColor: '#F0FDF4' }]}>
                      <FileText size={16} color="#16A34A" />
                    </View>
                    <View style={styles.featureTextCol}>
                      <Text style={styles.featureHeading}>
                        {materialsCount > 0 ? `${materialsCount} Revision Notes & PDFs` : 'Study Materials & Downloadable PDFs'}
                      </Text>
                      <Text style={styles.featureDetail}>
                        Comprehensive chapter notes, high-yield formula sheets, and subject summaries.
                      </Text>
                    </View>
                  </View>

                  {/* Subfolders feature */}
                  {subfoldersCount > 0 && (
                    <View style={styles.featureItem}>
                      <View style={[styles.featureBullet, { backgroundColor: '#EFF6FF' }]}>
                        <Folder size={16} color="#0284C7" />
                      </View>
                      <View style={styles.featureTextCol}>
                        <Text style={styles.featureHeading}>
                          {`${subfoldersCount} Chapter & Topic Modules`}
                        </Text>
                        <Text style={styles.featureDetail}>
                          Systematically organized chapter-by-chapter breakdown for zero confusion.
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Universal perks */}
                  <View style={styles.featureItem}>
                    <View style={[styles.featureBullet, { backgroundColor: '#FFFBEB' }]}>
                      <Smartphone size={16} color="#D97706" />
                    </View>
                    <View style={styles.featureTextCol}>
                      <Text style={styles.featureHeading}>Unlimited Re-attempts & Mobile App</Text>
                      <Text style={styles.featureDetail}>
                        Re-attempt tests anytime to improve speed and accuracy on mobile and tablet.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Direct Help Button */}
              <TouchableOpacity 
                style={styles.detailsWhatsappRow} 
                onPress={openWhatsAppHelp}
                activeOpacity={0.7}
              >
                <HelpCircle size={16} color="#059669" />
                <Text style={styles.detailsWhatsappText}>Have questions before enrolling? Chat on WhatsApp</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Fixed Bottom Action Bar */}
            <View style={styles.bottomBar}>
              <View style={styles.bottomPriceCol}>
                <Text style={styles.bottomPriceLabel}>TOTAL PRICE</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={styles.bottomFinalPrice}>₹{finalPrice}</Text>
                  {isDiscounted && (
                    <Text style={styles.bottomOriginalPrice}>₹{folder.price}</Text>
                  )}
                </View>
              </View>

              <TouchableOpacity 
                style={styles.continuePaymentBtn} 
                onPress={handleProceedToPayment}
                activeOpacity={0.85}
              >
                <Text style={styles.continuePaymentBtnText}>Continue to Payment</Text>
                <ChevronRight size={18} color="#FFFFFF" strokeWidth={3} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ================= PAGE 2: PAYMENT & VERIFICATION ONLY ================= */
          <ScrollView contentContainerStyle={styles.paymentScroll} showsVerticalScrollIndicator={false}>
            {/* Order Recap Banner */}
            <View style={styles.recapBanner}>
              <View style={styles.recapLeft}>
                <Text style={styles.recapLabel}>ENROLLING IN PACKAGE</Text>
                <Text style={styles.recapTitle} numberOfLines={2}>{folder.name}</Text>
                <Text style={styles.recapPrice}>Amount to Pay: ₹{finalPrice}</Text>
              </View>
              <TouchableOpacity 
                style={styles.recapChangeBtn} 
                onPress={() => setPaymentStep('details')}
                activeOpacity={0.7}
              >
                <Text style={styles.recapChangeText}>← Course Info</Text>
              </TouchableOpacity>
            </View>

            {/* Payment Box (QR & UPI ID) */}
            <View style={styles.paymentBox}>
              <View style={styles.paymentBoxHeader}>
                <Text style={styles.paymentBoxTitle}>Pay ₹{finalPrice} via UPI</Text>
                <Text style={styles.paymentBoxSub}>Scan QR code using any UPI App (GPay, PhonePe, Paytm)</Text>
              </View>

              {/* Multi-QR Scanner Selector Tabs */}
              {qrCodesList.length > 1 && (
                <View style={styles.scannerSelectorContainer}>
                  <Text style={styles.scannerSelectorLabel}>Choose Payment QR:</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.qrTabsContainer}
                  >
                    {qrCodesList.map((qr: any) => {
                      const isSelected = (currentQr && currentQr.id === qr.id);
                      return (
                        <TouchableOpacity
                          key={qr.id}
                          onPress={() => setSelectedQrId(qr.id)}
                          style={[
                            styles.qrTabButton,
                            isSelected && styles.qrTabButtonActive
                          ]}
                        >
                          <Text style={[styles.qrTabText, isSelected && styles.qrTabTextActive]}>
                            {qr.title || 'QR Scanner'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* UPI ID Pill with Copy */}
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
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      <Text style={styles.copyBtnTextSuccess}>Copied</Text>
                    </>
                  ) : (
                    <>
                      <Copy size={14} color="#4F46E5" />
                      <Text style={styles.copyBtnText}>Copy</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Dynamic QR Code Image */}
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
                <View style={styles.qrFooterBadge}>
                  <Text style={styles.qrFooterText}>Google Pay • PhonePe • Paytm • BHIM</Text>
                </View>
              </View>

              {paymentSettings?.instructions ? (
                <View style={styles.instructionNote}>
                  <Text style={styles.instructionTitle}>Admin Instructions:</Text>
                  <Text style={styles.instructionBody}>{paymentSettings.instructions}</Text>
                </View>
              ) : null}
            </View>

            {/* Verification Form Card */}
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <Text style={styles.formMainTitle}>Enter Payment Verification</Text>
                <Text style={styles.formMainSub}>
                  After paying, submit your transaction details below for quick approval:
                </Text>
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
                <Text style={styles.inputHint}>Access activation confirmation will be sent here.</Text>
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

              {/* UTR Input - Highlighted */}
              <View style={[styles.inputGroup, styles.utrHighlightGroup]}>
                <View style={styles.utrLabelRow}>
                  <Text style={styles.utrLabel}>12-Digit UTR / Transaction ID *</Text>
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

                {/* Helper Callout for UTR */}
                <View style={styles.utrHelpBox}>
                  <Text style={styles.utrHelpTitle}>💡 Where do I find the UTR / Transaction ID?</Text>
                  <Text style={styles.utrHelpItem}>• <Text style={{ fontWeight: '700' }}>PhonePe:</Text> View payment history → Look for 12-digit 'UTR'</Text>
                  <Text style={styles.utrHelpItem}>• <Text style={{ fontWeight: '700' }}>Google Pay:</Text> Tap transaction → 'UPI transaction ID'</Text>
                  <Text style={styles.utrHelpItem}>• <Text style={{ fontWeight: '700' }}>Paytm:</Text> Transaction receipt → 'UPI Ref No.'</Text>
                </View>
              </View>

              {/* Submit Action */}
              <TouchableOpacity 
                style={[styles.mainSubmitBtn, submitting && { opacity: 0.7 }]} 
                onPress={submitPayment}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.mainSubmitBtnText}>Submitting Details...</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.mainSubmitBtnText}>Verify Payment & Unlock Course</Text>
                    <ChevronRight size={18} color="#FFFFFF" strokeWidth={3} style={{ marginLeft: 6 }} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Back to Step 1 */}
              <TouchableOpacity 
                style={styles.backToQrBtn} 
                onPress={() => setPaymentStep('details')}
                activeOpacity={0.7}
              >
                <ArrowLeft size={16} color="#64748B" style={{ marginRight: 6 }} />
                <Text style={styles.backToQrText}>Back to Course Details</Text>
              </TouchableOpacity>
            </View>

            {/* Direct WhatsApp Help */}
            <TouchableOpacity 
              style={styles.whatsappHelpRow} 
              onPress={openWhatsAppHelp}
              activeOpacity={0.7}
            >
              <HelpCircle size={16} color="#059669" />
              <Text style={styles.whatsappHelpText}>Having trouble or want to pay manually? Chat on WhatsApp</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // --- Normal Content Render (hasAccess = true) ---
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                      <Text style={[styles.cardTitle, { fontSize: 15 }]} numberOfLines={2}>
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
                          {child.isPaid ? 'Buy Course' : 'View Content'}
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
            {folder.testSeries.map((ts: any) => (
              <TouchableOpacity
                key={ts.id}
                style={styles.courseCard}
                activeOpacity={0.82}
                onPress={() => router.push(`/series/${ts.id}`)}
              >
                {/* Thumbnail */}
                <View style={styles.thumbnailContainer}>
                  {ts.thumbnail ? (
                    <Image source={{ uri: ts.thumbnail }} style={styles.thumbnailImage} />
                  ) : (
                    <View style={styles.thumbnailPlaceholder}>
                      <ShoppingCart size={24} color="#64748B" />
                    </View>
                  )}
                </View>

                {/* Content */}
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, { fontSize: 15 }]} numberOfLines={2}>
                    {ts.title}
                  </Text>

                  <View style={{ marginTop: 'auto', flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 6 }}>
                    <View style={{ 
                      backgroundColor: '#EFF6FF', 
                      paddingHorizontal: 12, 
                      paddingVertical: 5, 
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}>
                      <Text style={{ 
                        color: '#0072FF', 
                        fontSize: 11, 
                        fontWeight: '700' 
                      }}>
                        Start Test Series
                      </Text>
                      <ChevronRight size={14} color="#0072FF" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
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

  courseCard: {
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

  // Help Icon in Header
  helpIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
  },

  // 2-Page Scroll Views
  detailsScroll: {
    padding: 16,
    paddingBottom: 130,
  },
  paymentScroll: {
    padding: 16,
    paddingBottom: 40,
  },

  detailsWhatsappRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  detailsWhatsappText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 6,
    textDecorationLine: 'underline',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 22,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomPriceCol: {
    justifyContent: 'center',
  },
  bottomPriceLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  bottomFinalPrice: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0072FF',
    marginRight: 6,
  },
  bottomOriginalPrice: {
    fontSize: 14,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  continuePaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0072FF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  continuePaymentBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginRight: 6,
  },

  // Premium Hero Card
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  premiumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  premiumPillText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 5,
    letterSpacing: 0.5,
  },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lockedPillText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 28,
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 19,
    marginBottom: 16,
  },
  heroPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  heroPriceLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  priceFigures: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroPriceFinal: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginRight: 8,
  },
  heroPriceOriginal: {
    fontSize: 16,
    color: '#64748B',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  discountPill: {
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  validityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  validityBadgeText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
  },
  heroSecurityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  heroSecurityText: {
    color: '#6EE7B7',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Features Card (What you get)
  featuresCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  featuresHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  featuresIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  featuresSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureBullet: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  featureTextCol: {
    flex: 1,
  },
  featureHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  featureDetail: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },

  // Payment Box (QR & UPI)
  paymentBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  paymentBoxHeader: {
    marginBottom: 14,
  },
  paymentBoxTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  paymentBoxSub: {
    fontSize: 12,
    color: '#64748B',
  },
  scannerSelectorContainer: {
    marginBottom: 12,
  },
  scannerSelectorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
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
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
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
    borderRadius: 12,
    marginBottom: 14,
  },
  upiInfo: {
    flex: 1,
    marginRight: 10,
  },
  upiTag: {
    fontSize: 10,
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
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  copyBtnSuccess: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
    marginLeft: 4,
  },
  copyBtnTextSuccess: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  qrFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  qrImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  qrFooterBadge: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qrFooterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  instructionNote: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  instructionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  instructionBody: {
    fontSize: 12,
    color: '#78350F',
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
    backgroundColor: '#0072FF',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
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
    paddingVertical: 6,
  },
  whatsappHelpText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
    marginLeft: 6,
    textDecorationLine: 'underline',
  },

  // Step 2 Styles
  stepTwoWrapper: {
    width: '100%',
  },
  recapBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 16,
  },
  recapLeft: {
    flex: 1,
    marginRight: 10,
  },
  recapLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4338CA',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  recapTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  recapPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
    marginTop: 2,
  },
  recapChangeBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  recapChangeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  formHeader: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  formMainTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  formMainSub: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputField: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  inputHint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  utrHighlightGroup: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#818CF8',
    marginBottom: 18,
  },
  utrLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  utrLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  mandatoryBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mandatoryText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F46E5',
  },
  utrInputField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#4F46E5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1,
    marginBottom: 10,
  },
  utrHelpBox: {
    backgroundColor: '#EEF2FF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  utrHelpTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3730A3',
    marginBottom: 4,
  },
  utrHelpItem: {
    fontSize: 11,
    color: '#4338CA',
    lineHeight: 16,
  },
  mainSubmitBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
  },
  mainSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  backToQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  backToQrText: {
    fontSize: 13,
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
