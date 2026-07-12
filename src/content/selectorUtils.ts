/**
 * DOM selector utilities for RefreshFlow content scripts.
 * Supports standard CSS selectors and XPath evaluations.
 */

export const SelectorUtils = {
  /**
   * Find a single DOM element by CSS or XPath
   */
  resolveElement(selector: string, type: 'css' | 'xpath' = 'css', root: ParentNode = document): HTMLElement | null {
    if (!selector) return null;
    
    try {
      if (type === 'css') {
        return root.querySelector(selector) as HTMLElement | null;
      } else {
        // Evaluate XPath
        const result = document.evaluate(
          selector,
          root,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        return result.singleNodeValue as HTMLElement | null;
      }
    } catch (err) {
      console.error(`❌ Error resolving selector "${selector}" (${type}):`, err);
      return null;
    }
  },

  /**
   * Find multiple DOM elements by CSS or XPath
   */
  resolveElements(selector: string, type: 'css' | 'xpath' = 'css', root: ParentNode = document): HTMLElement[] {
    if (!selector) return [];

    try {
      if (type === 'css') {
        return Array.from(root.querySelectorAll(selector)) as HTMLElement[];
      } else {
        const elements: HTMLElement[] = [];
        const result = document.evaluate(
          selector,
          root,
          null,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
          null
        );
        let node = result.iterateNext();
        while (node) {
          elements.push(node as HTMLElement);
          node = result.iterateNext();
        }
        return elements;
      }
    } catch (err) {
      console.error(`❌ Error resolving elements for selector "${selector}" (${type}):`, err);
      return [];
    }
  },

  /**
   * Check if an element is visible in the viewport
   */
  isElementVisible(el: HTMLElement): boolean {
    if (!el) return false;
    
    // Check basic CSS visibility properties
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    
    // Check bounding dimensions
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }
    
    return true;
  }
};
