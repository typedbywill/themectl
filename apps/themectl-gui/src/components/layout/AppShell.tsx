import React, { useState, useEffect } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { 
  FiShoppingBag, 
  FiLayers, 
  FiGlobe, 
  FiSliders,
  FiMinus,
  FiSquare,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiSun,
  FiMoon,
  FiPlus
} from "react-icons/fi";
import { useThemeUIStore } from "../../stores/themeStore";
import { useTranslation } from "../../hooks/useTranslation";

export const AppShell: React.FC = () => {
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar, darkMode, toggleDarkMode } = useThemeUIStore();
  const { t, language, setLanguage } = useTranslation();
  const [appWindow, setAppWindow] = useState<any>(null);

  useEffect(() => {
    try {
      setAppWindow(getCurrentWindow());
    } catch (e) {
      console.warn("Tauri getCurrentWindow is not available outside Tauri runtime:", e);
    }
  }, []);

  const handleMinimize = () => appWindow?.minimize();
  const handleMaximize = () => appWindow?.toggleMaximize();
  const handleClose = () => appWindow?.close();

  const navigation = [
    { nameKey: "sidebar.installed", path: "/installed", icon: FiLayers },
    { nameKey: "sidebar.store", path: "/themes", icon: FiShoppingBag },
    { nameKey: "sidebar.repositories", path: "/repositories", icon: FiGlobe },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-canvas text-ink">
      {/* Tauri custom titlebar */}
      <div className="titlebar flex items-center justify-between bg-canvas border-b border-hairline-soft select-none h-9 px-3 w-full" data-tauri-drag-region>
        <div className="flex items-center gap-2 pointer-events-none type-link-sm text-ink lowercase">
          themectl
        </div>
        <div className="flex items-center h-full">
          <button
            onClick={() => setLanguage(language === "en" ? "pt" : "en")}
            className="titlebar-button hover:text-ink font-semibold text-xs px-3 h-full flex items-center justify-center cursor-pointer select-none"
            title={language === "en" ? "Mudar para Português" : "Switch to English"}
          >
            {language.toUpperCase()}
          </button>
          <div className="titlebar-button hover:text-ink" onClick={toggleDarkMode} title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            {darkMode ? <FiSun size={15} /> : <FiMoon size={15} />}
          </div>
          <div className="titlebar-button hover:text-ink" onClick={handleMinimize}>
            <FiMinus size={14} />
          </div>
          <div className="titlebar-button hover:text-ink" onClick={handleMaximize}>
            <FiSquare size={12} />
          </div>
          <div className="titlebar-button close" onClick={handleClose}>
            <FiX size={14} />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <aside className={`${sidebarCollapsed ? 'w-16' : 'w-56'} flex flex-col justify-between bg-canvas border-r border-hairline-soft transition-all duration-200 ease-in-out`}>
          <div className="flex flex-col pt-4">
            {/* Create Theme Prominent CTA */}
            <div className="px-2 mb-4">
              <Link
                to="/create"
                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg transition-all duration-150 ${
                  location.pathname === "/create"
                    ? "bg-ink text-canvas dark:bg-canvas-warm dark:text-ink"
                    : "bg-ink text-canvas hover:bg-ink/90 dark:bg-canvas-warm dark:text-ink dark:hover:bg-canvas-warm/80"
                } border border-hairline-soft ${sidebarCollapsed ? "px-0" : "px-4"}`}
                title={t("sidebar.createTheme")}
              >
                <FiPlus size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="type-link-sm font-semibold">{t("sidebar.createTheme")}</span>}
              </Link>
            </div>

            <nav className="space-y-1 px-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.nameKey}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 transition-all duration-150 type-link-sm ${
                      isActive 
                        ? "text-ink border-l-2 border-primary bg-hairline-soft/50 pl-2.5" 
                        : "text-stone hover:bg-hairline-soft hover:text-ink pl-3"
                    }`}
                  >
                    <Icon size={18} className="shrink-0" />
                    {!sidebarCollapsed && <span>{t(item.nameKey)}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex flex-col pb-4 px-2 gap-2">
            <Link
              to="/settings"
              className={`flex items-center gap-3 px-3 py-2.5 transition-all duration-150 type-link-sm ${
                location.pathname.startsWith("/settings")
                  ? "text-ink border-l-2 border-primary bg-hairline-soft/50 pl-2.5"
                  : "text-stone hover:bg-hairline-soft hover:text-ink pl-3"
              }`}
            >
              <FiSliders size={18} className="shrink-0" />
              {!sidebarCollapsed && <span>{t("sidebar.settings")}</span>}
            </Link>

            <button
              type="button"
              onClick={toggleSidebar}
              className="flex items-center gap-3 px-3 py-2.5 type-link-sm text-stone hover:bg-hairline-soft hover:text-ink transition-all duration-150 w-full"
            >
              {sidebarCollapsed ? (
                <FiChevronRight size={18} className="shrink-0" />
              ) : (
                <>
                  <FiChevronLeft size={18} className="shrink-0" />
                  <span>{t("sidebar.collapse")}</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Content area */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-y-auto px-8 py-8 scrollbar-gutter-stable">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
