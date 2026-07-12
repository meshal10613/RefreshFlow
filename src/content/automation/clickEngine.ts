import { SelectorUtils } from '../selectorUtils';
import { AutomationStep } from '../../state/schema';

export const ClickEngine = {
  /**
   * Executes a click action step with visibility check and retry loop
   */
  async execute(step: AutomationStep): Promise<void> {
    const selector = step.selector;
    const selectorType = step.selectorType || 'css';
    const delay = step.delayMs || 0;

    // Apply pre-step delay
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // Wait for element to appear (retry loop up to 5 seconds)
    const timeout = 5000;
    const interval = 200;
    let elapsed = 0;
    let element: HTMLElement | null = null;

    while (elapsed < timeout) {
      element = SelectorUtils.resolveElement(selector, selectorType);
      if (element && SelectorUtils.isElementVisible(element)) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
      elapsed += interval;
    }

    if (!element) {
      throw new Error(`Element not found or not visible: ${selector} (${selectorType})`);
    }

    // High-end micro-highlight before click for visual feedback
    this.pulseFeedback(element);

    // Trigger click events
    element.click();
    
    // Dispatch full mouse event suite to satisfy virtual-DOM handlers (React/Angular/Vue)
    this.dispatchMouseEvents(element);
  },

  /**
   * Flash element temporarily to give visual indication of click automation
   */
  pulseFeedback(el: HTMLElement): void {
    const originalTransition = el.style.transition;
    const originalOutline = el.style.outline;
    
    el.style.transition = 'outline 0.15s ease-in-out';
    el.style.outline = '4px solid #8b5cf6'; // Indigo outline glow
    
    setTimeout(() => {
      el.style.outline = originalOutline;
      setTimeout(() => {
        el.style.transition = originalTransition;
      }, 150);
    }, 150);
  },

  /**
   * Dispatches standard mouse events for frameworks
   */
  dispatchMouseEvents(el: HTMLElement): void {
    const events = ['mousedown', 'mouseup', 'click'];
    events.forEach((name) => {
      const evt = new MouseEvent(name, {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      el.dispatchEvent(evt);
    });
  }
};
