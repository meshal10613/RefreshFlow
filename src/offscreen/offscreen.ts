/**
 * Offscreen script for RefreshFlow.
 *
 * Two jobs:
 *  1. Synthesize premium audio chimes (Web Audio API) without needing large
 *     binary media files bundled into the extension.
 *  2. Act as the precise, always-resident timer engine for job scheduling
 *     and the toolbar badge countdown.
 *
 * Why an offscreen document for timing? The MV3 background service worker
 * is aggressively evicted by Chrome after ~30s of no incoming events, which
 * clears any setTimeout/setInterval running inside it. Re-waking the worker
 * (via chrome.alarms, which itself is only "best effort" and can be delayed
 * several seconds by OS-level timer coalescing) then costs additional cold
 * start time before it can even resume. That combination is what produced
 * the multi-second lag between a job's configured interval and when the
 * refresh actually fired.
 *
 * An offscreen document is a normal, hidden page — it is not subject to the
 * service worker's idle-eviction policy, so setInterval here keeps firing
 * on schedule for as long as the document stays open. When a timer is due
 * we message the background worker directly, which wakes it near-instantly
 * (message delivery is much faster/more reliable than an alarm wake) and
 * runs the job immediately instead of "eventually".
 */

const TICK_MS = 250; // check every 250ms so due jobs fire within a quarter second
let masterLoopHandle: ReturnType<typeof setInterval> | undefined;
const armedTimers: Record<string, number> = {}; // jobId -> nextRunAt

function startMasterLoop() {
  if (masterLoopHandle) return;
  masterLoopHandle = setInterval(() => {
    const now = Date.now();

    // 1. Drive the live badge / UI countdown every cycle. Background just
    //    recomputes from stored job state, this message only exists to
    //    reset the service worker's idle timer and prompt a redraw.
    chrome.runtime.sendMessage({ target: 'background', type: 'OFFSCREEN_TICK', payload: { now } }).catch(() => {});

    // 2. Fire any job whose precise time has arrived.
    for (const jobId of Object.keys(armedTimers)) {
      if (now >= armedTimers[jobId]) {
        delete armedTimers[jobId];
        chrome.runtime
          .sendMessage({ target: 'background', type: 'RUN_JOB_NOW', payload: { jobId } })
          .catch(() => {});
      }
    }
  }, TICK_MS);
}

function stopMasterLoopIfIdle() {
  if (Object.keys(armedTimers).length === 0 && masterLoopHandle) {
    clearInterval(masterLoopHandle);
    masterLoopHandle = undefined;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target !== 'offscreen') return false;

  switch (message.type) {
    case 'PLAY_SOUND': {
      try {
        const volume = message.volume !== undefined ? message.volume : 0.8;
        playSynthesizedChime(volume);
        sendResponse({ success: true });
      } catch (err: any) {
        console.error('[RefreshFlow Offscreen Audio Error]:', err);
        sendResponse({ success: false, error: err.message });
      }
      return false;
    }

    case 'ARM_TIMER': {
      const { jobId, nextRunAt } = message.payload as { jobId: string; nextRunAt: number };
      armedTimers[jobId] = nextRunAt;
      startMasterLoop();
      sendResponse({ armed: true });
      return false;
    }

    case 'DISARM_TIMER': {
      const { jobId } = message.payload as { jobId: string };
      delete armedTimers[jobId];
      stopMasterLoopIfIdle();
      sendResponse({ armed: false });
      return false;
    }

    case 'DISARM_ALL': {
      for (const key of Object.keys(armedTimers)) delete armedTimers[key];
      stopMasterLoopIfIdle();
      sendResponse({ armed: false });
      return false;
    }
  }

  return false;
});

function playSynthesizedChime(volume: number) {
  // 1. Initialize Audio Context
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('Web Audio API not supported in this browser');
  }

  const ctx = new AudioContextClass();
  const now = ctx.currentTime;

  // 2. Setup master gain for volume control
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(volume, now);
  masterGain.connect(ctx.destination);

  // --- Voice 1 (Primary Tone: C6) ---
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  // Slighly ramp frequency for glassy chime feel (from G#5 to C6)
  osc1.frequency.setValueAtTime(830.61, now);
  osc1.frequency.exponentialRampToValueAtTime(1046.50, now + 0.08);

  gain1.gain.setValueAtTime(0.4, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6); // fast decay

  osc1.connect(gain1);
  gain1.connect(masterGain);

  osc1.start(now);
  osc1.stop(now + 0.6);

  // --- Voice 2 (Harmonic Harmony: E6) ---
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1318.51, now + 0.08); // E6 note

  gain2.gain.setValueAtTime(0, now);
  gain2.gain.setValueAtTime(0.25, now + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

  osc2.connect(gain2);
  gain2.connect(masterGain);

  osc2.start(now + 0.08);
  osc2.stop(now + 0.8);
}
export {};
