import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Card, 
  Button, 
  Spinner, 
  Chip
} from "@heroui/react";
import { PageHeader } from "../components/layout/PageHeader";
import { useInstalledThemes, useRemoveTheme } from "../hooks/useThemes";
import { PreviewModal } from "../components/themes/PreviewModal";
import { 
  FiCheckCircle, 
  FiPlay, 
  FiInfo, 
  FiDownloadCloud, 
  FiTrash2, 
  FiShield, 
  FiAlertTriangle,
  FiCalendar
} from "react-icons/fi";
import { toast } from "sonner";
import { api } from "../services/api";

export const Installed: React.FC = () => {
  const { data: themes, isLoading } = useInstalledThemes();
  const removeMutation = useRemoveTheme();
  const [selectedThemeForPreview, setSelectedThemeForPreview] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const handleApplyClick = (themeName: string) => {
    setSelectedThemeForPreview(themeName);
  };

  const handleRemove = (themeName: string) => {
    if (confirm(`Are you sure you want to uninstall theme '${themeName}'?`)) {
      removeMutation.mutate({ name: themeName, force: true });
    }
  };

  const handleExport = async (themeName: string) => {
    try {
      setExporting(themeName);
      toast.info(`Preparing to export theme '${themeName}'...`);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `my-theme-${themeName}-${timestamp}.theme`;
      const res = await api.exportTheme(filename);
      toast.success(res || `Theme exported to ${filename}`);
    } catch (e: any) {
      toast.error(e?.message || e || "Failed to export theme");
    } finally {
      setExporting(null);
    }
  };

  const getSignatureBadge = (status: any) => {
    if (status === "Verified") {
      return (
        <Chip 
          size="sm" 
          variant="soft" 
          color="success" 
          className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs"
        >
          <div className="flex items-center gap-1">
            <FiShield size={12} />
            <Chip.Label>Verified</Chip.Label>
          </div>
        </Chip>
      );
    } else if (status === "Unsigned") {
      return (
        <Chip 
          size="sm" 
          variant="soft" 
          color="warning" 
          className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs"
        >
          <div className="flex items-center gap-1">
            <FiAlertTriangle size={12} />
            <Chip.Label>Unsigned</Chip.Label>
          </div>
        </Chip>
      );
    } else {
      return (
        <Chip 
          size="sm" 
          variant="soft" 
          color="danger" 
          className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs"
        >
          <div className="flex items-center gap-1">
            <FiAlertTriangle size={12} />
            <Chip.Label>Invalid</Chip.Label>
          </div>
        </Chip>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <Spinner size="lg" color="accent" />
        <span className="text-sm text-gray-400">Loading installed themes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Installed Themes" 
        subtitle="Manage and apply themes installed on your machine." 
      />

      {themes?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#111827]/40 rounded-2xl border border-dashed border-[#1e293b] text-gray-400">
          <FiAlertTriangle size={36} className="text-amber-500 mb-3" />
          <p className="text-sm font-semibold">No themes installed yet</p>
          <p className="text-xs text-gray-500 mt-1 mb-4">You can download new themes from the store.</p>
          <Link to="/themes">
            <Button size="sm" variant="secondary">
              Go to Theme Store
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {themes?.map((theme) => (
            <Card 
              key={theme.name} 
              className={`bg-[#111827] border ${theme.is_applied ? "border-[#7c3aed]" : "border-[#1e293b]"} hover:border-[#7c3aed]/50 transition-all duration-150`}
            >
              <Card.Content className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{theme.display_name || theme.name}</h3>
                    {theme.is_applied && (
                      <Chip 
                        size="sm" 
                        color="accent" 
                        variant="soft"
                        className="bg-[#7c3aed]/10 text-[#a78bfa] border border-[#7c3aed]/20 text-xs font-semibold px-2 py-0.5"
                      >
                        <div className="flex items-center gap-1">
                          <FiCheckCircle size={13} />
                          <Chip.Label>Applied</Chip.Label>
                        </div>
                      </Chip>
                    )}
                    {getSignatureBadge(theme.signature_status)}
                  </div>
                  
                  <p className="text-xs text-gray-400 max-w-2xl">{theme.description || "No description provided."}</p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-1">
                    <span className="flex items-center gap-1">
                      <FiCalendar size={13} />
                      Installed: {new Date(theme.installed_at).toLocaleDateString()}
                    </span>
                    <span>Version: {theme.version}</span>
                    {theme.author && <span>by {theme.author}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <div title="Theme Details">
                    <Link to={`/installed/${theme.name}`}>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-gray-300 border-gray-700 hover:bg-gray-800"
                      >
                        <FiInfo size={16} />
                      </Button>
                    </Link>
                  </div>

                  <div title="Export Theme package">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-gray-300 border-gray-700 hover:bg-gray-800"
                      onPress={() => handleExport(theme.name)}
                      isPending={exporting === theme.name}
                    >
                      <FiDownloadCloud size={16} />
                    </Button>
                  </div>

                  <div title="Uninstall Theme">
                    <Button 
                      size="sm" 
                      variant="danger-soft" 
                      onPress={() => handleRemove(theme.name)}
                      isPending={removeMutation.isPending && removeMutation.variables?.name === theme.name}
                    >
                      <FiTrash2 size={16} />
                    </Button>
                  </div>

                  <Button
                    size="sm"
                    className="bg-[#7c3aed] hover:bg-[#9333ea] text-white font-medium"
                    onPress={() => handleApplyClick(theme.name)}
                  >
                    <div className="flex items-center gap-1.5">
                      <FiPlay size={14} />
                      <span>Apply Theme</span>
                    </div>
                  </Button>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}

      {/* Preview and Apply Modal */}
      <PreviewModal 
        isOpen={!!selectedThemeForPreview} 
        onClose={() => setSelectedThemeForPreview(null)} 
        themeName={selectedThemeForPreview} 
      />
    </div>
  );
};
export default Installed;
