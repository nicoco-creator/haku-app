/**
 * App Badge API wrapper.
 * Sets/clears the PWA icon badge (navigator.setAppBadge / clearAppBadge).
 * Silently no-ops on browsers that don't support the API.
 */

export function setBadge(count = 1): void {
  if ('setAppBadge' in navigator) {
    navigator.setAppBadge(count).catch(() => {/* ignore */})
  }
}

export function clearBadge(): void {
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(() => {/* ignore */})
  }
}

export const isBadgeSupported = typeof navigator !== 'undefined' && 'setAppBadge' in navigator
