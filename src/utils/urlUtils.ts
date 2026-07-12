/**
 * URL utility functions for RefreshFlow
 */

export function normalizeUrl(url: string, ignoreParams: boolean): string {
  try {
    const parsed = new URL(url);
    if (ignoreParams) {
      parsed.search = '';
      parsed.hash = '';
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export function getOrigin(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'file:') {
      return 'file://*';
    }
    return `${parsed.protocol}//${parsed.host}/*`;
  } catch {
    return '*://*/*';
  }
}

export function isInjectableUrl(url: string): boolean {
  if (!url) return false;
  
  const forbiddenProtocols = [
    'chrome:',
    'chrome-extension:',
    'about:',
    'edge:',
    'opera:',
    'brave:',
    'view-source:',
    'javascript:',
    'data:'
  ];

  try {
    const parsed = new URL(url);
    if (forbiddenProtocols.includes(parsed.protocol)) {
      return false;
    }
    
    // Special check for Chrome Web Store which forbids extension scripts
    if (parsed.host.includes('chromewebstore.google.com') || parsed.host.includes('chrome.google.com/webstore')) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}
