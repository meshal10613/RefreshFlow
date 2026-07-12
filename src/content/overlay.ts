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
  signal500: '#23988a',
  signal400: '#4bb9a4',
  ink900: '#14181a',
  ink950: '#0d1011',
  paper50: '#f8f7f4',
  inkBorder: 'rgba(255, 255, 255, 0.08)'
};

const FONT_MONO = "'SFMono-Regular', ui-monospace, 'JetBrains Mono', Menlo, Consolas, monospace";
const FONT_SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const RADIUS = 15;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface OverlayState {
  jobId: string;
  jobName: string;
  nextRunAt: number;
  intervalMs: number;
}

let hostEl: HTMLDivElement | null = null;
let shadow: ShadowRoot | null = null;
let tickHandle: ReturnType<typeof setInterval> | null = null;
let dismissed = false;
let current: OverlayState | null = null;

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
      align-items: center;
      gap: 10px;
      padding: 8px 10px 8px 8px;
      background: ${COLORS.ink950}e6;
      border: 1px solid ${COLORS.inkBorder};
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.28), 0 1px 2px rgba(0,0,0,0.2);
      backdrop-filter: blur(10px);
      font-family: ${FONT_SANS};
      animation: rf-slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      max-width: 220px;
    }
    @keyframes rf-slide-up {
      from { transform: translateY(8px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .ring-wrap { position: relative; width: 34px; height: 34px; flex-shrink: 0; }
    .ring-wrap svg { transform: rotate(-90deg); }
    .ring-track { stroke: rgba(255,255,255,0.12); }
    .ring-progress { stroke: ${COLORS.signal400}; transition: stroke-dashoffset 0.3s ease-out; }
    .dot {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    }
    .dot span {
      width: 5px; height: 5px; border-radius: 999px; background: ${COLORS.signal500};
      animation: rf-pulse 2s ease-in-out infinite;
    }
    @keyframes rf-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
    .text-col { display: flex; flex-direction: column; min-width: 0; }
    .label {
      font-size: 9px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
      color: ${COLORS.paper50}99;
    }
    .time {
      font-family: ${FONT_MONO}; font-size: 15px; font-weight: 700; letter-spacing: -0.01em;
      color: ${COLORS.signal400};
      font-variant-numeric: tabular-nums;
    }
    .name {
      font-size: 10px; color: ${COLORS.paper50}b3; white-space: nowrap; overflow: hidden;
      text-overflow: ellipsis; max-width: 110px;
    }
    .close {
      pointer-events: auto;
      background: transparent; border: none; cursor: pointer; color: ${COLORS.paper50}66;
      font-size: 13px; line-height: 1; padding: 4px; margin-left: 2px; border-radius: 6px;
      align-self: flex-start;
    }
    .close:hover { color: ${COLORS.paper50}; background: rgba(255,255,255,0.08); }
  `;
  shadow.appendChild(style);

  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <div class="ring-wrap">
      <svg viewBox="0 0 36 36" width="34" height="34">
        <circle class="ring-track" cx="18" cy="18" r="${RADIUS}" fill="none" stroke-width="3" />
        <circle class="ring-progress" cx="18" cy="18" r="${RADIUS}" fill="none" stroke-width="3"
          stroke-linecap="round" stroke-dasharray="${CIRCUMFERENCE}" stroke-dashoffset="${CIRCUMFERENCE}" />
      </svg>
      <div class="dot"><span></span></div>
    </div>
    <div class="text-col">
      <span class="label">Next refresh</span>
      <span class="time">--:--</span>
      <span class="name"></span>
    </div>
    <button class="close" title="Hide">&times;</button>
  `;
  shadow.appendChild(card);

  const closeBtn = shadow.querySelector('.close') as HTMLButtonElement;
  closeBtn.addEventListener('click', () => {
    dismissed = true;
    hide();
  });

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
  const nameEl = shadow.querySelector('.name') as HTMLSpanElement;
  const ringEl = shadow.querySelector('.ring-progress') as SVGCircleElement;

  if (timeEl) timeEl.textContent = formatCountdown(remainingMs);
  if (nameEl) nameEl.textContent = current.jobName;
  if (ringEl) ringEl.setAttribute('stroke-dashoffset', String(dashOffset));
}

function startTicking() {
  if (tickHandle) return;
  // A plain page-context setInterval — no service worker eviction concerns
  // here, this just needs to look smooth for as long as the tab is open.
  tickHandle = setInterval(render, 1000);
}

export function show(state: OverlayState) {
  if (dismissed && state.jobId !== current?.jobId) {
    // A different job started — un-dismiss so its overlay can appear.
    dismissed = false;
  }
  current = state;
  if (dismissed) return;

  ensureHost();
  if (hostEl) hostEl.style.display = '';
  render();
  startTicking();
}

export function update(state: OverlayState) {
  show(state);
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
