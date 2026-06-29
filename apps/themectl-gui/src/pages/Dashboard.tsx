import React from "react";
import { Link } from "react-router-dom";
import { Card, Button, Spinner, Chip } from "@heroui/react";
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
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <Spinner size="lg" color="accent" />
        <span className="text-sm text-gray-400">Loading dashboard data...</span>
      </div>
    );
  }

  // Calculate missing core tools
  const missingCoreTools = doctor?.tools.filter(t => !t.installed && t.category === "core") || [];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Dashboard" 
        subtitle="Manage, browse and restore your KDE Plasma theme configuration." 
      />

      {/* Stats Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-[#111827] border border-[#1e293b]">
          <Card.Content className="flex flex-row items-center gap-4 p-4">
            <div className="p-3 bg-[#7c3aed]/10 text-[#a78bfa] rounded-xl">
              <FiLayers size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Installed Themes</p>
              <h3 className="text-2xl font-bold text-white mt-1">{installedThemes?.length || 0}</h3>
            </div>
          </Card.Content>
        </Card>

        <Card className="bg-[#111827] border border-[#1e293b]">
          <Card.Content className="flex flex-row items-center gap-4 p-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
              <FiGlobe size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Repositories</p>
              <h3 className="text-2xl font-bold text-white mt-1">{sources?.length || 0}</h3>
            </div>
          </Card.Content>
        </Card>

        <Card className="bg-[#111827] border border-[#1e293b]">
          <Card.Content className="flex flex-row items-center gap-4 p-4">
            <div className="p-3 bg-green-500/10 text-green-400 rounded-xl">
              <FiBriefcase size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Backups</p>
              <h3 className="text-2xl font-bold text-white mt-1">{backups?.length || 0}</h3>
            </div>
          </Card.Content>
        </Card>

        <Card className="bg-[#111827] border border-[#1e293b]">
          <Card.Content className="flex flex-row items-center gap-4 p-4">
            <div className={`p-3 rounded-xl ${missingCoreTools.length > 0 ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
              {missingCoreTools.length > 0 ? <FiAlertTriangle size={22} /> : <FiCheckCircle size={22} />}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">System Status</p>
              <h3 className="text-lg font-bold text-white mt-1.5">
                {missingCoreTools.length > 0 ? `${missingCoreTools.length} Issues` : "Healthy"}
              </h3>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Theme Card */}
        <Card className="bg-[#111827] border border-[#1e293b]">
          <Card.Header className="border-b border-[#1e293b] px-5 py-4">
            <div className="flex flex-col">
              <Card.Title className="text-sm font-semibold uppercase tracking-wider text-gray-400">Current Theme</Card.Title>
              <Card.Description className="text-lg font-bold text-white mt-0.5">
                {currentThemeName ? (currentThemeName.display_name || currentThemeName.name) : "No theme applied"}
              </Card.Description>
            </div>
          </Card.Header>
          <Card.Content className="p-5 flex flex-col justify-between">
            {currentThemeName ? (
              <div className="space-y-4">
                <div className="text-sm text-gray-300">
                  {currentThemeName.description || "No description provided for this theme."}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#1f2937]/50 rounded-lg p-2.5 border border-[#374151]/50">
                    <span className="text-gray-400 block mb-0.5">Version</span>
                    <span className="text-white font-medium">{currentThemeName.version}</span>
                  </div>
                  <div className="bg-[#1f2937]/50 rounded-lg p-2.5 border border-[#374151]/50">
                    <span className="text-gray-400 block mb-0.5">Author</span>
                    <span className="text-white font-medium">{currentThemeName.author || "Unknown"}</span>
                  </div>
                </div>

                {/* Applied Components count */}
                <div className="text-xs text-gray-400">
                  <span className="block mb-2 font-medium">Applied Components</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(currentThemeName.components)
                      .filter(([_, present]) => present)
                      .map(([key]) => (
                        <Chip key={key} color="accent" variant="soft" className="border border-[#7c3aed]/25">
                          <Chip.Label className="text-[10px] capitalize text-[#a78bfa]">{key.replace('_', ' ')}</Chip.Label>
                        </Chip>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-400 italic my-6 flex flex-col items-center justify-center gap-2">
                <span>The system is currently using its default styles.</span>
                <Link to="/themes">
                  <Button size="sm" variant="secondary" className="mt-2">
                    Browse Themes <FiArrowRight />
                  </Button>
                </Link>
              </div>
            )}
          </Card.Content>
        </Card>

        {/* Latest Backup Card */}
        <Card className="bg-[#111827] border border-[#1e293b]">
          <Card.Header className="border-b border-[#1e293b] px-5 py-4">
            <div className="flex flex-col">
              <Card.Title className="text-sm font-semibold uppercase tracking-wider text-gray-400">Latest Snapshot</Card.Title>
              <Card.Description className="text-lg font-bold text-white mt-0.5">
                {latestBackup ? latestBackup.timestamp : "No snapshots recorded"}
              </Card.Description>
            </div>
          </Card.Header>
          <Card.Content className="p-5 flex flex-col justify-between">
            {latestBackup ? (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <FiClock size={16} className="text-gray-400" />
                    <span>Created at: {new Date(latestBackup.created_at).toLocaleString()}</span>
                  </div>
                  {latestBackup.theme_applied && (
                    <div className="text-xs text-gray-400 bg-gray-800/40 rounded-lg p-2.5 border border-[#374151]/40">
                      Theme at capture: <span className="text-[#a78bfa] font-semibold">{latestBackup.theme_applied}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                    <div>
                      <span className="block text-gray-500">Plasma Style:</span>
                      <span className="text-gray-300 font-medium truncate block">{latestBackup.plasma_style || "None"}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500">Color Scheme:</span>
                      <span className="text-gray-300 font-medium truncate block">{latestBackup.color_scheme || "None"}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end mt-4">
                  <Link to="/backups">
                    <Button size="sm" variant="secondary">
                      Manage Backups <FiArrowRight />
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-400 italic my-6 flex flex-col items-center justify-center gap-2">
                <span>No restore points are available.</span>
                <span className="text-xs text-gray-500 text-center max-w-xs">Backups are automatically created before applying new themes.</span>
              </div>
            )}
          </Card.Content>
        </Card>
      </div>

      {/* Row 2: Environment and Doctor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-[#111827] border border-[#1e293b]">
          <Card.Header className="border-b border-[#1e293b] px-5 py-4">
            <Card.Title className="text-sm font-semibold uppercase tracking-wider text-gray-400">System Environment</Card.Title>
          </Card.Header>
          <Card.Content className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#1f2937]/30 rounded-xl p-4 border border-[#374151]/40">
                <span className="text-xs text-gray-400 block font-medium uppercase tracking-wider">Desktop Environment</span>
                <span className="text-lg font-bold text-white mt-1 block">{doctor?.desktop || "KDE Plasma"}</span>
                {doctor?.plasma_version && (
                  <span className="text-xs text-gray-500 mt-0.5 block">{doctor.plasma_version}</span>
                )}
              </div>
              <div className="bg-[#1f2937]/30 rounded-xl p-4 border border-[#374151]/40">
                <span className="text-xs text-gray-400 block font-medium uppercase tracking-wider">Distribution / Likes</span>
                <span className="text-lg font-bold text-white mt-1 block capitalize truncate">
                  {doctor?.distros?.join(", ") || "Linux"}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-gray-500">
                Inspect your desktop environment dependencies and CLI tool configuration.
              </span>
              <Link to="/doctor">
                <Button size="sm" variant="ghost">
                  Run Diagnostics <FiArrowRight />
                </Button>
              </Link>
            </div>
          </Card.Content>
        </Card>

        <Card className="bg-[#111827] border border-[#1e293b] justify-between">
          <Card.Header className="border-b border-[#1e293b] px-5 py-4">
            <Card.Title className="text-sm font-semibold uppercase tracking-wider text-gray-400">Configure repositories</Card.Title>
          </Card.Header>
          <Card.Content className="p-5 flex flex-col justify-between">
            <p className="text-sm text-gray-300 leading-relaxed mb-4">
              Add theme catalogs and repositories to search for themes directly from the cloud.
            </p>
            <Link to="/repositories" className="w-full">
              <Button className="w-full bg-[#7c3aed] hover:bg-[#9333ea] text-white" size="sm" variant="primary">
                Manage Sources
              </Button>
            </Link>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};
export default Dashboard;
