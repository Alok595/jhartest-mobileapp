import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Dimensions,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {
  DownloadCloud,
  Sparkles,
  AlertCircle,
  ExternalLink,
  X,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { AppUpdateInfo } from '../services/updateService';

interface AppUpdateModalProps {
  visible: boolean;
  updateInfo: AppUpdateInfo | null;
  onDismiss: () => void;
}

export default function AppUpdateModal({
  visible,
  updateInfo,
  onDismiss,
}: AppUpdateModalProps) {
  if (!updateInfo || !visible) return null;

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0); // 0 to 100
  const [downloadedMB, setDownloadedMB] = useState('0');
  const [totalMB, setTotalMB] = useState('0');
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'ready' | 'error'>('idle');

  const downloadResumableRef = useRef<FileSystem.DownloadResumable | null>(null);

  const startInAppDownloadAndInstall = async () => {
    if (!updateInfo.apkDownloadUrl) {
      Alert.alert(
        'Update Link Not Configured',
        'Please check back soon or contact support to download the latest update.'
      );
      return;
    }

    // If on iOS or Web, open standard link
    if (Platform.OS !== 'android') {
      Linking.openURL(updateInfo.apkDownloadUrl);
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadState('downloading');
      setDownloadProgress(0);

      const targetFileUri = `${FileSystem.cacheDirectory}jhartest-update-v${updateInfo.latestVersion}.apk`;

      // Check if already downloaded previously
      const existingInfo = await FileSystem.getInfoAsync(targetFileUri);
      if (existingInfo.exists) {
        await FileSystem.deleteAsync(targetFileUri, { idempotent: true });
      }

      const downloadCallback = (progress: FileSystem.DownloadProgressData) => {
        const percent = Math.floor(
          (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100
        );
        setDownloadProgress(Math.min(100, Math.max(0, percent || 0)));

        const written = (progress.totalBytesWritten / (1024 * 1024)).toFixed(1);
        const total = (progress.totalBytesExpectedToWrite / (1024 * 1024)).toFixed(1);
        setDownloadedMB(written);
        if (progress.totalBytesExpectedToWrite > 0) {
          setTotalMB(total);
        }
      };

      downloadResumableRef.current = FileSystem.createDownloadResumable(
        updateInfo.apkDownloadUrl,
        targetFileUri,
        {},
        downloadCallback
      );

      const result = await downloadResumableRef.current.downloadAsync();

      if (result && result.uri) {
        setDownloadState('ready');
        setDownloadProgress(100);

        // Convert file path to Android Content Provider URI for secure package installer
        const contentUri = await FileSystem.getContentUriAsync(result.uri);

        // Launch Android native Package Installer directly!
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
          type: 'application/vnd.android.package-archive',
        });
      } else {
        throw new Error('Download failed to return a valid APK file URI.');
      }
    } catch (error: any) {
      console.warn('In-app auto download error, falling back to browser:', error);
      setDownloadState('error');

      // Fallback: offer direct browser download
      Alert.alert(
        'In-App Download Notice',
        'Would you like to download directly via your browser?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setIsDownloading(false) },
          {
            text: 'Open Browser Download',
            onPress: () => {
              setIsDownloading(false);
              Linking.openURL(updateInfo.apkDownloadUrl);
            },
          },
        ]
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!updateInfo.isForceUpdate && !isDownloading) {
          onDismiss();
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Dismiss button if optional and not downloading */}
          {!updateInfo.isForceUpdate && !isDownloading && (
            <TouchableOpacity
              style={styles.closeBtn}
              activeOpacity={0.7}
              onPress={onDismiss}
            >
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}

          {/* Header Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconGlow} />
            <View style={styles.iconCircle}>
              {downloadState === 'ready' ? (
                <CheckCircle2 size={32} color="#FFFFFF" />
              ) : (
                <DownloadCloud size={32} color="#FFFFFF" />
              )}
            </View>
          </View>

          {/* Title & Badge */}
          <Text style={styles.title}>
            {downloadState === 'ready'
              ? 'Update Ready to Install!'
              : downloadState === 'downloading'
              ? 'Downloading Update...'
              : 'New Update Available!'}
          </Text>

          <View style={styles.badgeContainer}>
            <View style={styles.versionBadge}>
              <Sparkles size={13} color="#0072FF" />
              <Text style={styles.versionText}>
                v{updateInfo.currentVersion} →{' '}
                <Text style={styles.newVersionText}>v{updateInfo.latestVersion}</Text>
              </Text>
            </View>
          </View>

          {updateInfo.isForceUpdate && (
            <View style={styles.mandatoryAlert}>
              <AlertCircle size={14} color="#D97706" />
              <Text style={styles.mandatoryText}>
                This is a required update to keep using JharTest smoothly.
              </Text>
            </View>
          )}

          {/* Release Notes or Progress Bar */}
          {downloadState === 'downloading' || downloadState === 'ready' ? (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressPercent}>{downloadProgress}%</Text>
                {totalMB !== '0' && (
                  <Text style={styles.progressMB}>
                    {downloadedMB} MB / {totalMB} MB
                  </Text>
                )}
              </View>

              {/* Progress Bar Track */}
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.max(4, downloadProgress)}%` },
                  ]}
                />
              </View>

              <Text style={styles.progressHint}>
                {downloadState === 'ready'
                  ? 'Tap "Install Now" below to apply the update.'
                  : 'Please keep the app open while downloading...'}
              </Text>
            </View>
          ) : (
            <View style={styles.notesContainer}>
              <Text style={styles.notesHeader}>What's New in this Version:</Text>
              <ScrollView style={styles.notesScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.notesContent}>{updateInfo.releaseNotes}</Text>
              </ScrollView>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionContainer}>
            {downloadState === 'ready' ? (
              <TouchableOpacity
                style={[styles.updateButton, { backgroundColor: '#16A34A' }]}
                activeOpacity={0.8}
                onPress={startInAppDownloadAndInstall}
              >
                <Text style={styles.updateButtonText}>Install Update Now ⚡</Text>
              </TouchableOpacity>
            ) : downloadState === 'downloading' ? (
              <View style={styles.downloadingBtn}>
                <ActivityIndicator size="small" color="#0072FF" />
                <Text style={styles.downloadingBtnText}>
                  Downloading APK ({downloadProgress}%)...
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.updateButton}
                activeOpacity={0.8}
                onPress={startInAppDownloadAndInstall}
              >
                <Text style={styles.updateButtonText}>Download & Auto-Install 🚀</Text>
              </TouchableOpacity>
            )}

            {!updateInfo.isForceUpdate && !isDownloading && (
              <TouchableOpacity
                style={styles.laterButton}
                activeOpacity={0.7}
                onPress={onDismiss}
              >
                <Text style={styles.laterButtonText}>Remind Me Later</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 17, 32, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: Math.min(width - 40, 380),
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    zIndex: 10,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconGlow: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(0, 114, 255, 0.2)',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0072FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  badgeContainer: {
    marginTop: 6,
    marginBottom: 12,
  },
  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  versionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  newVersionText: {
    color: '#0072FF',
    fontWeight: '900',
  },
  mandatoryAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
  },
  mandatoryText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '700',
    flex: 1,
  },
  notesContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  notesHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  notesScroll: {
    maxHeight: 120,
  },
  notesContent: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    fontWeight: '500',
  },
  progressContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0072FF',
  },
  progressMB: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0072FF',
    borderRadius: 5,
  },
  progressHint: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 10,
    textAlign: 'center',
  },
  actionContainer: {
    width: '100%',
    gap: 8,
  },
  updateButton: {
    backgroundColor: '#0072FF',
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  downloadingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 13,
    borderRadius: 16,
  },
  downloadingBtnText: {
    color: '#0072FF',
    fontSize: 13,
    fontWeight: '800',
  },
  laterButton: {
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterButtonText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
});
