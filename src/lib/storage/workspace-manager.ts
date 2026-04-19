import { VibeWorkspace, WorkbenchModelSettings } from '../../types';

const STORAGE_KEY = 'vibe_workspace_state';
const API_KEYS_KEY = 'vibe_api_keys';

const isBrowser = typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';

export class WorkspaceManager {
  static save(workspace: VibeWorkspace) {
    if (!isBrowser) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  }

  static load(): VibeWorkspace | null {
    if (!isBrowser) return null;
    const data = sessionStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    
    try {
        const workspace = JSON.parse(data);
        // Correct Date types
        workspace.meta.createdAt = new Date(workspace.meta.createdAt);
        workspace.meta.lastModifiedAt = new Date(workspace.meta.lastModifiedAt);
        if (workspace.meta.generatedAt) workspace.meta.generatedAt = new Date(workspace.meta.generatedAt);
        
        return workspace;
    } catch (e) {
        console.error('Failed to parse workspace state', e);
        return null;
    }
  }

  static clear() {
    if (!isBrowser) return;
    sessionStorage.removeItem(STORAGE_KEY);
  }

  static saveAPIKey(provider: string, key: string) {
    if (!isBrowser) return;
    const keys = this.getAPIKeys();
    keys[provider] = key;
    sessionStorage.setItem(API_KEYS_KEY, JSON.stringify(keys));
  }

  static getAPIKey(provider: string): string | null {
    const keys = this.getAPIKeys();
    return keys[provider] || null;
  }

  static getAPIKeys(): Record<string, string> {
      if (!isBrowser) return {};
      const data = sessionStorage.getItem(API_KEYS_KEY);
      if (!data) return {};
      try {
          return JSON.parse(data);
      } catch (e) {
          return {};
      }
  }

  static clearAPIKeys() {
      if (!isBrowser) return;
      sessionStorage.removeItem(API_KEYS_KEY);
  }

  static saveModelSettings(settings: WorkbenchModelSettings): void {
    if (!isBrowser || typeof localStorage === 'undefined') return;
    const toSave = { phase_models: settings.phase_models };
    localStorage.setItem('vibe_model_settings', JSON.stringify(toSave));
  }

  static loadModelSettings(): { phase_models: WorkbenchModelSettings['phase_models'] } | null {
    if (!isBrowser || typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('vibe_model_settings');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  static getAllAPIKeys(): Record<string, string> {
    return this.getAPIKeys();
  }

  static exportAsJSON(workspace: VibeWorkspace): string {
      return JSON.stringify(workspace, null, 2);
  }
}
