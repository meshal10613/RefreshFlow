import { SelectorUtils } from '../selectorUtils';
import { AutomationStep } from '../../state/schema';

export const FormFiller = {
  /**
   * Executes a form-fill action step
   */
  async execute(step: AutomationStep): Promise<void> {
    const selector = step.selector;
    const selectorType = step.selectorType || 'css';
    const value = step.value || '';
    const delay = step.delayMs || 0;

    // Apply pre-step delay
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // Wait for element to appear
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
      throw new Error(`Element not found or not visible for fill: ${selector} (${selectorType})`);
    }

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
      // 1. If it's a checkbox or radio button
      if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) {
        const targetChecked = value.toLowerCase() === 'true' || value === '1';
        if (element.checked !== targetChecked) {
          element.click();
        }
      } else {
        // 2. Set value
        element.value = value;
        
        // Dispatch React/Vue compatible inputs events
        this.dispatchInputEvents(element);
      }
    } else {
      // ContentEditable or fallback
      element.innerText = value;
      this.dispatchInputEvents(element);
    }
  },

  /**
   * Dispatches input/change event suite to notify framework state listeners
   */
  dispatchInputEvents(el: HTMLElement): void {
    const inputEvt = new Event('input', { bubbles: true, cancelable: true });
    el.dispatchEvent(inputEvt);
    
    const changeEvt = new Event('change', { bubbles: true, cancelable: true });
    el.dispatchEvent(changeEvt);
  }
};
