import Constants from 'expo-constants';
import { apiClient } from './api';

export interface AppUpdateInfo {
  isUpdateAvailable: boolean;
  isForceUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  minVersion: string;
  apkDownloadUrl: string;
  releaseNotes: string;
}

/**
 * Returns current installed app version from expoConfig or fallback
 */
export function getCurrentAppVersion(): string {
  return Constants.expoConfig?.version || '1.0.0';
}

/**
 * Robust SemVer comparator: returns true if v1 > v2
 * e.g., compareSemVer('1.1.0', '1.0.9') -> true
 */
export function isNewerVersion(remoteVer: string, currentVer: string): boolean {
  if (!remoteVer || !currentVer) return false;

  const clean = (v: string) => v.replace(/^v/i, '').trim();
  const v1Parts = clean(remoteVer).split('.').map(num => parseInt(num, 10) || 0);
  const v2Parts = clean(currentVer).split('.').map(num => parseInt(num, 10) || 0);

  const length = Math.max(v1Parts.length, v2Parts.length);
  for (let i = 0; i < length; i++) {
    const p1 = v1Parts[i] || 0;
    const p2 = v2Parts[i] || 0;
    if (p1 > p2) return true;
    if (p1 < p2) return false;
  }
  return false;
}

/**
 * Check if current version is below the minimum required version
 */
export function isBelowMinVersion(minVer: string, currentVer: string): boolean {
  if (!minVer || !currentVer) return false;
  return isNewerVersion(minVer, currentVer);
}

/**
 * Check server for app update info safely (non-blocking)
 */
export async function checkAppUpdate(): Promise<AppUpdateInfo | null> {
  try {
    const currentVersion = getCurrentAppVersion();
    const response = await apiClient.get('/app-version', { timeout: 8000 });

    if (response.data && response.data.success && response.data.data) {
      const {
        latestVersion = '1.0.0',
        minVersion = '1.0.0',
        apkDownloadUrl = '',
        releaseNotes = '',
        forceUpdate = false,
      } = response.data.data;

      const hasNewVersion = isNewerVersion(latestVersion, currentVersion);
      const isCritical = Boolean(forceUpdate) || isBelowMinVersion(minVersion, currentVersion);

      return {
        isUpdateAvailable: hasNewVersion,
        isForceUpdate: hasNewVersion && isCritical,
        currentVersion,
        latestVersion,
        minVersion,
        apkDownloadUrl,
        releaseNotes: releaseNotes || '• Bug fixes and general performance enhancements.',
      };
    }
    return null;
  } catch (error) {
    // Fail silently so the user experience is never disrupted
    console.log('App update check skipped (network or server unavailable):', (error as any)?.message);
    return null;
  }
}
