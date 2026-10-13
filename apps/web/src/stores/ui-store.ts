import type { ColorSchemePreference } from '@giving-day/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UiState {
  statusDetailsOpen: boolean;
  colorScheme: ColorSchemePreference;
  setStatusDetailsOpen: (open: boolean) => void;
  toggleStatusDetails: () => void;
  setColorScheme: (colorScheme: ColorSchemePreference) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      statusDetailsOpen: true,
      colorScheme: 'auto',
      setStatusDetailsOpen: (open: boolean): void => {
        set({ statusDetailsOpen: open });
      },
      toggleStatusDetails: (): void => {
        set((state) => ({ statusDetailsOpen: !state.statusDetailsOpen }));
      },
      setColorScheme: (colorScheme: ColorSchemePreference): void => {
        set({ colorScheme });
      },
    }),
    {
      name: 'giving-day-ui',
    }
  )
);
