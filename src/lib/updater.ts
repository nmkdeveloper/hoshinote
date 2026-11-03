/**
 * GitHub Auto-Updater Client for Hoshinote
 * Checks latest release from github.com/nmkdeveloper/hoshinote
 */

import { open } from '@tauri-apps/plugin-shell';
import { isTauri } from './api';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  htmlUrl: string;
  downloadUrl: string;
  error?: string;
}

const GITHUB_REPO = 'nmkdeveloper/hoshinote';
const LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

/**
 * Strips 'v' prefix and compares semantic version numbers (major.minor.patch).
 * Returns true if latest > current.
 */
export function isNewerVersion(current: string, latest: string): boolean {
  const cleanCurrent = current.replace(/^v/i, '').trim();
  const cleanLatest = latest.replace(/^v/i, '').trim();

  const cParts = cleanCurrent.split('.').map((p) => parseInt(p, 10) || 0);
  const lParts = cleanLatest.split('.').map((p) => parseInt(p, 10) || 0);

  const maxLen = Math.max(cParts.length, lParts.length);
  for (let i = 0; i < maxLen; i++) {
    const c = cParts[i] || 0;
    const l = lParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }

  return false;
}

/**
 * Checks GitHub Releases API for updates.
 */
export async function checkAppUpdate(currentVersion: string = '0.2.0'): Promise<UpdateInfo> {
  try {
    const res = await fetch(LATEST_RELEASE_API, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      throw new Error(`GitHub API HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const latestTag = data.tag_name || '';
    const hasUpdate = isNewerVersion(currentVersion, latestTag);

    // Pick target asset if available (e.g. .exe / .msi for windows, or html_url)
    const downloadUrl =
      data.assets && data.assets.length > 0
        ? data.assets[0].browser_download_url
        : data.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`;

    return {
      hasUpdate,
      currentVersion,
      latestVersion: latestTag,
      releaseName: data.name || latestTag,
      releaseNotes: data.body || 'No release notes provided.',
      publishedAt: data.published_at || new Date().toISOString(),
      htmlUrl: data.html_url || `https://github.com/${GITHUB_REPO}/releases`,
      downloadUrl,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Network error';
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      releaseName: `Hoshinote v${currentVersion}`,
      releaseNotes: '',
      publishedAt: new Date().toISOString(),
      htmlUrl: `https://github.com/${GITHUB_REPO}/releases`,
      downloadUrl: `https://github.com/${GITHUB_REPO}/releases`,
      error: errMsg,
    };
  }
}

/**
 * Opens download release in default desktop browser / system handler
 */
export async function openReleaseDownload(url: string): Promise<void> {
  if (isTauri()) {
    try {
      await open(url);
      return;
    } catch (_) {
      // Fallback to window.open if shell plugin fails
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
