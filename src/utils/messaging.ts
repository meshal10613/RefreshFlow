import { Job, Settings } from '../state/schema';

export type MessageType =
  | 'JOB_START'
  | 'JOB_PAUSE'
  | 'JOB_STOP'
  | 'JOB_DELETE'
  | 'JOB_STATE_CHANGE'
  | 'GET_ACTIVE_JOBS'
  | 'GET_ACTIVE_JOBS_RESPONSE'
  | 'PLAY_SOUND'
  | 'PLAY_SOUND_COMPLETE'
  | 'CHECK_PERMISSION'
  | 'REQUEST_PERMISSION'
  | 'PERMISSION_RESPONSE'
  | 'RUN_JOB_NOW'
  | 'SYNC_THEME'
  | 'ARM_TIMER'
  | 'DISARM_TIMER'
  | 'OFFSCREEN_TICK'
  | 'OVERLAY_SHOW'
  | 'OVERLAY_UPDATE'
  | 'OVERLAY_HIDE'
  | 'PING';

export interface MessagePayloads {
  JOB_START: { jobId: string };
  JOB_PAUSE: { jobId: string };
  JOB_STOP: { jobId: string };
  JOB_DELETE: { jobId: string };
  JOB_STATE_CHANGE: { jobId: string; status: Job['state']['status'] };
  GET_ACTIVE_JOBS: undefined;
  GET_ACTIVE_JOBS_RESPONSE: { activeJobIds: string[] };
  PLAY_SOUND: { soundFile: string; volume?: number };
  PLAY_SOUND_COMPLETE: { success: boolean };
  CHECK_PERMISSION: { origin: string };
  REQUEST_PERMISSION: { origin: string };
  PERMISSION_RESPONSE: { origin: string; granted: boolean };
  RUN_JOB_NOW: { jobId: string };
  SYNC_THEME: { theme: Settings['theme'] };
  ARM_TIMER: { jobId: string; nextRunAt: number };
  DISARM_TIMER: { jobId: string };
  OFFSCREEN_TICK: { now: number };
  OVERLAY_SHOW: { jobId: string; jobName: string; nextRunAt: number; intervalMs: number };
  OVERLAY_UPDATE: { jobId: string; jobName: string; nextRunAt: number; intervalMs: number };
  OVERLAY_HIDE: { jobId?: string };
  PING: undefined;
}

export interface ExtensionMessage<T extends MessageType> {
  type: T;
  payload: MessagePayloads[T];
}

/**
 * Type-safe message dispatcher
 */
export const Messaging = {
  async sendToBackground<T extends MessageType>(
    type: T,
    payload: MessagePayloads[T]
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type, payload } as ExtensionMessage<T>, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  },

  async sendToTab<T extends MessageType>(
    tabId: number,
    type: T,
    payload: MessagePayloads[T]
  ): Promise<any> {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { type, payload } as ExtensionMessage<T>, (response) => {
        if (chrome.runtime.lastError) {
          // Tab might not have content script running or be closed, resolve as undefined or handle
          resolve(undefined);
        } else {
          resolve(response);
        }
      });
    });
  },

  onMessage(
    handler: <T extends MessageType>(
      type: T,
      payload: MessagePayloads[T],
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => boolean | void // return true if async response
  ) {
    const listener = (
      message: any,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => {
      if (message && typeof message === 'object' && 'type' in message && 'payload' in message) {
        return handler(message.type, message.payload, sender, sendResponse);
      }
      return false;
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  },
};
