import { Job } from '../state/schema';
import { OffscreenManager } from './offscreenManager';

export const NotificationsManager = {
  /**
   * Triggers desktop and/or audio alerts based on Job configuration
   */
  async triggerAlert(job: Job, title: string, message: string): Promise<void> {
    const { desktop, sound, badge } = job.notifications;

    // 1. Desktop notification
    if (desktop) {
      chrome.notifications.create(`job-alert:${job.id}:${Date.now()}`, {
        type: 'basic',
        iconUrl: '/icons/icon-128.png',
        title: title || `RefreshFlow: ${job.name}`,
        message: message || 'Page update or condition met!',
        priority: 2, // high priority
        requireInteraction: true // keep on screen until clicked/dismissed
      });
    }

    // 2. Sound playback via Offscreen document
    if (sound) {
      // We will play a programmatic synthesized tone inside offscreen
      // Pass the name or identifier
      await OffscreenManager.playSound('chime', 0.8);
    }

    // 3. Action badge update
    if (badge) {
      await this.incrementBadge(1);
    }
  },

  /**
   * Set text badge on the extension icon
   */
  async setBadgeText(text: string): Promise<void> {
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color: '#6366f1' }); // Indigo
  },

  /**
   * Clear the text badge
   */
  async clearBadge(): Promise<void> {
    await chrome.action.setBadgeText({ text: '' });
  },

  /**
   * Get current badge value as a number
   */
  async getBadgeCount(): Promise<number> {
    const text = await chrome.action.getBadgeText({});
    const count = parseInt(text, 10);
    return isNaN(count) ? 0 : count;
  },

  /**
   * Increment the badge number
   */
  async incrementBadge(amount: number = 1): Promise<void> {
    const current = await this.getBadgeCount();
    const next = current + amount;
    await this.setBadgeText(String(next));
  }
};
