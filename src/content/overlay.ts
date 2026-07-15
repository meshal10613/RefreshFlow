/**
 * On-page "Visual Timer Overlay" — a small floating countdown injected into
 * the host page when a RefreshFlow job is running and the
 * "Show Visual Timer Overlay" setting is on.
 *
 * Rendered inside a closed Shadow DOM so the host page's CSS can never leak
 * in or be affected by ours. Colors/type match the extension's own design
 * tokens (see src/assets/styles/globals.css) rather than reusing Tailwind
 * classes, since this file ships standalone into arbitrary pages.
 */

const COLORS = {
  signal500: '#0f766e',
  signal400: '#2dd4bf',
  ink900: '#0f172a',
  ink950: '#070a13',
  paper50: '#fafaf9',
  inkBorder: 'rgba(255, 255, 255, 0.08)'
};

const FONT_MONO = "'SFMono-Regular', ui-monospace, 'JetBrains Mono', Menlo, Consolas, monospace";
const FONT_SANS = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const RADIUS = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface OverlayState {
  jobId: string;
  jobName: string;
  nextRunAt: number;
  intervalMs: number;
  status?: 'running' | 'paused';
}

let hostEl: HTMLDivElement | null = null;
let shadow: ShadowRoot | null = null;
let tickHandle: ReturnType<typeof setInterval> | null = null;
let dismissed = false;
let current: OverlayState | null = null;
let currentSettingsTheme: 'light' | 'dark' | 'system' = 'system';

function getThemeMode(settingsTheme: 'light' | 'dark' | 'system'): 'dark' | 'light' {
  if (settingsTheme === 'dark') return 'dark';
  if (settingsTheme === 'light') return 'light';
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

function applyTheme(settingsTheme: 'light' | 'dark' | 'system') {
  currentSettingsTheme = settingsTheme;
  if (!shadow) return;
  const card = shadow.querySelector('.card') as HTMLDivElement;
  if (!card) return;

  const mode = getThemeMode(settingsTheme);
  if (mode === 'dark') {
    card.classList.remove('light');
    card.classList.add('dark');
  } else {
    card.classList.remove('dark');
    card.classList.add('light');
  }
}

function applySnappedPosition(position: string) {
  if (!hostEl) return;
  hostEl.style.top = '';
  hostEl.style.left = '';
  hostEl.style.bottom = '';
  hostEl.style.right = '';
  
  if (position === 'top-left') {
    hostEl.style.top = '16px';
    hostEl.style.left = '16px';
  } else if (position === 'top-right') {
    hostEl.style.top = '16px';
    hostEl.style.right = '16px';
  } else if (position === 'bottom-left') {
    hostEl.style.bottom = '16px';
    hostEl.style.left = '16px';
  } else {
    // bottom-right
    hostEl.style.bottom = '16px';
    hostEl.style.right = '16px';
  }
}

function initDrag(card: HTMLDivElement) {
  let offsetX = 0;
  let offsetY = 0;
  let active = false;

  const dragStart = (e: MouseEvent) => {
    if (e.target && (e.target as HTMLElement).closest('button')) {
      return; // Clicks on control buttons shouldn't trigger dragging
    }
    
    card.style.transition = 'none'; // Disable smooth transitions during active dragging
    active = true;
    const rect = hostEl!.getBoundingClientRect();
    
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
  };

  const drag = (e: MouseEvent) => {
    if (!active || !hostEl) return;
    
    let left = e.clientX - offsetX;
    let top = e.clientY - offsetY;
    
    const width = hostEl.offsetWidth;
    const height = hostEl.offsetHeight;
    
    // Enforce viewport boundaries
    left = Math.max(8, Math.min(window.innerWidth - width - 8, left));
    top = Math.max(8, Math.min(window.innerHeight - height - 8, top));
    
    hostEl.style.bottom = 'auto';
    hostEl.style.right = 'auto';
    hostEl.style.left = `${left}px`;
    hostEl.style.top = `${top}px`;
  };

  const dragEnd = () => {
    if (!active || !hostEl) return;
    active = false;
    
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', dragEnd);
    
    card.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s, border-color 0.2s, color 0.2s';
    
    // Snap to the closest of the 4 screen corners
    const rect = hostEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const corners = {
      'top-left': { x: 0, y: 0 },
      'top-right': { x: window.innerWidth, y: 0 },
      'bottom-left': { x: 0, y: window.innerHeight },
      'bottom-right': { x: window.innerWidth, y: window.innerHeight }
    };
    
    let closestCorner = 'bottom-right';
    let minDistance = Infinity;
    
    for (const [cornerName, coord] of Object.entries(corners)) {
      const dist = Math.hypot(centerX - coord.x, centerY - coord.y);
      if (dist < minDistance) {
        minDistance = dist;
        closestCorner = cornerName;
      }
    }
    
    applySnappedPosition(closestCorner);
    
    if (current?.jobId) {
      chrome.storage.local.set({ [`overlayPosition:${current.jobId}`]: closestCorner });
    }
  };

  // Mobile / touch support
  const touchStart = (e: TouchEvent) => {
    if (e.target && (e.target as HTMLElement).closest('button')) return;
    card.style.transition = 'none';
    active = true;
    const rect = hostEl!.getBoundingClientRect();
    const touch = e.touches[0];
    offsetX = touch.clientX - rect.left;
    offsetY = touch.clientY - rect.top;
    
    document.addEventListener('touchmove', touchMove, { passive: false });
    document.addEventListener('touchend', touchEnd);
  };

  const touchMove = (e: TouchEvent) => {
    if (!active || !hostEl) return;
    e.preventDefault();
    const touch = e.touches[0];
    let left = touch.clientX - offsetX;
    let top = touch.clientY - offsetY;
    const width = hostEl.offsetWidth;
    const height = hostEl.offsetHeight;
    left = Math.max(8, Math.min(window.innerWidth - width - 8, left));
    top = Math.max(8, Math.min(window.innerHeight - height - 8, top));
    hostEl.style.bottom = 'auto';
    hostEl.style.right = 'auto';
    hostEl.style.left = `${left}px`;
    hostEl.style.top = `${top}px`;
  };

  const touchEnd = () => {
    if (!active || !hostEl) return;
    active = false;
    document.removeEventListener('touchmove', touchMove);
    document.removeEventListener('touchend', touchEnd);
    card.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s, border-color 0.2s, color 0.2s';
    const rect = hostEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const corners = {
      'top-left': { x: 0, y: 0 },
      'top-right': { x: window.innerWidth, y: 0 },
      'bottom-left': { x: 0, y: window.innerHeight },
      'bottom-right': { x: window.innerWidth, y: window.innerHeight }
    };
    
    let closestCorner = 'bottom-right';
    let minDistance = Infinity;
    for (const [cornerName, coord] of Object.entries(corners)) {
      const dist = Math.hypot(centerX - coord.x, centerY - coord.y);
      if (dist < minDistance) {
        minDistance = dist;
        closestCorner = cornerName;
      }
    }
    applySnappedPosition(closestCorner);
    if (current?.jobId) {
      chrome.storage.local.set({ [`overlayPosition:${current.jobId}`]: closestCorner });
    }
  };

  card.addEventListener('mousedown', dragStart);
  card.addEventListener('touchstart', touchStart);
}

function ensureHost(): ShadowRoot {
  if (shadow) return shadow;

  hostEl = document.createElement('div');
  hostEl.id = 'refreshflow-overlay-host';
  hostEl.style.all = 'initial';
  hostEl.style.position = 'fixed';
  hostEl.style.zIndex = '2147483647';
  hostEl.style.bottom = '16px';
  hostEl.style.right = '16px';
  hostEl.style.pointerEvents = 'none';

  shadow = hostEl.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; }
    .card {
      pointer-events: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px 8px 8px 8px;
      border-radius: 16px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      font-family: ${FONT_SANS};
      animation: rf-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      width: 120px;
      height: 125px;
      user-select: none;
      cursor: grab;
      position: relative;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s, border-color 0.2s, color 0.2s;
    }
    .card:active {
      cursor: grabbing;
    }
    @keyframes rf-slide-up {
      from { transform: translateY(8px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    /* Dark Theme Styles */
    .card.dark {
      background: rgba(7, 10, 19, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #fff;
      box-shadow: 0 12px 32px -4px rgba(0, 0, 0, 0.35), 0 4px 8px -2px rgba(0, 0, 0, 0.2);
    }
    .card.dark .name {
      color: rgba(255, 255, 255, 0.7);
    }
    .card.dark .ring-track {
      stroke: rgba(255, 255, 255, 0.08);
    }
    .card.dark .action-btn {
      color: rgba(255, 255, 255, 0.55);
    }
    .card.dark .action-btn:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.08);
    }
    .card.dark .action-btn.close-btn:hover {
      color: #f43f5e;
      background: rgba(244, 63, 94, 0.1);
    }
    .card.dark .action-btn.stop-btn:hover {
      color: #f43f5e;
      background: rgba(244, 63, 94, 0.12);
    }

    /* Light Theme Styles */
    .card.light {
      background: rgba(255, 255, 255, 0.88);
      border: 1px solid rgba(15, 23, 42, 0.08);
      color: #0f172a;
      box-shadow: 0 12px 32px -4px rgba(15, 23, 42, 0.12), 0 4px 8px -2px rgba(15, 23, 42, 0.06);
    }
    .card.light .name {
      color: rgba(15, 23, 42, 0.7);
    }
    .card.light .ring-track {
      stroke: rgba(15, 23, 42, 0.08);
    }
    .card.light .action-btn {
      color: rgba(15, 23, 42, 0.55);
    }
    .card.light .action-btn:hover {
      color: #0f172a;
      background: rgba(15, 23, 42, 0.06);
    }
    .card.light .action-btn.close-btn:hover {
      color: #e11d48;
      background: rgba(225, 29, 72, 0.08);
    }
    .card.light .action-btn.stop-btn:hover {
      color: #e11d48;
      background: rgba(225, 29, 72, 0.08);
    }

    /* Absolute Close button */
    .action-btn.close-btn {
      position: absolute;
      top: 4px;
      right: 4px;
      padding: 3px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      background: transparent;
      border: none;
      transition: all 0.2s ease;
      color: rgba(255, 255, 255, 0.4);
      z-index: 10;
    }
    .card.light .action-btn.close-btn {
      color: rgba(15, 23, 42, 0.4);
    }

    .drag-handle {
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.25);
      cursor: grab;
      flex-shrink: 0;
      width: 100%;
      margin-top: -6px;
      margin-bottom: 2px;
      padding: 2px 0;
    }
    .card.light .drag-handle {
      color: rgba(15, 23, 42, 0.2);
    }
    .drag-handle:active {
      cursor: grabbing;
      color: ${COLORS.signal400};
    }

    /* Timer inside circular ring */
    .ring-wrap {
      position: relative;
      width: 52px;
      height: 52px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ring-wrap svg {
      transform: rotate(-90deg);
      width: 52px;
      height: 52px;
      position: absolute;
      top: 0;
      left: 0;
    }
    .ring-progress { stroke: ${COLORS.signal400}; transition: stroke-dashoffset 0.3s ease-out; }
    .ring-progress.paused { stroke: #fbbf24; }
    .card.light .ring-progress.paused { stroke: #d97706; }

    .time-display {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
    }
    .time {
      font-family: ${FONT_MONO};
      font-size: 11px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: ${COLORS.signal400};
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
    .card.light .time {
      color: ${COLORS.signal500};
    }
    .time.paused {
      color: #fbbf24;
      font-size: 9px;
      letter-spacing: 0.02em;
    }
    .card.light .time.paused {
      color: #d97706;
    }

    .name {
      font-size: 9px;
      font-weight: 600;
      text-align: center;
      width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 4px;
      line-height: 1.1;
      padding: 0 4px;
    }
    
    .btn-group {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: auto;
      width: 100%;
    }
    .action-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      border-radius: 6px;
      padding: 4px 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    .action-btn:active {
      transform: scale(0.93);
    }
    .action-btn.play-pause-btn.paused {
      color: #fbbf24;
    }
    .card.light .action-btn.play-pause-btn.paused {
      color: #d97706;
    }
    .card.dark .action-btn.play-pause-btn.paused:hover {
      color: #fff;
      background: rgba(251, 191, 36, 0.15);
    }
    .card.light .action-btn.play-pause-btn.paused:hover {
      color: #78350f;
      background: rgba(217, 119, 6, 0.1);
    }
  `;
  shadow.appendChild(style);

  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <button class="action-btn close-btn" title="Dismiss overlay">
      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
    <div class="drag-handle" title="Drag to reposition">
      <svg viewBox="0 0 24 24" width="12" height="6" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
    </div>
    <div class="ring-wrap">
      <svg viewBox="0 0 52 52">
        <circle class="ring-track" cx="26" cy="26" r="${RADIUS}" fill="none" stroke-width="3" />
        <circle class="ring-progress" cx="26" cy="26" r="${RADIUS}" fill="none" stroke-width="3"
          stroke-linecap="round" stroke-dasharray="${CIRCUMFERENCE}" stroke-dashoffset="${CIRCUMFERENCE}" />
      </svg>
      <div class="time-display">
        <span class="time">--:--</span>
      </div>
    </div>
    <div class="name"></div>
    <div class="btn-group">
      <button class="action-btn play-pause-btn" title="Pause">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
      </button>
      <button class="action-btn reset-btn" title="Restart Timer">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
      </button>
      <button class="action-btn stop-btn" title="Stop Job">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
      </button>
    </div>
  `;
  shadow.appendChild(card);

  const playPauseBtn = shadow.querySelector('.play-pause-btn') as HTMLButtonElement;
  const resetBtn = shadow.querySelector('.reset-btn') as HTMLButtonElement;
  const stopBtn = shadow.querySelector('.stop-btn') as HTMLButtonElement;
  const closeBtn = shadow.querySelector('.close-btn') as HTMLButtonElement;

  playPauseBtn.addEventListener('click', () => {
    if (!current) return;
    if (current.status === 'paused') {
      chrome.runtime.sendMessage({ type: 'JOB_START', payload: { jobId: current.jobId } });
    } else {
      chrome.runtime.sendMessage({ type: 'JOB_PAUSE', payload: { jobId: current.jobId } });
    }
  });

  resetBtn.addEventListener('click', () => {
    if (!current) return;
    chrome.runtime.sendMessage({ type: 'JOB_START', payload: { jobId: current.jobId } });
  });

  stopBtn.addEventListener('click', () => {
    if (!current) return;
    chrome.runtime.sendMessage({ type: 'JOB_STOP', payload: { jobId: current.jobId } });
  });

  closeBtn.addEventListener('click', () => {
    dismissed = true;
    hide();
  });

  initDrag(card);

  // Monitor system color scheme changes if theme is set to 'system'
  if (typeof window !== 'undefined' && window.matchMedia) {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', () => {
      if (currentSettingsTheme === 'system') {
        applyTheme('system');
      }
    });
  }

  document.documentElement.appendChild(hostEl);
  return shadow;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function render() {
  if (!shadow || !current) return;
  const now = Date.now();
  const remainingMs = Math.max(0, current.nextRunAt - now);
  const elapsed = current.intervalMs - remainingMs;
  const percentage = Math.min(100, Math.max(0, (elapsed / current.intervalMs) * 100));
  const dashOffset = CIRCUMFERENCE - (percentage / 100) * CIRCUMFERENCE;

  const timeEl = shadow.querySelector('.time') as HTMLSpanElement;
  const nameEl = shadow.querySelector('.name') as HTMLDivElement;
  const ringEl = shadow.querySelector('.ring-progress') as SVGCircleElement;
  const playPauseBtn = shadow.querySelector('.play-pause-btn') as HTMLButtonElement;

  if (nameEl) nameEl.textContent = current.jobName;

  if (current.status === 'paused') {
    if (timeEl) {
      timeEl.textContent = 'PAUSE';
      timeEl.classList.add('paused');
    }
    if (ringEl) {
      ringEl.setAttribute('stroke-dashoffset', String(CIRCUMFERENCE));
      ringEl.classList.add('paused');
    }

    // Show play icon to resume
    playPauseBtn.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    playPauseBtn.title = 'Resume Timer';
    playPauseBtn.classList.add('paused');
  } else {
    if (timeEl) {
      timeEl.textContent = formatCountdown(remainingMs);
      timeEl.classList.remove('paused');
    }
    if (ringEl) {
      ringEl.setAttribute('stroke-dashoffset', String(dashOffset));
      ringEl.classList.remove('paused');
    }

    // Show pause icon
    playPauseBtn.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
    playPauseBtn.title = 'Pause Timer';
    playPauseBtn.classList.remove('paused');
  }
}

function startTicking() {
  if (tickHandle) return;
  tickHandle = setInterval(render, 1000);
}

export function show(state: OverlayState) {
  if (dismissed && state.jobId !== current?.jobId) {
    // A different job started — un-dismiss so its overlay can appear.
    dismissed = false;
  }
  current = state;
  if (dismissed) return;

  const posKey = `overlayPosition:${state.jobId}`;
  chrome.storage.local.get([posKey, 'settings'], (res) => {
    const settings = res.settings || {};
    const position = res[posKey] || settings.visualTimerPosition || 'bottom-right';
    ensureHost();
    applySnappedPosition(position);
    applyTheme(settings.theme || 'system');
    if (hostEl) hostEl.style.display = '';
    render();
    startTicking();
  });
}

export function update(state: OverlayState) {
  show(state);
}

export function updateTheme(themeName: 'light' | 'dark' | 'system') {
  if (shadow) {
    applyTheme(themeName);
  }
}

export function updatePosition(position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') {
  if (hostEl) {
    applySnappedPosition(position);
  }
}

export function hide(jobId?: string) {
  if (jobId && current && current.jobId !== jobId) return;
  current = null;
  if (tickHandle) {
    clearInterval(tickHandle);
    tickHandle = null;
  }
  if (hostEl) hostEl.style.display = 'none';
}
