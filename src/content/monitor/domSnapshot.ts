import { MonitorConfig } from '../../state/schema';
import { SelectorUtils } from '../selectorUtils';

export const DomSnapshot = {
  /**
   * Captures the snapshot of the DOM according to the MonitorConfig
   */
  capture(config: MonitorConfig): string {
    const mode = config.mode;
    let rawContent = '';

    switch (mode) {
      case 'html':
        // Capture HTML of the whole document body
        rawContent = document.body ? document.body.innerHTML : '';
        break;

      case 'element': {
        // Capture a specific element's inner text or outer HTML
        if (config.selector) {
          const el = SelectorUtils.resolveElement(config.selector, config.selectorType || 'css');
          if (el) {
            rawContent = el.innerText || el.textContent || '';
          }
        }
        break;
      }

      case 'keyword':
      case 'regex':
      case 'text':
      default:
        // Capture visible text of the body
        rawContent = document.body ? document.body.innerText || document.body.textContent || '' : '';
        break;
    }

    // Post-process content based on settings
    if (config.ignoreWhitespace) {
      rawContent = this.cleanWhitespace(rawContent);
    }

    return rawContent;
  },

  /**
   * Cleans up excess whitespace, normalizes spaces and carriage returns
   */
  cleanWhitespace(str: string): string {
    if (!str) return '';
    return str
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')      // compress multiple horizontal spaces
      .replace(/\n\s*\n/g, '\n')     // compress empty lines
      .trim();
  }
};
