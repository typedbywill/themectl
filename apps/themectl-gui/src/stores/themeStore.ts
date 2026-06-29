import { create } from 'zustand';

interface ThemeUIState {
  previewModalTheme: string | null;
  previewModalOpen: boolean;
  sidebarCollapsed: boolean;
  darkMode: boolean;
  
  openPreviewModal: (themeName: string) => void;
  closePreviewModal: () => void;
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
}

const getInitialDarkMode = (): boolean => {
  const saved = localStorage.getItem("darkMode");
  if (saved !== null) {
    return saved === "true";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

const syncDarkModeClass = (isDark: boolean) => {
  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
};

// Sync on store load
syncDarkModeClass(getInitialDarkMode());

export const useThemeUIStore = create<ThemeUIState>((set) => ({
  previewModalTheme: null,
  previewModalOpen: false,
  sidebarCollapsed: false,
  darkMode: getInitialDarkMode(),

  openPreviewModal: (themeName) => set({ previewModalTheme: themeName, previewModalOpen: true }),
  closePreviewModal: () => set({ previewModalTheme: null, previewModalOpen: false }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleDarkMode: () => set((state) => {
    const nextDark = !state.darkMode;
    localStorage.setItem("darkMode", String(nextDark));
    syncDarkModeClass(nextDark);
    return { darkMode: nextDark };
  }),
}));
