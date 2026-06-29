import React, { useState } from "react";
import { Spinner } from "@heroui/react";
import { PageHeader } from "../components/layout/PageHeader";
import { useAvailableThemes, useInstallTheme } from "../hooks/useThemes";
import { 
  FiSearch, 
  FiDownload, 
  FiCheck, 
  FiGlobe, 
  FiShield, 
  FiAlertTriangle 
} from "react-icons/fi";

export const Themes: React.FC = () => {
  const { data: themes, isLoading, refetch } = useAvailableThemes();
  const installMutation = useInstallTheme();
  const [search, setSearch] = useState("");

  const filteredThemes = themes?.filter(theme => {
    const term = search.toLowerCase();
    return (
      theme.name.toLowerCase().includes(term) ||
      theme.display_name?.toLowerCase().includes(term) ||
      theme.description?.toLowerCase().includes(term) ||
      theme.author?.toLowerCase().includes(term)
    );
  }) || [];

  const handleInstall = (themeName: string) => {
    installMutation.mutate({ source: themeName, force: true });
  };

  const getSignatureBadge = () => {
    return (
      <span className="monochrome-badge monochrome-badge-secondary gap-1">
        <FiShield size={12} />
        <span>Verified</span>
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Spinner size="md" className="text-ink" />
        <span className="type-meta text-stone">Loading theme catalog...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <PageHeader 
        eyebrow="Theme store"
        title="Discover Themes" 
        subtitle="Discover and download new visual configurations from your active repositories." 
        actions={
          <button 
            onClick={() => refetch()}
            className="btn-ghost"
          >
            Refresh Catalog
          </button>
        }
      />

      {/* Search and Filters */}
      <div className="w-full max-w-md relative flex items-center">
        <FiSearch className="text-stone absolute left-0 pointer-events-none" size={18} />
        <input
          type="text"
          placeholder="Search themes by name, author or tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-field-input pl-7"
        />
      </div>

      {filteredThemes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-hairline-soft text-stone">
          <FiAlertTriangle size={32} className="text-stone mb-4" />
          <p className="type-body-strong text-ink">No themes found</p>
          <p className="type-meta text-stone mt-1">Try refining your search terms or verify your repositories.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredThemes.map((theme) => (
            <div key={theme.name} className="card-flat group hover:border-stone transition-colors duration-150 justify-between min-h-[420px]">
              <div>
                {/* Image Placeholder */}
                <div className="media-thumbnail-placeholder bg-surface-cool border-b border-hairline-soft mb-5">
                  {theme.screenshots?.[0] ? (
                    <div 
                      className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-300 opacity-80" 
                      style={{ backgroundImage: `url(${theme.screenshots[0]})` }} 
                    />
                  ) : (
                    <span className="type-micro-caps text-stone opacity-60 tracking-wider font-semibold select-none">
                      {theme.display_name || theme.name}
                    </span>
                  )}
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    {getSignatureBadge()}
                    <span className="monochrome-badge monochrome-badge-outline">
                      v{theme.version}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="type-heading-sm text-ink group-hover:underline">
                    {theme.display_name || theme.name}
                  </h4>
                  <p className="type-meta text-stone">by {theme.author || "Unknown"}</p>
                  
                  <p className="type-body text-graphite line-clamp-3 leading-relaxed pt-2">
                    {theme.description || "No description provided."}
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-hairline-soft mt-6 flex items-center justify-between">
                <div className="flex items-center gap-1.5 type-meta text-stone">
                  <FiGlobe size={13} />
                  <span>{theme.source_name}</span>
                </div>

                {theme.is_installed ? (
                  <span className="monochrome-badge monochrome-badge-active gap-1">
                    <FiCheck size={13} />
                    <span>Installed</span>
                  </span>
                ) : (
                  <button
                    className="btn-primary"
                    onClick={() => handleInstall(theme.name)}
                    disabled={installMutation.isPending && installMutation.variables?.source === theme.name}
                  >
                    {installMutation.isPending && installMutation.variables?.source === theme.name ? (
                      <Spinner size="sm" className="text-on-primary" />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <FiDownload size={14} />
                        <span>Install</span>
                      </div>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default Themes;
