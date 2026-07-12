/**
 * Visual highlight overlay for page modifications.
 * Flashes a glowing frame around the page or target element.
 */

export const Highlighter = {
  /**
   * Highlights changes by drawing a temporary glowing border overlay
   */
  highlight(selector?: string, selectorType: 'css' | 'xpath' = 'css'): void {
    let target: HTMLElement | null = null;
    
    if (selector) {
      import('../selectorUtils').then(({ SelectorUtils }) => {
        target = SelectorUtils.resolveElement(selector, selectorType);
        this.applyOverlay(target || document.body, !target);
      });
    } else {
      this.applyOverlay(document.body, true);
    }
  },

  /**
   * Applies the physical absolute-positioned glow overlay
   */
  applyOverlay(element: HTMLElement, isFullPage: boolean): void {
    // 1. Remove any existing overlays
    const existing = document.getElementById('rf-highlight-overlay');
    if (existing) existing.remove();

    // 2. Create the overlay element
    const overlay = document.createElement('div');
    overlay.id = 'rf-highlight-overlay';
    
    // Inline styling for glowing premium border pulse
    const baseStyle = `
      position: ${isFullPage ? 'fixed' : 'absolute'};
      pointer-events: none;
      z-index: 2147483647;
      border: 3px solid #8b5cf6;
      box-shadow: 0 0 20px 5px rgba(139, 92, 246, 0.4), inset 0 0 20px 5px rgba(139, 92, 246, 0.2);
      border-radius: ${isFullPage ? '0px' : '6px'};
      transition: opacity 0.5s ease;
      opacity: 1;
      animation: rfPulse 1.5s infinite ease-in-out;
    `;

    // Define animation keyframes programmatically
    if (!document.getElementById('rf-highlight-keyframes')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'rf-highlight-keyframes';
      styleSheet.textContent = `
        @keyframes rfPulse {
          0% { opacity: 0.3; box-shadow: 0 0 10px 2px rgba(139, 92, 246, 0.2); }
          50% { opacity: 1; box-shadow: 0 0 25px 8px rgba(139, 92, 246, 0.5); }
          100% { opacity: 0.3; box-shadow: 0 0 10px 2px rgba(139, 92, 246, 0.2); }
        }
      `;
      document.head.appendChild(styleSheet);
    }

    if (isFullPage) {
      overlay.style.cssText = baseStyle + `
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
      `;
      document.body.appendChild(overlay);
    } else {
      const rect = element.getBoundingClientRect();
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;
      
      overlay.style.cssText = baseStyle + `
        left: ${rect.left + scrollX - 4}px;
        top: ${rect.top + scrollY - 4}px;
        width: ${rect.width + 8}px;
        height: ${rect.height + 8}px;
      `;
      document.body.appendChild(overlay);
      
      // Scroll into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // 3. Auto-fade and remove the overlay after 5 seconds
    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
      }, 500);
    }, 5000);
  }
};
