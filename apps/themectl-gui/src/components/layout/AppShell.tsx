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
  FiChevronRight
} from "react-icons/fi";
import { useThemeUIStore } from "../../stores/themeStore";

export const AppShell: React.FC = () => {
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useThemeUIStore();
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
    { name: "Repositories", path: "/repositories", icon: FiGlobe },
    { name: "Backups", path: "/backups", icon: FiBriefcase },
    { name: "System Doctor", path: "/doctor", icon: FiCpu },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0a0e17] text-[#f3f4f6]">
      {/* Tauri custom titlebar */}
      <div className="titlebar flex items-center justify-between bg-[#070a10] border-b border-[#1e293b] select-none h-9 px-3 w-full" data-tauri-drag-region>
        <div className="flex items-center gap-2 pointer-events-none text-xs font-semibold tracking-wider text-[#9ca3af]">
          <span className="text-[#7c3aed] font-bold text-sm">◈</span> themectl
        </div>
        <div className="flex items-center">
          <div className="titlebar-button text-gray-400 hover:text-white" onClick={handleMinimize}>
            <FiMinus size={14} />
          </div>
          <div className="titlebar-button text-gray-400 hover:text-white" onClick={handleMaximize}>
            <FiSquare size={12} />
          </div>
          <div className="titlebar-button close text-gray-400" onClick={handleClose}>
            <FiX size={14} />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <aside className={`${sidebarCollapsed ? 'w-16' : 'w-56'} flex flex-col justify-between bg-[#0b0f19] border-r border-[#1e293b] transition-all duration-200 ease-in-out`}>
          <div className="flex flex-col pt-4">
            <nav className="space-y-1 px-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive 
                        ? "bg-[#7c3aed]/10 text-[#a78bfa] border-l-2 border-[#7c3aed]" 
                        : "text-gray-400 hover:bg-gray-800/40 hover:text-white"
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                location.pathname === "/settings"
                  ? "bg-[#7c3aed]/10 text-[#a78bfa] border-l-2 border-[#7c3aed]"
                  : "text-gray-400 hover:bg-gray-800/40 hover:text-white"
              }`}
            >
              <FiSliders size={18} className="shrink-0" />
              {!sidebarCollapsed && <span>Settings</span>}
            </Link>

            <button
              onClick={toggleSidebar}
              className="flex items-center gap-3 px-3 py-2 text-gray-500 hover:text-gray-300 rounded-lg text-sm font-medium transition-all duration-150 w-full"
            >
              {sidebarCollapsed ? <FiChevronRight size={18} /> : <div className="flex items-center gap-3"><FiChevronLeft size={18} /> <span>Collapse Sidebar</span></div>}
            </button>
          </div>
        </aside>

        {/* Content area */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-6 scrollbar-gutter-stable">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
