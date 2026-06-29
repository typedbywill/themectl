import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Spinner } from "@heroui/react";
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
        <span className="monochrome-badge monochrome-badge-outline gap-1 text-ink">
          <FiShield size={12} className="text-stone" />
          <span>Verified</span>
        </span>
      );
    } else if (status === "Unsigned") {
      return (
        <span className="monochrome-badge monochrome-badge-outline gap-1 text-stone">
          <FiAlertTriangle size={12} />
          <span>Unsigned</span>
        </span>
      );
    } else {
      return (
        <span className="monochrome-badge monochrome-badge-outline border-red-200 text-red-500 gap-1">
          <FiAlertTriangle size={12} />
          <span>Invalid</span>
        </span>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Spinner size="md" className="text-ink" />
        <span className="type-meta text-stone">Loading installed themes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <PageHeader 
        eyebrow="Local storage"
        title="Installed Themes" 
        subtitle="Manage and apply themes installed on your machine." 
      />

      {themes?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-hairline-soft text-stone">
          <FiAlertTriangle size={32} className="text-stone mb-4" />
          <p className="type-body-strong text-ink">No themes installed yet</p>
          <p className="type-meta text-stone mt-1 mb-5">You can download new themes from the store.</p>
          <Link to="/themes">
            <button className="btn-primary">
              Go to Theme Store
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {themes?.map((theme) => (
            <div 
              key={theme.name} 
              className={theme.is_applied ? "card-featured" : "card-flat"}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="type-heading-sm text-ink font-medium">{theme.display_name || theme.name}</h3>
                    {theme.is_applied && (
                      <span className="monochrome-badge monochrome-badge-active gap-1">
                        <FiCheckCircle size={13} />
                        <span>Applied</span>
                      </span>
                    )}
                    {getSignatureBadge(theme.signature_status)}
                  </div>
                  
                  <p className="type-body text-graphite max-w-3xl">{theme.description || "No description provided."}</p>
                  
                  <div className="flex flex-wrap items-center gap-4 type-meta text-stone pt-1">
                    <span className="flex items-center gap-1.5">
                      <FiCalendar size={13} />
                      Installed: {new Date(theme.installed_at).toLocaleDateString()}
                    </span>
                    <span>Version: {theme.version}</span>
                    {theme.author && <span>by {theme.author}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Link to={`/installed/${theme.name}`} title="Theme Details">
                    <button className="btn-ghost w-10 h-10 p-0 flex items-center justify-center rounded-full">
                      <FiInfo size={16} />
                    </button>
                  </Link>

                  <button 
                    className="btn-ghost w-10 h-10 p-0 flex items-center justify-center rounded-full"
                    title="Export Theme package"
                    onClick={() => handleExport(theme.name)}
                    disabled={exporting === theme.name}
                  >
                    {exporting === theme.name ? (
                      <Spinner size="sm" className="text-ink" />
                    ) : (
                      <FiDownloadCloud size={16} />
                    )}
                  </button>

                  <button 
                    className="btn-ghost w-10 h-10 p-0 flex items-center justify-center rounded-full hover:border-red-500 hover:text-red-500"
                    title="Uninstall Theme"
                    onClick={() => handleRemove(theme.name)}
                    disabled={removeMutation.isPending && removeMutation.variables?.name === theme.name}
                  >
                    {removeMutation.isPending && removeMutation.variables?.name === theme.name ? (
                      <Spinner size="sm" className="text-ink" />
                    ) : (
                      <FiTrash2 size={16} />
                    )}
                  </button>

                  <button
                    className="btn-primary"
                    onClick={() => handleApplyClick(theme.name)}
                  >
                    <div className="flex items-center gap-1.5">
                      <FiPlay size={14} />
                      <span>Apply Theme</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
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
