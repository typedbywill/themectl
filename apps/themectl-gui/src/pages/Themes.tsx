import React, { useMemo, useState } from "react";
import { Spinner } from "@heroui/react";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { CardSectionHeader } from "../components/ui/CardSectionHeader";
import { SearchInput } from "../components/ui/SearchInput";
import { useAvailableThemes, useInstallTheme } from "../hooks/useThemes";
import {
  FiDownload,
  FiCheck,
  FiGlobe,
  FiShield,
  FiAlertTriangle,
  FiPackage,
} from "react-icons/fi";

function formatBytes(bytes: number | null): string | null {
  if (bytes == null || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const Themes: React.FC = () => {
  const { data: themes, isLoading, refetch } = useAvailableThemes();
  const installMutation = useInstallTheme();
  const [search, setSearch] = useState("");

  const filteredThemes = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!themes) return [];
    if (!term) return themes;

    return themes.filter((theme) =>
      theme.name.toLowerCase().includes(term) ||
      theme.display_name?.toLowerCase().includes(term) ||
      theme.description?.toLowerCase().includes(term) ||
      theme.author?.toLowerCase().includes(term) ||
      theme.source_name.toLowerCase().includes(term),
    );
  }, [themes, search]);

  const installedCount = themes?.filter((t) => t.is_installed).length ?? 0;
  const sourceCount = new Set(themes?.map((t) => t.source_name)).size;

  const handleInstall = (themeName: string) => {
    installMutation.mutate({ source: themeName, force: true });
  };

  const getSignatureBadge = () => (
    <span className="monochrome-badge monochrome-badge-secondary gap-1">
      <FiShield size={12} />
      <span>Verified</span>
    </span>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Spinner size="md" className="text-ink" />
        <span className="type-meta text-stone">Loading theme catalog...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="Theme store"
        title="Discover Themes"
        subtitle="Discover and download new visual configurations from your active repositories."
        actions={
          <Button variant="ghost" onClick={() => refetch()}>
            Refresh Catalog
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card-flat">
          <p className="type-micro-caps text-stone">Available</p>
          <p className="stat-value text-ink mt-1">{themes?.length ?? 0}</p>
        </div>
        <div className="card-flat">
          <p className="type-micro-caps text-stone">Installed</p>
          <p className="stat-value text-ink mt-1">{installedCount}</p>
        </div>
        <div className="card-flat">
          <p className="type-micro-caps text-stone">Sources</p>
          <p className="stat-value text-ink mt-1">{sourceCount}</p>
        </div>
      </div>

      <section className="space-y-6">
        <div className="flex flex-col gap-4 border-b border-hairline-soft pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="form-field-group flex-1 min-w-0 sm:max-w-[28rem]">
            <label htmlFor="theme-search" className="type-meta text-stone">
              Search catalog
            </label>
            <SearchInput
              id="theme-search"
              value={search}
              onChange={setSearch}
              placeholder="Name, author, description or source..."
            />
          </div>
          <p className="type-meta text-stone shrink-0 pb-1">
            {filteredThemes.length} of {themes?.length ?? 0} themes
          </p>
        </div>

        {filteredThemes.length === 0 ? (
          <div className="empty-state text-stone">
            <FiAlertTriangle size={32} className="text-stone mb-4" />
            <p className="type-body-strong text-ink">No themes found</p>
            <p className="type-meta text-stone mt-1 max-w-[24rem]">
              {search
                ? "Try different search terms or clear the filter."
                : "Verify your repositories are configured and refreshed."}
            </p>
            {search && (
              <Button variant="ghost" onClick={() => setSearch("")} className="mt-5">
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <>
            <CardSectionHeader title="Catalog" icon={<FiPackage size={12} />} />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 -mt-2">
              {filteredThemes.map((theme) => {
                const sizeLabel = formatBytes(theme.size_bytes);

                return (
                  <article
                    key={`${theme.source_name}-${theme.name}`}
                    className="card-flat group hover:border-stone transition-colors duration-150"
                  >
                    <div className="media-thumbnail-placeholder bg-surface-cool border-b border-hairline-soft mb-5">
                      {theme.screenshots?.[0] ? (
                        <div
                          className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-300 opacity-80"
                          style={{ backgroundImage: `url(${theme.screenshots[0]})` }}
                        />
                      ) : (
                        <span className="type-micro-caps text-stone opacity-60 tracking-wider select-none px-4 text-center">
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

                    <div className="space-y-2 flex-1">
                      <h4 className="type-heading-sm text-ink group-hover:underline">
                        {theme.display_name || theme.name}
                      </h4>
                      <p className="type-meta text-stone">by {theme.author || "Unknown"}</p>
                      <p className="type-body text-graphite line-clamp-3 pt-1">
                        {theme.description || "No description provided."}
                      </p>
                    </div>

                    <div className="theme-card-footer">
                      <div className="flex flex-col gap-0.5 type-meta text-stone min-w-0">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <FiGlobe size={13} className="shrink-0" />
                          <span className="truncate">{theme.source_name}</span>
                        </span>
                        {sizeLabel && <span className="text-stone/80">{sizeLabel}</span>}
                      </div>

                      {theme.is_installed ? (
                        <span className="monochrome-badge monochrome-badge-active gap-1 shrink-0">
                          <FiCheck size={13} />
                          <span>Installed</span>
                        </span>
                      ) : (
                        <Button
                          variant="primary"
                          onClick={() => handleInstall(theme.name)}
                          disabled={
                            installMutation.isPending &&
                            installMutation.variables?.source === theme.name
                          }
                          className="shrink-0"
                        >
                          {installMutation.isPending &&
                          installMutation.variables?.source === theme.name ? (
                            <Spinner size="sm" className="text-on-primary" />
                          ) : (
                            <>
                              <FiDownload size={14} />
                              <span>Install</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
};
export default Themes;
