import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Spinner } from "@heroui/react";
import { PageHeader } from "../components/layout/PageHeader";
import { Button, ButtonLink } from "../components/ui/Button";
import { useInstalledThemes, useRemoveTheme } from "../hooks/useThemes";
import { useTranslation } from "../hooks/useTranslation";
import { PreviewModal } from "../components/themes/PreviewModal";
import { 
  FiCheckCircle, 
  FiPlay, 
  FiInfo, 
  FiDownloadCloud, 
  FiTrash2, 
  FiShield, 
  FiAlertTriangle,
  FiCalendar,
  FiPlus
} from "react-icons/fi";
import { toast } from "sonner";
import { api } from "../services/api";

export const Installed: React.FC = () => {
  const { t } = useTranslation();
  const { data: themes, isLoading } = useInstalledThemes();
  const removeMutation = useRemoveTheme();
  const [selectedThemeForPreview, setSelectedThemeForPreview] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const handleApplyClick = (themeName: string) => {
    setSelectedThemeForPreview(themeName);
  };

  const handleRemove = (themeName: string) => {
    if (confirm(t("installed.confirmUninstall", { name: themeName }))) {
      removeMutation.mutate({ name: themeName, force: true });
    }
  };

  const handleExport = async (themeName: string) => {
    try {
      setExporting(themeName);
      toast.info(t("installed.exportingInfo", { name: themeName }));
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `my-theme-${themeName}-${timestamp}.theme`;
      const res = await api.exportTheme(filename);
      toast.success(res || `Theme exported to ${filename}`);
    } catch (e: any) {
      toast.error(e?.message || e || t("installed.exportFailed"));
    } finally {
      setExporting(null);
    }
  };

  const getSignatureBadge = (status: any) => {
    if (status === "Verified") {
      return (
        <span className="monochrome-badge monochrome-badge-outline gap-1 text-ink">
          <FiShield size={12} className="text-stone" />
          <span>{t("installed.verified")}</span>
        </span>
      );
    } else if (status === "Unsigned") {
      return (
        <span className="monochrome-badge monochrome-badge-outline gap-1 text-stone">
          <FiAlertTriangle size={12} />
          <span>{t("installed.unsigned")}</span>
        </span>
      );
    } else {
      return (
        <span className="monochrome-badge monochrome-badge-outline border-red-200 text-red-500 gap-1">
          <FiAlertTriangle size={12} />
          <span>{t("installed.invalid")}</span>
        </span>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Spinner size="md" className="text-ink" />
        <span className="type-meta text-stone">{t("installed.loadingThemes")}</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader 
        eyebrow={t("installed.eyebrow")}
        title={t("installed.title")} 
        subtitle={t("installed.subtitle")} 
        actions={
          <ButtonLink to="/create" variant="primary">
            <FiPlus size={14} />
            <span>{t("sidebar.createTheme")}</span>
          </ButtonLink>
        }
      />

      {themes?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-hairline-soft text-stone">
          <FiAlertTriangle size={32} className="text-stone mb-4" />
          <p className="type-body-strong text-ink">{t("installed.noThemes")}</p>
          <p className="type-meta text-stone mt-1 mb-5">{t("installed.noThemesDesc")}</p>
          <ButtonLink to="/themes" variant="primary">
            {t("installed.goToStore")}
          </ButtonLink>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {themes?.map((theme) => (
            <div 
              key={theme.name} 
              className={theme.is_applied ? "card-featured" : "card-flat"}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="type-heading-sm text-ink">{theme.display_name || theme.name}</h3>
                    {theme.is_applied && (
                      <span className="monochrome-badge monochrome-badge-active gap-1">
                        <FiCheckCircle size={13} />
                        <span>{t("installed.applied")}</span>
                      </span>
                    )}
                    {getSignatureBadge(theme.signature_status)}
                  </div>
                  
                  <p className="type-body text-graphite max-w-3xl">{theme.description || "No description provided."}</p>
                  
                  <div className="flex flex-wrap items-center gap-4 type-meta text-stone pt-1">
                    <span className="flex items-center gap-1.5">
                      <FiCalendar size={13} />
                      {t("installed.installedAt")}: {new Date(theme.installed_at).toLocaleDateString()}
                    </span>
                    <span>{t("installed.version")}: {theme.version}</span>
                    {theme.author && <span>{t("installed.by")} {theme.author}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Link to={`/installed/${theme.name}`} title={t("installed.detailsTitle")}>
                    <Button variant="icon" aria-label={t("installed.detailsTitle")}>
                      <FiInfo size={16} />
                    </Button>
                  </Link>

                  <Button 
                    variant="icon"
                    title={t("installed.exportTitle")}
                    onClick={() => handleExport(theme.name)}
                    disabled={exporting === theme.name}
                    aria-label={t("installed.exportTitle")}
                  >
                    {exporting === theme.name ? (
                      <Spinner size="sm" className="text-ink" />
                    ) : (
                      <FiDownloadCloud size={16} />
                    )}
                  </Button>

                  <Button 
                    variant="icon-danger"
                    title={t("installed.uninstallTitle")}
                    onClick={() => handleRemove(theme.name)}
                    disabled={removeMutation.isPending && removeMutation.variables?.name === theme.name}
                    aria-label={t("installed.uninstallTitle")}
                  >
                    {removeMutation.isPending && removeMutation.variables?.name === theme.name ? (
                      <Spinner size="sm" className="text-ink" />
                    ) : (
                      <FiTrash2 size={16} />
                    )}
                  </Button>

                  <Button
                    variant="primary"
                    onClick={() => handleApplyClick(theme.name)}
                  >
                    <FiPlay size={14} />
                    <span>{t("installed.applyTheme")}</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PreviewModal 
        isOpen={!!selectedThemeForPreview} 
        onClose={() => setSelectedThemeForPreview(null)} 
        themeName={selectedThemeForPreview} 
      />
    </div>
  );
};
export default Installed;
