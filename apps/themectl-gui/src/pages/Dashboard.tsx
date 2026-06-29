import React from "react";
import { Spinner } from "@heroui/react";
import { PageHeader } from "../components/layout/PageHeader";
import { CardSectionHeader } from "../components/ui/CardSectionHeader";
import { ButtonLink } from "../components/ui/Button";
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
  const latestBackup = backups?.[0];

  const isLoading = loadingInstalled || loadingBackups || loadingSources || loadingDoctor;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Spinner size="md" className="text-ink" />
        <span className="type-meta text-stone">Loading dashboard data...</span>
      </div>
    );
  }

  const missingCoreTools = doctor?.tools.filter(t => !t.installed && t.category === "core") || [];

  return (
    <div className="page-container">
      <PageHeader 
        eyebrow="System overview"
        title="Dashboard" 
        subtitle="Manage, browse and restore your KDE Plasma theme configuration." 
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-flat">
          <div className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 flex items-center justify-center border border-hairline-soft rounded-full text-ink shrink-0">
              <FiLayers size={18} />
            </div>
            <div>
              <p className="type-micro-caps text-stone">Installed Themes</p>
              <p className="stat-value text-ink mt-1">{installedThemes?.length || 0}</p>
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
              <p className="stat-value text-ink mt-1">{sources?.length || 0}</p>
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
              <p className="stat-value text-ink mt-1">{backups?.length || 0}</p>
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
              <p className="type-heading-sm text-ink mt-1">
                {missingCoreTools.length > 0 ? `${missingCoreTools.length} Issues` : "Healthy"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-flat justify-between min-h-[280px]">
          <div className="space-y-4">
            <CardSectionHeader title="Current Theme" />
            
            {currentThemeName ? (
              <div className="space-y-4">
                <h3 className="type-heading-sm text-ink -mt-2">
                  {currentThemeName.display_name || currentThemeName.name}
                </h3>
                <p className="type-body text-graphite">
                  {currentThemeName.description || "No description provided for this theme."}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-hairline-soft p-3 bg-canvas-warm">
                    <span className="type-micro-caps text-stone block">Version</span>
                    <span className="type-body-strong text-ink mt-1 block">{currentThemeName.version}</span>
                  </div>
                  <div className="border border-hairline-soft p-3 bg-canvas-warm">
                    <span className="type-micro-caps text-stone block">Author</span>
                    <span className="type-body-strong text-ink mt-1 block truncate">{currentThemeName.author || "Unknown"}</span>
                  </div>
                </div>

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
              <div className="type-body text-stone italic my-8 flex flex-col items-center justify-center gap-4">
                <span>The system is currently using its default styles.</span>
                <ButtonLink to="/themes" variant="ghost">
                  Browse Themes <FiArrowRight size={14} />
                </ButtonLink>
              </div>
            )}
          </div>
        </div>

        <div className="card-flat justify-between min-h-[280px]">
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            <div>
              <CardSectionHeader title="Latest Snapshot" />
              
              {latestBackup ? (
                <div className="space-y-4 -mt-2">
                  <h3 className="type-heading-sm text-ink">{latestBackup.timestamp}</h3>
                  <div className="flex items-center gap-2 type-body text-graphite">
                    <FiClock size={16} className="text-stone shrink-0" />
                    <span>Created at: {new Date(latestBackup.created_at).toLocaleString()}</span>
                  </div>
                  {latestBackup.theme_applied && (
                    <div className="type-meta text-stone bg-canvas-warm border border-hairline-soft p-3">
                      Theme at capture: <span className="text-ink type-body-strong">{latestBackup.theme_applied}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="type-micro-caps text-stone block">Plasma Style</span>
                      <span className="type-body-tight text-ink truncate block mt-1">{latestBackup.plasma_style || "None"}</span>
                    </div>
                    <div>
                      <span className="type-micro-caps text-stone block">Color Scheme</span>
                      <span className="type-body-tight text-ink truncate block mt-1">{latestBackup.color_scheme || "None"}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="type-body text-stone italic my-8 flex flex-col items-center justify-center gap-2 -mt-2">
                  <span>No restore points are available.</span>
                  <span className="type-meta text-stone text-center max-w-xs">Backups are automatically created before applying new themes.</span>
                </div>
              )}
            </div>
            
            {latestBackup && (
              <div className="flex justify-end pt-4 border-t border-hairline-soft">
                <ButtonLink to="/backups" variant="ghost">
                  Manage Backups <FiArrowRight size={14} />
                </ButtonLink>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card-flat justify-between">
          <div>
            <CardSectionHeader title="System Environment" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 -mt-2">
              <div className="border border-hairline-soft p-4 bg-canvas-warm">
                <span className="type-micro-caps text-stone block">Desktop Environment</span>
                <span className="type-heading-sm text-ink mt-2 block">{doctor?.desktop || "KDE Plasma"}</span>
                {doctor?.plasma_version && (
                  <span className="type-meta text-stone mt-1 block">{doctor.plasma_version}</span>
                )}
              </div>
              <div className="border border-hairline-soft p-4 bg-canvas-warm">
                <span className="type-micro-caps text-stone block">Distribution</span>
                <span className="type-heading-sm text-ink mt-2 block capitalize truncate">
                  {doctor?.distros?.join(", ") || "Linux"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-6 gap-4 border-t border-hairline-soft mt-6">
            <span className="type-meta text-stone">
              Inspect your desktop environment dependencies and CLI tool configuration.
            </span>
            <ButtonLink to="/doctor" variant="ghost" className="shrink-0">
              Run Diagnostics <FiArrowRight size={14} />
            </ButtonLink>
          </div>
        </div>

        <div className="card-flat justify-between">
          <div>
            <CardSectionHeader title="Repository Sources" />
            <p className="type-body text-graphite leading-relaxed -mt-2">
              Add theme catalogs and repositories to search for themes directly from the cloud.
            </p>
          </div>
          <ButtonLink to="/repositories" variant="primary" className="btn-full">
            Manage Sources
          </ButtonLink>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
