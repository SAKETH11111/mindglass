import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ApiKeyState {
  apiKey: string | null;
  hasSeenPrompt: boolean;
  setApiKey: (key: string | null) => void;
  clearApiKey: () => void;
  markPromptSeen: () => void;
}

export const useApiKeyStore = create<ApiKeyState>()(
  persist(
    (set) => ({
      apiKey: null,
      hasSeenPrompt: false,
      setApiKey: (key) => set({ apiKey: key }),
      clearApiKey: () => set({ apiKey: null }),
      markPromptSeen: () => set({ hasSeenPrompt: true }),
    }),
    {
      name: 'prism-api-key',
    }
  )
);
