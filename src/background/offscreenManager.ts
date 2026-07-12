/**
 * Manager for Offscreen Document in Manifest V3.
 * Used for playing audio alerts (since service workers do not have DOM
 * access) AND as the always-resident timer engine that drives precise job
 * scheduling and the live badge countdown — see offscreen.ts for why.
 */

export const OffscreenManager = {
  /**
   * Checks if an offscreen document currently exists
   */
  async hasDocument(): Promise<boolean> {
    if ('getContexts' in chrome.runtime) {
      // Modern Chrome (116+) context check
      const contexts = await chrome.runtime.getContexts({
        contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT]
      });
      return contexts.length > 0;
    }
    
    // Fallback for Chrome < 116, which lacks chrome.runtime.getContexts().
    // There's no reliable way to query offscreen-document existence on those
    // versions, so we conservatively report "not present" and let
    // ensureCreated() attempt creation (chrome.offscreen.createDocument
    // rejects if one already exists, which callers handle).
    return false;
  },

  /**
   * Ensures the offscreen document is created and active
   */
  async ensureCreated(): Promise<void> {
    const active = await this.hasDocument();
    if (active) return;

    try {
      await chrome.offscreen.createDocument({
        url: 'src/offscreen/offscreen.html',
        reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
        justification:
          'Plays an audio alert when a monitored page changes or an automation succeeds, and hosts the ' +
          'precise interval timers that trigger scheduled refreshes/badge updates without relying on the ' +
          'background service worker staying resident.'
      });
      console.log('✓ Offscreen document created');
    } catch (err: any) {
      if (err.message && err.message.includes('Only one offscreen document')) {
        // Document already exists, ignore error
        return;
      }
      console.error('❌ Failed to create offscreen document:', err);
      throw err;
    }
  },

  /**
   * Play audio file by sending a message to the offscreen document
   */
  async playSound(soundFile: string, volume: number = 0.8): Promise<void> {
    await this.ensureCreated();
    
    try {
      await chrome.runtime.sendMessage({
        target: 'offscreen',
        type: 'PLAY_SOUND',
        soundFile,
        volume
      });
    } catch (err) {
      console.error('❌ Error sending play audio message to offscreen document:', err);
    }
  },

  /**
   * Closes the offscreen document to release resources
   */
  async close(): Promise<void> {
    const active = await this.hasDocument();
    if (!active) return;
    
    try {
      await chrome.offscreen.closeDocument();
      console.log('✓ Offscreen document closed');
    } catch (err) {
      console.error('❌ Error closing offscreen document:', err);
    }
  },

  /**
   * Arms a precise timer for the given job inside the offscreen document.
   * Falls back silently (chrome.alarms remains the backstop) if the
   * offscreen document can't be created for any reason.
   */
  async armTimer(jobId: string, nextRunAt: number): Promise<void> {
    try {
      await this.ensureCreated();
      await chrome.runtime.sendMessage({
        target: 'offscreen',
        type: 'ARM_TIMER',
        payload: { jobId, nextRunAt }
      });
    } catch (err) {
      console.warn('⚠️ Could not arm offscreen timer, relying on chrome.alarms fallback:', err);
    }
  },

  /**
   * Disarms a previously-armed job timer.
   */
  async disarmTimer(jobId: string): Promise<void> {
    try {
      const active = await this.hasDocument();
      if (!active) return;
      await chrome.runtime.sendMessage({
        target: 'offscreen',
        type: 'DISARM_TIMER',
        payload: { jobId }
      });
    } catch {
      // Offscreen doc may already be gone — nothing to disarm.
    }
  }
};
