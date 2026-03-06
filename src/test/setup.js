import { afterEach, vi } from 'vitest';

vi.mock('devextreme/ui/themes', () => {
  const api = {
    setDefaultTimeout: () => {},
    initialized: (cb) => cb && cb(),
    resetTheme: () => {},
    ready: (cb) => cb && cb(),
    waitWebFont: () => Promise.resolve(),
    isWebFontLoaded: () => true,
    isCompact: () => false,
    isDark: () => false,
    isGeneric: () => true,
    isMaterial: () => false,
    detachCssClasses: () => {},
    attachCssClasses: () => {},
    current: () => 'generic.light',
    waitForThemeLoad: () => {},
    isPendingThemeLoaded: () => true,
  };

  return {
    default: api,
    ...api,
  };
});

const activeTimeouts = new Set();
const activeIntervals = new Set();
const nativeSetTimeout = setTimeout.bind(globalThis);
const nativeClearTimeout = clearTimeout.bind(globalThis);
const nativeSetInterval = setInterval.bind(globalThis);
const nativeClearInterval = clearInterval.bind(globalThis);
const fallbackGetComputedStyle = () => ({
  fontFamily: 'dx.generic.light',
  getPropertyValue: () => 'dx.generic.light',
});

function ensureGetComputedStyle() {
  if (typeof window !== 'undefined' && typeof window.getComputedStyle !== 'function') {
    window.getComputedStyle = fallbackGetComputedStyle;
  }

  if (typeof globalThis.getComputedStyle !== 'function') {
    globalThis.getComputedStyle = fallbackGetComputedStyle;
  }
}

ensureGetComputedStyle();

globalThis.setTimeout = (handler, timeout, ...args) => {
  const id = nativeSetTimeout(() => {
    activeTimeouts.delete(id);
    ensureGetComputedStyle();
    handler(...args);
  }, timeout);
  activeTimeouts.add(id);
  return id;
};

globalThis.clearTimeout = (id) => {
  activeTimeouts.delete(id);
  return nativeClearTimeout(id);
};

globalThis.setInterval = (handler, timeout, ...args) => {
  const id = nativeSetInterval(() => {
    ensureGetComputedStyle();
    handler(...args);
  }, timeout);
  activeIntervals.add(id);
  return id;
};

globalThis.clearInterval = (id) => {
  activeIntervals.delete(id);
  return nativeClearInterval(id);
};

if (typeof window !== 'undefined') {
  window.setTimeout = globalThis.setTimeout;
  window.clearTimeout = globalThis.clearTimeout;
  window.setInterval = globalThis.setInterval;
  window.clearInterval = globalThis.clearInterval;
}

afterEach(() => {
  for (const id of activeTimeouts) {
    nativeClearTimeout(id);
  }
  for (const id of activeIntervals) {
    nativeClearInterval(id);
  }
  activeTimeouts.clear();
  activeIntervals.clear();
  ensureGetComputedStyle();
});
