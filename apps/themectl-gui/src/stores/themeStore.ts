/* eslint-disable @typescript-eslint/no-unused-vars */
import { create } from 'zustand';

interface ThemeUIState {
  previewModalTheme: string | null;
  previewModalOpen: boolean;
  sidebarCollapsed: boolean;
  
  openPreviewModal: (themeName: string) => void;
  closePreviewModal: () => void;
  toggleSidebar: () => void;
}

export const useThemeUIStore = create<ThemeUIState>((set) => ({
  previewModalTheme: null,
  previewModalOpen: false,
  sidebarCollapsed: false,

  openPreviewModal: (themeName) => set({ previewModalTheme: themeName, previewModalOpen: true }),
  closePreviewModal: () => set({ previewModalTheme: null, previewModalOpen: false }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
