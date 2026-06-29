import React, { useState, useEffect } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { 
  FiGrid, 
  FiShoppingBag, 
  FiLayers, 
  FiGlobe, 
  FiBriefcase, 
  FiCpu, 
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

export const AppShell: React.FC = () => {
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar, darkMode, toggleDarkMode } = useThemeUIStore();
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
    { name: "Dashboard", path: "/", icon: FiGrid },
    { name: "Theme Store", path: "/themes", icon: FiShoppingBag },
    { name: "Installed Themes", path: "/installed", icon: FiLayers },
    { name: "Create Theme", path: "/create", icon: FiPlus },
    { name: "Repositories", path: "/repositories", icon: FiGlobe },
    { name: "Backups", path: "/backups", icon: FiBriefcase },
    { name: "System Doctor", path: "/doctor", icon: FiCpu },
  ];


  return (
    <div className="flex flex-col h-screen overflow-hidden bg-canvas text-ink">
      {/* Tauri custom titlebar */}
      <div className="titlebar flex items-center justify-between bg-canvas border-b border-hairline-soft select-none h-9 px-3 w-full" data-tauri-drag-region>
        <div className="flex items-center gap-2 pointer-events-none type-link-sm text-ink lowercase">
          themectl
        </div>
        <div className="flex items-center">
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
            <nav className="space-y-1 px-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 transition-all duration-150 type-link-sm ${
                      isActive 
                        ? "text-ink border-l-2 border-primary bg-hairline-soft/50 pl-2.5" 
                        : "text-stone hover:bg-hairline-soft hover:text-ink pl-3"
                    }`}
                  >
                    <Icon size={18} className="shrink-0" />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex flex-col pb-4 px-2 gap-2">
            <Link
              to="/settings"
              className={`flex items-center gap-3 px-3 py-2.5 transition-all duration-150 type-link-sm ${
                location.pathname === "/settings"
                  ? "text-ink border-l-2 border-primary bg-hairline-soft/50 pl-2.5"
                  : "text-stone hover:bg-hairline-soft hover:text-ink pl-3"
              }`}
            >
              <FiSliders size={18} className="shrink-0" />
              {!sidebarCollapsed && <span>Settings</span>}
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
                  <span>Collapse Sidebar</span>
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
