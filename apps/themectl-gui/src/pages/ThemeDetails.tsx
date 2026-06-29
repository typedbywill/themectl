import React from "react";
import { useParams, Link } from "react-router-dom";
import { Spinner } from "@heroui/react";
import { PageHeader } from "../components/layout/PageHeader";
import { useThemeDetails } from "../hooks/useThemes";
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
  const { name } = useParams<{ name: string }>();
  const { data: theme, isLoading, error } = useThemeDetails(name || "");
  const { openPreviewModal, previewModalOpen, closePreviewModal, previewModalTheme } = useThemeUIStore();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Spinner size="md" className="text-ink" />
        <span className="type-meta text-stone">Loading theme details...</span>
      </div>
    );
  }

  if (error || !theme) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto">
        <Link to="/installed" className="btn-text-link type-link-sm text-stone hover:text-ink">
          <FiArrowLeft /> back to installed
        </Link>
        <div className="text-red-500 text-sm py-4">
          Failed to load theme details: {String(error || "Theme not found")}
        </div>
      </div>
    );
  }

  const getSignatureBadge = (status: any) => {
    if (status === "Verified") {
      return (
        <span className="monochrome-badge monochrome-badge-outline gap-1 text-ink">
          <FiShield size={12} className="text-stone" />
          <span>Signature Verified</span>
        </span>
      );
    } else if (status === "Unsigned") {
      return (
        <span className="monochrome-badge monochrome-badge-outline gap-1 text-stone">
          <FiAlertTriangle size={12} />
          <span>Unsigned Package</span>
        </span>
      );
    } else {
      return (
        <span className="monochrome-badge monochrome-badge-outline border-red-200 text-red-500 gap-1">
          <FiAlertTriangle size={12} />
          <span>Invalid Signature</span>
        </span>
      );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <Link to="/installed" className="btn-text-link type-link-sm text-stone hover:text-ink">
          <FiArrowLeft /> back to installed
        </Link>
      </div>

      <PageHeader 
        eyebrow="Theme Details"
        title={theme.display_name || theme.name} 
        subtitle={`Installed version: ${theme.version}`}
        actions={
          <button
            className="btn-primary"
            onClick={() => openPreviewModal(theme.name)}
          >
            <div className="flex items-center gap-1.5">
              <FiPlay size={14} />
              <span>Apply Theme</span>
            </div>
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Info & Meta panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Card */}
          <div className="card-flat">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {getSignatureBadge(theme.signature_status)}
                {theme.is_applied && (
                  <span className="monochrome-badge monochrome-badge-active">Currently Applied</span>
                )}
              </div>

              <div className="type-body text-graphite leading-relaxed">
                {theme.description || "No description provided for this theme."}
              </div>

              <hr className="border-t border-hairline-soft" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 type-meta">
                <div className="flex items-center gap-2 text-stone">
                  <FiUser size={15} />
                  <span>Author: <strong className="text-ink font-medium">{theme.author || "Unknown"}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-stone">
                  <FiFileText size={15} />
                  <span>License: <strong className="text-ink font-medium">{theme.license || "Unknown"}</strong></span>
                </div>
                {theme.homepage && (
                  <div className="flex items-center gap-2 text-stone sm:col-span-2">
                    <FiExternalLink size={15} />
                    <span>Homepage: <a href={theme.homepage} target="_blank" rel="noopener noreferrer" className="btn-text-link text-ink hover:underline font-medium">{theme.homepage}</a></span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Component Checklists */}
          <div className="card-flat">
            <div className="border-b border-hairline-soft pb-3 mb-4">
              <span className="type-micro-caps text-stone font-semibold">Visual Components Included</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(theme.components).map(([key, present]) => (
                <div 
                  key={key} 
                  className={`flex items-center justify-between p-3 border text-xs transition-colors duration-150 ${
                    present 
                      ? "bg-canvas border-hairline-soft text-ink" 
                      : "bg-canvas-warm border-hairline-soft/40 text-stone"
                  }`}
                >
                  <span className="capitalize font-medium">{key.replace('_', ' ')}</span>
                  {present ? (
                    <span className="monochrome-badge monochrome-badge-active text-[10px]">Active</span>
                  ) : (
                    <span className="type-micro-caps text-stone opacity-50 text-[10px]">None</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Dependencies checklist */}
        <div className="space-y-6">
          <div className="card-flat">
            <div className="border-b border-hairline-soft pb-3 mb-4">
              <span className="type-micro-caps text-stone font-semibold">Dependencies Check</span>
            </div>
            
            {theme.dependencies && theme.dependencies.items.length > 0 ? (
              <div className="space-y-4">
                <p className="type-meta text-stone">
                  Verify required system libraries, helper utilities, and font files:
                </p>
                <div className="space-y-2">
                  {theme.dependencies.items.map((dep) => (
                    <div 
                      key={dep.name} 
                      className={`flex items-center justify-between p-3 border text-xs ${
                        dep.installed 
                          ? "bg-canvas border-hairline-soft text-ink" 
                          : "bg-canvas-warm border-hairline-soft/40 text-stone"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-ink">{dep.name}</span>
                        <span className="type-micro-caps text-stone text-[10px] mt-0.5 tracking-wider">{dep.kind}</span>
                      </div>
                      {dep.installed ? (
                        <span className="text-ink flex items-center gap-0.5 font-semibold text-[11px]">
                          <FiCheck size={14} /> Met
                        </span>
                      ) : (
                        <span className="text-stone flex items-center gap-0.5 font-semibold text-[11px]">
                          <FiX size={14} /> Missing
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="type-body text-stone italic py-6 text-center">
                No dependencies specified for this theme.
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
