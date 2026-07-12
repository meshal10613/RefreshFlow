import { MonitorConfig } from '../../state/schema';

export const DiffEngine = {
  /**
   * Compares the current captured DOM content against the previously stored snapshot
   * Returns a diff description if changes are detected
   */
  evaluate(
    current: string,
    previous: string | null,
    config: MonitorConfig
  ): { hasChanged: boolean; diffText: string; message: string } {
    if (previous === null) {
      // First run: save snapshot but don't alert since there is nothing to compare against
      return {
        hasChanged: false,
        diffText: '',
        message: 'Initial snapshot stored. Comparison will start on the next check.'
      };
    }

    if (current === previous) {
      return {
        hasChanged: false,
        diffText: '',
        message: 'No changes detected.'
      };
    }

    const { mode, keyword, keywordCondition, regex } = config;

    switch (mode) {
      case 'keyword': {
        if (!keyword) {
          return { hasChanged: false, diffText: '', message: 'Keyword not configured.' };
        }

        const isCurrentPresent = current.toLowerCase().includes(keyword.toLowerCase());
        const isPreviousPresent = previous.toLowerCase().includes(keyword.toLowerCase());

        if (keywordCondition === 'found' && isCurrentPresent && !isPreviousPresent) {
          return {
            hasChanged: true,
            diffText: `Keyword "${keyword}" was found on the page.`,
            message: `Alert triggered: keyword "${keyword}" appeared.`
          };
        }

        if (keywordCondition === 'lost' && !isCurrentPresent && isPreviousPresent) {
          return {
            hasChanged: true,
            diffText: `Keyword "${keyword}" is no longer on the page.`,
            message: `Alert triggered: keyword "${keyword}" disappeared.`
          };
        }

        return {
          hasChanged: false,
          diffText: '',
          message: `Keyword "${keyword}" presence is unchanged (Present: ${isCurrentPresent}).`
        };
      }

      case 'regex': {
        if (!regex) {
          return { hasChanged: false, diffText: '', message: 'Regex not configured.' };
        }

        try {
          const rx = new RegExp(regex, 'i');
          const currentMatch = current.match(rx);
          const previousMatch = previous.match(rx);

          const currentVal = currentMatch ? currentMatch[0] : '';
          const previousVal = previousMatch ? previousMatch[0] : '';

          if (currentVal !== previousVal) {
            return {
              hasChanged: true,
              diffText: `Regex pattern match changed from "${previousVal || 'none'}" to "${currentVal || 'none'}".`,
              message: 'Alert triggered: regular expression match changed.'
            };
          }
        } catch (err: any) {
          return {
            hasChanged: false,
            diffText: '',
            message: `Regex execution error: ${err.message}`
          };
        }

        return {
          hasChanged: false,
          diffText: '',
          message: 'Regex match unchanged.'
        };
      }

      case 'text':
      case 'html':
      case 'element':
      default: {
        // Generic difference detection
        const summary = this.generateDiffSummary(previous, current);
        return {
          hasChanged: true,
          diffText: summary,
          message: 'Page content modification detected.'
        };
      }
    }
  },

  /**
   * Helper to describe changes simply (summarize diff additions/deletions)
   */
  generateDiffSummary(prev: string, curr: string): string {
    const prevClean = prev.substring(0, 1000);
    const currClean = curr.substring(0, 1000);
    
    if (prevClean.length === 0) return 'Content added to page.';
    
    // Find first character index where they differ
    let diffIdx = 0;
    while (diffIdx < prevClean.length && diffIdx < currClean.length && prevClean[diffIdx] === currClean[diffIdx]) {
      diffIdx++;
    }

    const startContext = Math.max(0, diffIdx - 15);
    const prevExcerpt = prevClean.substring(startContext, diffIdx + 30);
    const currExcerpt = currClean.substring(startContext, diffIdx + 30);

    return `Content modified around character ${diffIdx}: "...${prevExcerpt}..." became "...${currExcerpt}..."`;
  }
};
