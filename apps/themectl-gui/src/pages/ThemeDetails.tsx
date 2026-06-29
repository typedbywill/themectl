import React from "react";
import { useParams, Link } from "react-router-dom";
import { 
  Button, 
  Spinner, 
  Card, 
  Chip
} from "@heroui/react";
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
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <Spinner size="lg" color="accent" />
        <span className="text-sm text-gray-400">Loading theme details...</span>
      </div>
    );
  }

  if (error || !theme) {
    return (
      <div className="space-y-4">
        <Link to="/installed" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white">
          <FiArrowLeft /> Back to Installed Themes
        </Link>
        <div className="text-red-400 text-sm py-4">
          Failed to load theme details: {String(error || "Theme not found")}
        </div>
      </div>
    );
  }

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
            <Chip.Label>Signature Verified</Chip.Label>
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
            <Chip.Label>Unsigned Package</Chip.Label>
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
            <Chip.Label>Invalid Signature</Chip.Label>
          </div>
        </Chip>
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/installed" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors duration-150">
          <FiArrowLeft /> Back to Installed Themes
        </Link>
      </div>

      <PageHeader 
        title={theme.display_name || theme.name} 
        subtitle={`Installed version: ${theme.version}`}
        actions={
          <Button
            size="sm"
            className="bg-[#7c3aed] hover:bg-[#9333ea] text-white font-medium"
            onPress={() => openPreviewModal(theme.name)}
          >
            <div className="flex items-center gap-1.5">
              <FiPlay size={14} />
              <span>Apply Theme</span>
            </div>
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info & Meta panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Card */}
          <Card className="bg-[#111827] border border-[#1e293b]">
            <Card.Content className="p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {getSignatureBadge(theme.signature_status)}
                {theme.is_applied && (
                  <Chip size="sm" color="accent" variant="soft" className="border border-[#7c3aed]/25">
                    <Chip.Label className="text-[#a78bfa]">Currently Applied</Chip.Label>
                  </Chip>
                )}
              </div>

              <div className="text-gray-300 text-sm leading-relaxed">
                {theme.description || "No description provided for this theme."}
              </div>

              <hr className="border-t border-[#1e293b]" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="flex items-center gap-2 text-gray-400">
                  <FiUser size={15} />
                  <span>Author: <strong className="text-white font-medium">{theme.author || "Unknown"}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <FiFileText size={15} />
                  <span>License: <strong className="text-white font-medium">{theme.license || "Unknown"}</strong></span>
                </div>
                {theme.homepage && (
                  <div className="flex items-center gap-2 text-gray-400 sm:col-span-2">
                    <FiExternalLink size={15} />
                    <span>Homepage: <a href={theme.homepage} target="_blank" rel="noopener noreferrer" className="text-[#a78bfa] hover:underline font-medium">{theme.homepage}</a></span>
                  </div>
                )}
              </div>
            </Card.Content>
          </Card>

          {/* Component Checklists */}
          <Card className="bg-[#111827] border border-[#1e293b]">
            <Card.Header className="border-b border-[#1e293b] px-5 py-4">
              <Card.Title className="text-sm font-semibold text-white uppercase tracking-wider">Visual Components Included</Card.Title>
            </Card.Header>
            <Card.Content className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(theme.components).map(([key, present]) => (
                  <div 
                    key={key} 
                    className={`flex items-center justify-between p-3 rounded-lg border text-xs ${
                      present 
                        ? "bg-[#1f2937]/20 border-[#374151]/50 text-gray-200" 
                        : "bg-gray-900/10 border-gray-800/50 text-gray-500"
                    }`}
                  >
                    <span className="capitalize font-medium">{key.replace('_', ' ')}</span>
                    {present ? (
                      <Chip size="sm" color="success" variant="soft" className="px-1 py-0 border border-emerald-500/25">
                        <Chip.Label className="text-[10px]">Active</Chip.Label>
                      </Chip>
                    ) : (
                      <span className="text-[10px] text-gray-600">None</span>
                    )}
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* System Dependencies checklist */}
        <div className="space-y-6">
          <Card className="bg-[#111827] border border-[#1e293b]">
            <Card.Header className="border-b border-[#1e293b] px-5 py-4">
              <Card.Title className="text-sm font-semibold text-white uppercase tracking-wider">Dependencies Check</Card.Title>
            </Card.Header>
            <Card.Content className="p-5 space-y-4">
              {theme.dependencies && theme.dependencies.items.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 mb-2">
                    Verify required system libraries, helper utilities, and font files:
                  </p>
                  <div className="space-y-2">
                    {theme.dependencies.items.map((dep) => (
                      <div 
                        key={dep.name} 
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                          dep.installed 
                            ? "bg-emerald-500/5 border-emerald-500/10 text-gray-300" 
                            : "bg-amber-500/5 border-amber-500/10 text-gray-400"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">{dep.name}</span>
                          <span className="text-[10px] text-gray-500 uppercase mt-0.5 tracking-wider">{dep.kind}</span>
                        </div>
                        {dep.installed ? (
                          <span className="text-emerald-400 flex items-center gap-0.5 font-semibold text-[11px]">
                            <FiCheck size={14} /> Met
                          </span>
                        ) : (
                          <span className="text-amber-500 flex items-center gap-0.5 font-semibold text-[11px]">
                            <FiX size={14} /> Missing
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-400 italic py-6 text-center">
                  No dependencies specified for this theme.
                </div>
              )}
            </Card.Content>
          </Card>
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
