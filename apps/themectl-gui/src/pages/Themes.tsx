import React, { useState } from "react";
import { 
  Input, 
  Card, 
  Button, 
  Spinner, 
  Chip 
} from "@heroui/react";
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
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <Spinner size="lg" color="accent" />
        <span className="text-sm text-gray-400">Loading theme store...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Theme Store" 
        subtitle="Discover and download new visual configurations from your active repositories." 
        actions={
          <Button 
            size="sm" 
            variant="secondary" 
            onPress={() => refetch()}
            className="border border-[#7c3aed]/20"
          >
            Refresh Catalog
          </Button>
        }
      />

      {/* Search and Filters */}
      <div className="w-full max-w-md relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
          <FiSearch className="text-gray-400" />
        </div>
        <Input
          placeholder="Search themes by name, author or tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-[#111827] border-[#1e293b] text-white"
        />
      </div>

      {filteredThemes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#111827]/40 rounded-2xl border border-dashed border-[#1e293b] text-gray-400">
          <FiAlertTriangle size={36} className="text-amber-500 mb-3" />
          <p className="text-sm font-semibold">No themes found</p>
          <p className="text-xs text-gray-500 mt-1">Try refining your search terms or verify your repositories.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredThemes.map((theme) => (
            <Card key={theme.name} className="bg-[#111827] border border-[#1e293b] group hover:border-[#7c3aed]/50 transition-all duration-200 flex flex-col justify-between">
              <div>
                {/* Image Placeholder */}
                <div className="h-40 w-full bg-gradient-to-br from-indigo-950 via-[#111827] to-slate-900 flex items-center justify-center border-b border-[#1e293b] relative overflow-hidden">
                  <div className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-300 opacity-60" style={{ backgroundImage: theme.screenshots?.[0] ? `url(${theme.screenshots[0]})` : undefined }} />
                  {!theme.screenshots?.[0] && (
                    <span className="text-[#a78bfa] font-bold text-lg opacity-40 select-none tracking-widest uppercase">
                      {theme.display_name || theme.name}
                    </span>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1.5 font-sans">
                    {getSignatureBadge()}
                    <Chip size="sm" variant="soft" color="default" className="border border-gray-700/50">
                      <Chip.Label>v{theme.version}</Chip.Label>
                    </Chip>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <h4 className="text-base font-bold text-white group-hover:text-[#a78bfa] transition-colors duration-150">
                      {theme.display_name || theme.name}
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">by {theme.author || "Unknown"}</p>
                  </div>
                  
                  <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed min-h-[48px]">
                    {theme.description || "No description provided."}
                  </p>
                </div>
              </div>

              <Card.Footer className="p-4 border-t border-[#1e293b] flex items-center justify-between bg-gray-900/10">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <FiGlobe size={13} />
                  <span>{theme.source_name}</span>
                </div>

                {theme.is_installed ? (
                  <Chip 
                    size="sm" 
                    variant="soft" 
                    color="success" 
                    className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold"
                  >
                    <div className="flex items-center gap-1">
                      <FiCheck size={13} />
                      <Chip.Label>Installed</Chip.Label>
                    </div>
                  </Chip>
                ) : (
                  <Button
                    size="sm"
                    className="bg-[#7c3aed] hover:bg-[#9333ea] text-white font-medium"
                    onPress={() => handleInstall(theme.name)}
                    isPending={installMutation.isPending && installMutation.variables?.source === theme.name}
                  >
                    <div className="flex items-center gap-1.5">
                      <FiDownload size={14} />
                      <span>Install</span>
                    </div>
                  </Button>
                )}
              </Card.Footer>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
export default Themes;
