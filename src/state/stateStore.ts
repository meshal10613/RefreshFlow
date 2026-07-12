import { StorageSchema, Job, Settings, Profile, DEFAULT_SETTINGS, SCHEMA_VERSION } from './schema';

export const StateStore = {
  /**
   * Raw getter from chrome.storage.local
   */
  async get<K extends keyof StorageSchema>(key: K): Promise<StorageSchema[K]> {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key] as StorageSchema[K]);
      });
    });
  },

  /**
   * Raw setter to chrome.storage.local
   */
  async set<K extends keyof StorageSchema>(key: K, value: StorageSchema[K]): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  },

  /**
   * Initialize state with defaults and run migrations if needed
   */
  async initialize(): Promise<void> {
    const version = await this.get('schemaVersion');

    if (version === undefined) {
      // Clean install
      await this.set('schemaVersion', SCHEMA_VERSION);
      await this.set('jobs', {});
      await this.set('settings', DEFAULT_SETTINGS);
      await this.set('profiles', []);
      console.log('✓ Storage initialized with default schema version:', SCHEMA_VERSION);
    } else if (version < SCHEMA_VERSION) {
      // Migrate schema (extend this block for future migrations)
      console.log(`⚡ Migrating storage from schema v${version} to v${SCHEMA_VERSION}`);
      await this.runMigrations(version);
    }
  },

  /**
   * Run storage schema migrations
   */
  async runMigrations(fromVersion: number): Promise<void> {
    let currentVersion = fromVersion;
    if (currentVersion === 0) {
      // Dummy migration step example
      currentVersion = 1;
    }
    await this.set('schemaVersion', SCHEMA_VERSION);
    console.log('✓ Migration completed to schema version:', SCHEMA_VERSION);
  },

  // --- Job Helpers ---
  async getJobs(): Promise<Record<string, Job>> {
    const jobs = await this.get('jobs');
    return jobs || {};
  },

  async getJob(id: string): Promise<Job | undefined> {
    const jobs = await this.getJobs();
    return jobs[id];
  },

  async saveJob(job: Job): Promise<void> {
    const jobs = await this.getJobs();
    jobs[job.id] = job;
    await this.set('jobs', jobs);
  },

  async deleteJob(id: string): Promise<void> {
    const jobs = await this.getJobs();
    delete jobs[id];
    await this.set('jobs', jobs);
  },

  // --- Settings Helpers ---
  async getSettings(): Promise<Settings> {
    const settings = await this.get('settings');
    // Merge with defaults so settings fields added in later versions (e.g.
    // showVisualTimerOverlay) are never `undefined` for users who saved
    // their settings before that field existed.
    return settings ? { ...DEFAULT_SETTINGS, ...settings } : DEFAULT_SETTINGS;
  },

  async updateSettings(partial: Partial<Settings>): Promise<void> {
    const current = await this.getSettings();
    await this.set('settings', { ...current, ...partial });
  },

  // --- Profiles Helpers ---
  async getProfiles(): Promise<Profile[]> {
    const profiles = await this.get('profiles');
    return profiles || [];
  },

  async saveProfile(profile: Profile): Promise<void> {
    const profiles = await this.getProfiles();
    const idx = profiles.findIndex((p) => p.id === profile.id);
    if (idx !== -1) {
      profiles[idx] = profile;
    } else {
      profiles.push(profile);
    }
    await this.set('profiles', profiles);
  },

  async deleteProfile(id: string): Promise<void> {
    const profiles = await this.getProfiles();
    const filtered = profiles.filter((p) => p.id !== id);
    await this.set('profiles', filtered);
  },

  /**
   * Listen for changes on chrome.storage.local
   */
  onChanged(
    callback: (changes: {
      [K in keyof StorageSchema]?: {
        oldValue?: StorageSchema[K];
        newValue?: StorageSchema[K];
      };
    }) => void
  ): () => void {
    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === 'local') {
        const typedChanges: any = {};
        for (const key of Object.keys(changes)) {
          typedChanges[key] = {
            oldValue: changes[key].oldValue,
            newValue: changes[key].newValue,
          };
        }
        callback(typedChanges);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  },
};
