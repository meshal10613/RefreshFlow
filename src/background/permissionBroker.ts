import { getOrigin } from '../utils/urlUtils';

export const PermissionBroker = {
  /**
   * Check if the extension has host permissions for a specific URL
   */
  async hasHostPermission(url: string): Promise<boolean> {
    const origin = getOrigin(url);
    if (origin === 'file://*') {
      // file:// URLs require explicit user opt-in in chrome://extensions
      // We can check if we have it
      return new Promise((resolve) => {
        chrome.permissions.contains(
          {
            origins: [origin],
          },
          (result) => {
            resolve(result);
          }
        );
      });
    }

    return new Promise((resolve) => {
      chrome.permissions.contains(
        {
          origins: [origin],
        },
        (result) => {
          resolve(result);
        }
      );
    });
  },

  /**
   * Request host permissions for a specific URL
   * Note: This MUST be called from a user gesture context (UI event handler)
   */
  async requestHostPermission(url: string): Promise<boolean> {
    const origin = getOrigin(url);
    return new Promise((resolve) => {
      chrome.permissions.request(
        {
          origins: [origin],
        },
        (granted) => {
          resolve(granted);
        }
      );
    });
  },

  /**
   * Remove host permissions for a specific URL
   */
  async removeHostPermission(url: string): Promise<boolean> {
    const origin = getOrigin(url);
    return new Promise((resolve) => {
      chrome.permissions.remove(
        {
          origins: [origin],
        },
        (removed) => {
          resolve(removed);
        }
      );
    });
  },
};
