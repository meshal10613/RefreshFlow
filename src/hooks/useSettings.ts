import { useState, useEffect } from 'react';
import { Settings, DEFAULT_SETTINGS } from '../state/schema';
import { StateStore } from '../state/stateStore';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch initial settings
    StateStore.getSettings().then((fetchedSettings) => {
      setSettings(fetchedSettings);
      setLoading(false);
    });

    // 2. Subscribe to settings storage changes
    const unsubscribe = StateStore.onChanged((changes) => {
      if (changes.settings && changes.settings.newValue) {
        setSettings(changes.settings.newValue);
      }
    });

    return unsubscribe;
  }, []);

  const updateSettings = async (partial: Partial<Settings>) => {
    await StateStore.updateSettings(partial);
  };

  return {
    settings,
    loading,
    updateSettings,
  };
}
