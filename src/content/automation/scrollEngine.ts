import { AutomationStep } from '../../state/schema';

export const ScrollEngine = {
  /**
   * Executes a scroll action step
   */
  async execute(step: AutomationStep): Promise<void> {
    const option = step.scrollOption || 'bottom';
    const delay = step.delayMs || 0;

    // Apply pre-step delay
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const scrollConfig: ScrollToOptions = {
      behavior: 'smooth'
    };

    switch (option) {
      case 'top':
        scrollConfig.top = 0;
        scrollConfig.left = 0;
        break;

      case 'bottom':
        scrollConfig.top = document.documentElement.scrollHeight || document.body.scrollHeight;
        scrollConfig.left = 0;
        break;

      case 'custom':
        if (step.scrollPosition) {
          scrollConfig.top = step.scrollPosition.y;
          scrollConfig.left = step.scrollPosition.x;
        }
        break;
    }

    window.scrollTo(scrollConfig);
    
    // Allow animation to finish
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
};
