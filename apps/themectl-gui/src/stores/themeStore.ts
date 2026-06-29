import { create } from 'zustand';

interface ThemeUIState {
  previewModalTheme: string | null;
  previewModalOpen: boolean;
  sidebarCollapsed: boolean;
  darkMode: boolean;
  language: "en" | "pt";
  
  openPreviewModal: (themeName: string) => void;
  closePreviewModal: () => void;
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
  setLanguage: (lang: "en" | "pt") => void;
}

const getInitialDarkMode = (): boolean => {
  const saved = localStorage.getItem("darkMode");
  if (saved !== null) {
    return saved === "true";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

const getInitialLanguage = (): "en" | "pt" => {
  const saved = localStorage.getItem("language");
  if (saved === "en" || saved === "pt") {
    return saved;
  }
  const browserLang = navigator.language.split("-")[0];
  return browserLang === "pt" ? "pt" : "en";
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
  language: getInitialLanguage(),

  openPreviewModal: (themeName) => set({ previewModalTheme: themeName, previewModalOpen: true }),
  closePreviewModal: () => set({ previewModalTheme: null, previewModalOpen: false }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleDarkMode: () => set((state) => {
    const nextDark = !state.darkMode;
    localStorage.setItem("darkMode", String(nextDark));
    syncDarkModeClass(nextDark);
    return { darkMode: nextDark };
  }),
  setLanguage: (lang) => set(() => {
    localStorage.setItem("language", lang);
    return { language: lang };
  }),
}));
