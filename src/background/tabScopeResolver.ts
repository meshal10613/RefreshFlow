import { Job } from '../state/schema';
import { isInjectableUrl } from '../utils/urlUtils';

export const TabScopeResolver = {
  /**
   * Resolves the target scope of a job into an array of actual tab IDs
   */
  async resolveTabs(job: Job): Promise<number[]> {
    const { scope, tabIds, windowId } = job.target;
    
    switch (scope) {
      case 'currentTab': {
        // Prefer the exact tab this job was pinned to when it was created,
        // so the target website keeps refreshing on schedule no matter
        // which tab or window the user is currently looking at.
        if (tabIds && tabIds.length > 0) {
          for (const id of tabIds) {
            try {
              const tab = await chrome.tabs.get(id);
              if (tab?.id !== undefined) {
                return [tab.id];
              }
            } catch {
              // That tab was closed — fall through to URL-based recovery below.
            }
          }
        }

        // Recovery: the pinned tab is gone (closed/replaced). Try to find
        // another open tab pointing at the same URL so the job keeps
        // targeting the right website instead of silently going idle.
        if (job.url) {
          try {
            const exactMatches = await chrome.tabs.query({ url: job.url });
            const exactMatch = exactMatches.find((t) => t.id !== undefined);
            if (exactMatch?.id !== undefined) {
              return [exactMatch.id];
            }

            const target = new URL(job.url);
            const allTabs = await chrome.tabs.query({});
            const looseMatch = allTabs.find(
              (t) => t.url && t.url.startsWith(`${target.origin}${target.pathname}`)
            );
            if (looseMatch?.id !== undefined) {
              return [looseMatch.id];
            }
          } catch {
            // Malformed URL or query failure — fall through to legacy behavior.
          }
        }

        // Last resort (legacy behavior / jobs created before pinning existed):
        // whatever tab is currently active.
        const queryInfo: chrome.tabs.QueryInfo = { active: true };
        if (windowId !== undefined) {
          queryInfo.windowId = windowId;
        } else {
          queryInfo.currentWindow = true;
        }

        const tabs = await chrome.tabs.query(queryInfo);
        const tabId = tabs[0]?.id;
        return tabId !== undefined ? [tabId] : [];
      }
      
      case 'allTabs': {
        // Query all tabs across all windows
        const tabs = await chrome.tabs.query({});
        return tabs
          .map(t => t.id)
          .filter((id): id is number => id !== undefined);
      }
      
      case 'selectedTabs': {
        // Tabs explicitly chosen by the user when configuring this job.
        // Fall back to the currently highlighted tabs only if the job has
        // no stored selection (e.g. it was created before a selection was made).
        if (tabIds && tabIds.length > 0) {
          const results = await Promise.all(
            tabIds.map(async (id) => {
              try {
                const tab = await chrome.tabs.get(id);
                return tab.id;
              } catch {
                // Tab was closed since the job was configured; skip it.
                return undefined;
              }
            })
          );
          return results.filter((id): id is number => id !== undefined);
        }

        const queryInfo: chrome.tabs.QueryInfo = { highlighted: true };
        if (windowId !== undefined) {
          queryInfo.windowId = windowId;
        } else {
          queryInfo.currentWindow = true;
        }
        const tabs = await chrome.tabs.query(queryInfo);
        return tabs
          .map(t => t.id)
          .filter((id): id is number => id !== undefined);
      }
      
      case 'pinned': {
        // Pinned tabs in current or specified window
        const queryInfo: chrome.tabs.QueryInfo = { pinned: true };
        if (windowId !== undefined) {
          queryInfo.windowId = windowId;
        }
        const tabs = await chrome.tabs.query(queryInfo);
        return tabs
          .map(t => t.id)
          .filter((id): id is number => id !== undefined);
      }
      
      case 'inactive': {
        // Inactive tabs (not active in their window)
        const tabs = await chrome.tabs.query({ active: false });
        return tabs
          .map(t => t.id)
          .filter((id): id is number => id !== undefined);
      }
      
      case 'window': {
        // All tabs in the specified window or current window
        let targetWindowId = windowId;
        if (targetWindowId === undefined) {
          const currentWin = await chrome.windows.getCurrent();
          targetWindowId = currentWin.id;
        }
        
        if (targetWindowId === undefined) return [];
        const tabs = await chrome.tabs.query({ windowId: targetWindowId });
        return tabs
          .map(t => t.id)
          .filter((id): id is number => id !== undefined);
      }
      
      default:
        return [];
    }
  },

  /**
   * Filters out tabs with URL protocols that are forbidden for scripting injection
   */
  async filterInjectableTabs(tabIds: number[]): Promise<number[]> {
    const injectableIds: number[] = [];
    
    for (const tabId of tabIds) {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab?.url && isInjectableUrl(tab.url)) {
          injectableIds.push(tabId);
        }
      } catch {
        // Tab no longer exists, skip
      }
    }
    
    return injectableIds;
  }
};
