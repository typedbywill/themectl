import React from "react";
import { Link } from "react-router-dom";
import { Spinner } from "@heroui/react";
import { PageHeader } from "../components/layout/PageHeader";
import { useInstalledThemes } from "../hooks/useThemes";
import { useBackups } from "../hooks/useBackups";
import { useSources } from "../hooks/useSources";
import { useDoctor } from "../hooks/useDoctor";
import { 
  FiLayers, 
  FiGlobe, 
  FiBriefcase, 
  FiCheckCircle, 
  FiAlertTriangle, 
  FiArrowRight, 
  FiClock 
} from "react-icons/fi";

export const Dashboard: React.FC = () => {
  const { data: installedThemes, isLoading: loadingInstalled } = useInstalledThemes();
  const { data: backups, isLoading: loadingBackups } = useBackups();
  const { data: sources, isLoading: loadingSources } = useSources();
  const { data: doctor, isLoading: loadingDoctor } = useDoctor();

  const currentThemeName = installedThemes?.find(t => t.is_applied);
  const latestBackup = backups?.[0]; // backups are sorted newest first in our list_backups command

  const isLoading = loadingInstalled || loadingBackups || loadingSources || loadingDoctor;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Spinner size="md" className="text-ink" />
        <span className="type-meta text-stone">Loading dashboard data...</span>
      </div>
    );
  }

  // Calculate missing core tools
  const missingCoreTools = doctor?.tools.filter(t => !t.installed && t.category === "core") || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <PageHeader 
        eyebrow="System overview"
        title="Dashboard" 
        subtitle="Manage, browse and restore your KDE Plasma theme configuration." 
      />

      {/* Stats Bar */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-flat">
          <div className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 flex items-center justify-center border border-hairline-soft rounded-full text-ink shrink-0">
              <FiLayers size={18} />
            </div>
            <div>
              <p className="type-micro-caps text-stone">Installed Themes</p>
              <h3 className="type-display-sm text-ink mt-0.5">{installedThemes?.length || 0}</h3>
            </div>
          </div>
        </div>

        <div className="card-flat">
          <div className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 flex items-center justify-center border border-hairline-soft rounded-full text-ink shrink-0">
              <FiGlobe size={18} />
            </div>
            <div>
              <p className="type-micro-caps text-stone">Repositories</p>
              <h3 className="type-display-sm text-ink mt-0.5">{sources?.length || 0}</h3>
            </div>
          </div>
        </div>

        <div className="card-flat">
          <div className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 flex items-center justify-center border border-hairline-soft rounded-full text-ink shrink-0">
              <FiBriefcase size={18} />
            </div>
            <div>
              <p className="type-micro-caps text-stone">Backups</p>
              <h3 className="type-display-sm text-ink mt-0.5">{backups?.length || 0}</h3>
            </div>
          </div>
        </div>

        <div className="card-flat">
          <div className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 flex items-center justify-center border border-hairline-soft rounded-full text-ink shrink-0">
              {missingCoreTools.length > 0 ? <FiAlertTriangle size={18} /> : <FiCheckCircle size={18} />}
            </div>
            <div>
              <p className="type-micro-caps text-stone">System Status</p>
              <h3 className="type-heading-sm text-ink mt-0.5">
                {missingCoreTools.length > 0 ? `${missingCoreTools.length} Issues` : "Healthy"}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Theme Card */}
        <div className="card-flat justify-between min-h-[300px]">
          <div className="space-y-4">
            <div className="border-b border-hairline-soft pb-3 mb-3">
              <p className="type-micro-caps text-stone">Current Theme</p>
              <h3 className="type-heading-sm text-ink mt-0.5 font-medium">
                {currentThemeName ? (currentThemeName.display_name || currentThemeName.name) : "No theme applied"}
              </h3>
            </div>
            
            {currentThemeName ? (
              <div className="space-y-4">
                <div className="type-body text-graphite">
                  {currentThemeName.description || "No description provided for this theme."}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-hairline-soft p-3 bg-canvas-warm">
                    <span className="type-micro-caps text-stone block">Version</span>
                    <span className="type-body-strong text-ink mt-0.5 block">{currentThemeName.version}</span>
                  </div>
                  <div className="border border-hairline-soft p-3 bg-canvas-warm">
                    <span className="type-micro-caps text-stone block">Author</span>
                    <span className="type-body-strong text-ink mt-0.5 block truncate">{currentThemeName.author || "Unknown"}</span>
                  </div>
                </div>

                {/* Applied Components count */}
                <div className="space-y-2">
                  <span className="type-micro-caps text-stone block">Applied Components</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(currentThemeName.components)
                      .filter(([_, present]) => present)
                      .map(([key]) => (
                        <span key={key} className="monochrome-badge monochrome-badge-secondary">
                          {key.replace('_', ' ')}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="type-body text-stone italic my-8 flex flex-col items-center justify-center gap-3">
                <span>The system is currently using its default styles.</span>
                <Link to="/themes">
                  <button className="btn-ghost">
                    Browse Themes <FiArrowRight className="ml-1" />
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Latest Backup Card */}
        <div className="card-flat justify-between min-h-[300px]">
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            <div>
              <div className="border-b border-hairline-soft pb-3 mb-3">
                <p className="type-micro-caps text-stone">Latest Snapshot</p>
                <h3 className="type-heading-sm text-ink mt-0.5 font-medium">
                  {latestBackup ? latestBackup.timestamp : "No snapshots recorded"}
                </h3>
              </div>
              
              {latestBackup ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 type-body text-graphite">
                    <FiClock size={16} className="text-stone shrink-0" />
                    <span>Created at: {new Date(latestBackup.created_at).toLocaleString()}</span>
                  </div>
                  {latestBackup.theme_applied && (
                    <div className="type-meta text-stone bg-canvas-warm border border-hairline-soft p-3">
                      Theme at capture: <span className="text-ink font-semibold">{latestBackup.theme_applied}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="type-micro-caps text-stone block">Plasma Style:</span>
                      <span className="type-body-tight text-ink font-medium truncate block mt-0.5">{latestBackup.plasma_style || "None"}</span>
                    </div>
                    <div>
                      <span className="type-micro-caps text-stone block">Color Scheme:</span>
                      <span className="type-body-tight text-ink font-medium truncate block mt-0.5">{latestBackup.color_scheme || "None"}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="type-body text-stone italic my-8 flex flex-col items-center justify-center gap-2">
                  <span>No restore points are available.</span>
                  <span className="type-meta text-stone text-center max-w-xs">Backups are automatically created before applying new themes.</span>
                </div>
              )}
            </div>
            
            {latestBackup && (
              <div className="flex justify-end pt-4">
                <Link to="/backups">
                  <button className="btn-ghost">
                    Manage Backups <FiArrowRight className="ml-1" />
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Environment and Doctor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-flat justify-between">
          <div>
            <div className="border-b border-hairline-soft pb-3 mb-4">
              <p className="type-micro-caps text-stone">System Environment</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-hairline-soft p-4 bg-canvas-warm">
                <span className="type-micro-caps text-stone block">Desktop Environment</span>
                <span className="type-heading-sm text-ink mt-1 block font-medium">{doctor?.desktop || "KDE Plasma"}</span>
                {doctor?.plasma_version && (
                  <span className="type-meta text-stone mt-1 block">{doctor.plasma_version}</span>
                )}
              </div>
              <div className="border border-hairline-soft p-4 bg-canvas-warm">
                <span className="type-micro-caps text-stone block">Distribution</span>
                <span className="type-heading-sm text-ink mt-1 block font-medium capitalize truncate">
                  {doctor?.distros?.join(", ") || "Linux"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-6 gap-4 border-t border-hairline-soft mt-6">
            <span className="type-meta text-stone">
              Inspect your desktop environment dependencies and CLI tool configuration.
            </span>
            <Link to="/doctor">
              <button className="btn-ghost shrink-0">
                Run Diagnostics <FiArrowRight className="ml-1" />
              </button>
            </Link>
          </div>
        </div>

        <div className="card-flat justify-between">
          <div>
            <div className="border-b border-hairline-soft pb-3 mb-4">
              <p className="type-micro-caps text-stone">Repository sources</p>
            </div>
            <p className="type-body text-graphite leading-relaxed mb-6">
              Add theme catalogs and repositories to search for themes directly from the cloud.
            </p>
          </div>
          <Link to="/repositories" className="w-full">
            <button className="btn-primary w-full">
              Manage Sources
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
