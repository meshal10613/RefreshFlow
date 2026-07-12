import { DomSnapshot } from './monitor/domSnapshot';
import { DiffEngine } from './monitor/diffEngine';
import { Highlighter } from './monitor/highlighter';
import { ClickEngine } from './automation/clickEngine';
import { ScrollEngine } from './automation/scrollEngine';
import { FormFiller } from './automation/formFiller';
import { AutomationStep, MonitorConfig } from '../state/schema';
import * as Overlay from './overlay';

console.log('[RefreshFlow Content Script] Active and Listening...');

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const { type, payload } = message;

  switch (type) {
    case 'PING':
      sendResponse({ status: 'pong' });
      break;

    case 'MONITOR_CAPTURE': {
      const { config, jobId } = payload as { config: MonitorConfig; jobId: string };
      
      // 1. Capture current DOM snapshot
      const currentSnapshot = DomSnapshot.capture(config);
      
      // 2. Fetch the previously stored snapshot from storage
      const storageKey = `snapshot:${jobId}`;
      chrome.storage.local.get(storageKey, (storeResult) => {
        const previousSnapshot = storeResult[storageKey] !== undefined ? storeResult[storageKey] : null;
        
        // 3. Evaluate diff
        const evaluation = DiffEngine.evaluate(currentSnapshot, previousSnapshot, config);
        
        // 4. Save new snapshot if there was a change or if there was no previous snapshot stored
        if (evaluation.hasChanged || previousSnapshot === null) {
          chrome.storage.local.set({ [storageKey]: currentSnapshot });
        }
        
        // 5. Highlight changes if requested
        if (evaluation.hasChanged && config.highlightChanges) {
          Highlighter.highlight(config.selector, config.selectorType);
        }
        
        sendResponse({
          status: 'success',
          hasChanged: evaluation.hasChanged,
          diffText: evaluation.diffText,
          message: evaluation.message
        });
      });
      
      return true; // asynchronous response
    }

    case 'AUTOMATION_EXECUTE': {
      const { steps } = payload as { steps: AutomationStep[]; jobId: string };
      
      // Execute steps in sequence
      const runSequence = async () => {
        try {
          for (const step of steps) {
            switch (step.type) {
              case 'click':
                await ClickEngine.execute(step);
                break;
              case 'scroll':
                await ScrollEngine.execute(step);
                break;
              case 'fill':
                await FormFiller.execute(step);
                break;
              case 'wait':
                await new Promise((resolve) => setTimeout(resolve, step.delayMs || 1000));
                break;
            }
          }
          sendResponse({ status: 'success' });
        } catch (err: any) {
          console.error('[RefreshFlow Content Automation Error]:', err);
          sendResponse({ status: 'error', error: err.message || 'Automation step failed' });
        }
      };

      runSequence();
      return true; // asynchronous response
    }

    case 'OVERLAY_SHOW':
    case 'OVERLAY_UPDATE': {
      const { jobId, jobName, nextRunAt, intervalMs } = payload as {
        jobId: string;
        jobName: string;
        nextRunAt: number;
        intervalMs: number;
      };
      Overlay.update({ jobId, jobName, nextRunAt, intervalMs });
      sendResponse({ status: 'ok' });
      break;
    }

    case 'OVERLAY_HIDE': {
      const { jobId } = (payload || {}) as { jobId?: string };
      Overlay.hide(jobId);
      sendResponse({ status: 'ok' });
      break;
    }
  }

  return false;
});

// If the "Show Visual Timer Overlay" setting is toggled off while an
// overlay is currently visible, hide it immediately rather than waiting
// for the next refresh cycle.
if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes.settings) return;
    const newSettings = changes.settings.newValue;
    if (newSettings && newSettings.showVisualTimerOverlay === false) {
      Overlay.hide();
    }
  });
}

export {};
