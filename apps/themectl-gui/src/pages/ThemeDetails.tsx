import React from "react";
import { useParams } from "react-router-dom";
import { Spinner } from "@heroui/react";
import { PageHeader } from "../components/layout/PageHeader";
import { CardSectionHeader } from "../components/ui/CardSectionHeader";
import { Button, ButtonLink } from "../components/ui/Button";
import { useThemeDetails } from "../hooks/useThemes";
import { useTranslation } from "../hooks/useTranslation";
import { 
  FiArrowLeft, 
  FiPlay, 
  FiShield, 
  FiAlertTriangle, 
  FiCheck, 
  FiX, 
  FiExternalLink, 
  FiUser, 
  FiFileText 
} from "react-icons/fi";
import { useThemeUIStore } from "../stores/themeStore";
import { PreviewModal } from "../components/themes/PreviewModal";

export const ThemeDetails: React.FC = () => {
  const { t } = useTranslation();
  const { name } = useParams<{ name: string }>();
  const { data: theme, isLoading, error } = useThemeDetails(name || "");
  const { openPreviewModal, previewModalOpen, closePreviewModal, previewModalTheme } = useThemeUIStore();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Spinner size="md" className="text-ink" />
        <span className="type-meta text-stone">{t("details.loading")}</span>
      </div>
    );
  }

  if (error || !theme) {
    return (
      <div className="page-container">
        <ButtonLink to="/installed" variant="text" className="text-stone hover:text-ink">
          <FiArrowLeft /> {t("create.buttons.back")}
        </ButtonLink>
        <div className="type-body text-stone py-4">
          {t("common.error")}: {String(error || "Theme not found")}
        </div>
      </div>
    );
  }

  const getSignatureBadge = (status: any) => {
    if (status === "Verified") {
      return (
        <span className="monochrome-badge monochrome-badge-outline gap-1 text-ink">
          <FiShield size={12} className="text-stone" />
          <span>{t("details.verified")}</span>
        </span>
      );
    } else if (status === "Unsigned") {
      return (
        <span className="monochrome-badge monochrome-badge-outline gap-1 text-stone">
          <FiAlertTriangle size={12} />
          <span>{t("details.unsigned")}</span>
        </span>
      );
    } else {
      return (
        <span className="monochrome-badge monochrome-badge-outline border-red-200 text-red-500 gap-1">
          <FiAlertTriangle size={12} />
          <span>{t("details.invalid")}</span>
        </span>
      );
    }
  };

  return (
    <div className="page-container">
      <ButtonLink to="/installed" variant="text" className="text-stone hover:text-ink -mb-4">
        <FiArrowLeft /> {t("create.buttons.back")}
      </ButtonLink>

      <PageHeader 
        eyebrow={t("details.eyebrow")}
        title={theme.display_name || theme.name} 
        subtitle={`${t("installed.version")}: ${theme.version}`}
        actions={
          <Button variant="primary" onClick={() => openPreviewModal(theme.name)}>
            <FiPlay size={14} />
            <span>{t("installed.applyTheme")}</span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="card-flat">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {getSignatureBadge(theme.signature_status)}
                {theme.is_applied && (
                  <span className="monochrome-badge monochrome-badge-active">{t("details.activeLabel")}</span>
                )}
              </div>

              <p className="type-body text-graphite leading-relaxed">
                {theme.description || "No description provided for this theme."}
              </p>

              <hr className="border-t border-hairline-soft" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 type-meta">
                <div className="flex items-center gap-2 text-stone">
                  <FiUser size={15} />
                  <span>{t("create.form.author")}: <span className="text-ink type-body-strong">{theme.author || "Unknown"}</span></span>
                </div>
                <div className="flex items-center gap-2 text-stone">
                  <FiFileText size={15} />
                  <span>License: <span className="text-ink type-body-strong">{theme.license || "Unknown"}</span></span>
                </div>
                {theme.homepage && (
                  <div className="flex items-center gap-2 text-stone sm:col-span-2">
                    <FiExternalLink size={15} />
                    <span>
                      Homepage:{" "}
                      <a href={theme.homepage} target="_blank" rel="noopener noreferrer" className="btn-text-link text-ink">
                        {theme.homepage}
                      </a>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card-flat">
            <CardSectionHeader title={t("details.components")} />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 -mt-2">
              {Object.entries(theme.components).map(([key, present]) => (
                <div 
                  key={key} 
                  className={`flex items-center justify-between p-3 border transition-colors duration-150 ${
                    present 
                      ? "bg-canvas border-hairline-soft text-ink" 
                      : "bg-canvas-warm border-hairline-soft/40 text-stone"
                  }`}
                >
                  <span className="capitalize type-body-strong">{key.replace('_', ' ')}</span>
                  {present ? (
                    <span className="monochrome-badge monochrome-badge-active">{t("details.activeLabel")}</span>
                  ) : (
                    <span className="type-micro-caps text-stone opacity-50">{t("create.review.none")}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-flat">
            <CardSectionHeader title="Dependencies Check" />
            
            {theme.dependencies && theme.dependencies.items.length > 0 ? (
              <div className="space-y-4 -mt-2">
                <p className="type-meta text-stone">
                  Verify required system libraries, helper utilities, and font files:
                </p>
                <div className="space-y-2">
                  {theme.dependencies.items.map((dep) => (
                    <div 
                      key={dep.name} 
                      className={`flex items-center justify-between p-3 border ${
                        dep.installed 
                          ? "bg-canvas border-hairline-soft text-ink" 
                          : "bg-canvas-warm border-hairline-soft/40 text-stone"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="type-body-strong text-ink">{dep.name}</span>
                        <span className="type-micro-caps text-stone mt-0.5">{dep.kind}</span>
                      </div>
                      {dep.installed ? (
                        <span className="type-meta text-ink flex items-center gap-1">
                          <FiCheck size={14} /> {t("doctor.met")}
                        </span>
                      ) : (
                        <span className="type-meta text-stone flex items-center gap-1">
                          <FiX size={14} /> {t("doctor.missing")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="type-body text-stone italic py-6 text-center -mt-2">
                {t("details.componentsDesc")}
              </div>
            )}
          </div>
        </div>
      </div>

      <PreviewModal 
        isOpen={previewModalOpen && previewModalTheme === theme.name} 
        onClose={closePreviewModal} 
        themeName={theme.name} 
      />
    </div>
  );
};
export default ThemeDetails;
