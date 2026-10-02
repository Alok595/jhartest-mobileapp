import React from 'react';
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
} from 'react-native';
import { DownloadCloud, Sparkles, AlertCircle, ExternalLink, X } from 'lucide-react-native';
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

  const handleUpdatePress = async () => {
    if (!updateInfo.apkDownloadUrl) {
      Alert.alert(
        'Update Link Not Configured',
        'Please check back soon or contact support to download the latest update.'
      );
      return;
    }

    try {
      const supported = await Linking.canOpenURL(updateInfo.apkDownloadUrl);
      if (supported) {
        await Linking.openURL(updateInfo.apkDownloadUrl);
      } else {
        await Linking.openURL(updateInfo.apkDownloadUrl);
      }
    } catch (e) {
      Alert.alert('Download Error', 'Could not open the update link. Please verify your connection.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!updateInfo.isForceUpdate) {
          onDismiss();
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Dismiss button if optional */}
          {!updateInfo.isForceUpdate && (
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
              <DownloadCloud size={32} color="#FFFFFF" />
            </View>
          </View>

          {/* Title & Badge */}
          <Text style={styles.title}>Update Available!</Text>
          <View style={styles.badgeContainer}>
            <View style={styles.versionBadge}>
              <Sparkles size={13} color="#0072FF" />
              <Text style={styles.versionText}>
                v{updateInfo.currentVersion} → <Text style={styles.newVersionText}>v{updateInfo.latestVersion}</Text>
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

          {/* Release Notes */}
          <View style={styles.notesContainer}>
            <Text style={styles.notesHeader}>What's New in this Version:</Text>
            <ScrollView style={styles.notesScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.notesContent}>{updateInfo.releaseNotes}</Text>
            </ScrollView>
          </View>

          {/* Actions */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.updateButton}
              activeOpacity={0.8}
              onPress={handleUpdatePress}
            >
              <Text style={styles.updateButtonText}>Download & Install Update 🚀</Text>
            </TouchableOpacity>

            {!updateInfo.isForceUpdate && (
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
    backgroundColor: 'rgba(11, 17, 32, 0.75)',
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
    fontSize: 20,
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
