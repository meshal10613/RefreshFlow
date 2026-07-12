import { useEffect } from 'react';
import { useSettings } from './useSettings';

export function useTheme() {
  const { settings } = useSettings();
  const theme = settings.theme;

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Helper to resolve theme to dark/light string
    const applyTheme = (resolvedTheme: 'dark' | 'light') => {
      root.classList.remove('light', 'dark');
      root.classList.add(resolvedTheme);
      
      // Also apply inline background styling for HTML to avoid white flashes
      if (resolvedTheme === 'dark') {
        root.style.backgroundColor = '#09090b';
      } else {
        root.style.backgroundColor = '#ffffff';
      }
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemChange = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };

      // Set initial
      applyTheme(mediaQuery.matches ? 'dark' : 'light');
      
      // Listen to system changes
      mediaQuery.addEventListener('change', handleSystemChange);
      
      return () => {
        mediaQuery.removeEventListener('change', handleSystemChange);
      };
    } else {
      applyTheme(theme);
    }
    
    return undefined;
  }, [theme]);

  return { theme };
}
