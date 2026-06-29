import React from "react";
import { 
  Card, 
  Button, 
  Spinner, 
  Chip
} from "@heroui/react";
import { PageHeader } from "../components/layout/PageHeader";
import { useBackups, useRestoreBackup, useDeleteBackup } from "../hooks/useBackups";
import { 
  FiClock, 
  FiCornerUpLeft, 
  FiTrash2, 
  FiLayers,
  FiSliders,
  FiAlertTriangle
} from "react-icons/fi";

export const Backups: React.FC = () => {
  const { data: backups, isLoading } = useBackups();
  const restoreMutation = useRestoreBackup();
  const deleteMutation = useDeleteBackup();

  const handleRestore = (timestamp: string) => {
    if (confirm(`Are you sure you want to rollback desktop configuration to snapshot '${timestamp}'?`)) {
      restoreMutation.mutate(timestamp);
    }
  };

  const handleDelete = (timestamp: string) => {
    if (confirm(`Are you sure you want to permanently delete snapshot '${timestamp}'?`)) {
      deleteMutation.mutate(timestamp);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <Spinner size="lg" color="accent" />
        <span className="text-sm text-gray-400">Loading backups...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Backups" 
        subtitle="Manage visual configuration snapshots. You can restore your desktop layout at any time." 
      />

      {backups?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#111827]/40 rounded-2xl border border-dashed border-[#1e293b] text-gray-400">
          <FiAlertTriangle size={36} className="text-amber-500 mb-3" />
          <p className="text-sm font-semibold">No backup snapshots found</p>
          <p className="text-xs text-gray-500 mt-1">
            Backups are generated automatically when a new theme package is applied.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {backups?.map((snap) => (
            <Card 
              key={snap.timestamp} 
              className={`bg-[#111827] border ${snap.is_current ? "border-emerald-500/50" : "border-[#1e293b]"} hover:border-gray-800 transition-all duration-150`}
            >
              <Card.Content className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                      <FiClock className="text-gray-500 shrink-0" size={16} />
                      {snap.timestamp}
                    </h3>
                    {snap.is_current && (
                      <Chip 
                        size="sm" 
                        color="success" 
                        variant="soft"
                        className="border border-emerald-500/25 px-2"
                      >
                        <Chip.Label className="text-[10px] font-semibold uppercase">Active configuration</Chip.Label>
                      </Chip>
                    )}
                  </div>

                  <p className="text-xs text-gray-400">
                    Created: {new Date(snap.created_at).toLocaleString()}
                  </p>

                  <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-1">
                    {snap.theme_applied && (
                      <span className="flex items-center gap-1">
                        <FiLayers size={13} className="text-gray-600" />
                        Theme: <strong className="text-gray-300 font-medium">{snap.theme_applied}</strong>
                      </span>
                    )}
                    <span className="flex items-center gap-1 truncate max-w-xs">
                      <FiSliders size={13} className="text-gray-600" />
                      Plasma Style: <span className="text-gray-400 font-medium truncate">{snap.plasma_style || "None"}</span>
                    </span>
                    <span className="flex items-center gap-1 truncate max-w-xs">
                      <FiSliders size={13} className="text-gray-600" />
                      Color: <span className="text-gray-400 font-medium truncate">{snap.color_scheme || "None"}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <div title="Permanently Delete Snapshot">
                    <Button 
                      size="sm" 
                      variant="danger-soft" 
                      isIconOnly 
                      onPress={() => handleDelete(snap.timestamp)}
                      isPending={restoreMutation.isPending || deleteMutation.isPending}
                    >
                      <FiTrash2 size={16} />
                    </Button>
                  </div>

                  <Button
                    size="sm"
                    variant="secondary"
                    className="border border-[#7c3aed]/25"
                    onPress={() => handleRestore(snap.timestamp)}
                    isPending={restoreMutation.isPending && restoreMutation.variables === snap.timestamp}
                  >
                    <div className="flex items-center gap-1.5">
                      <FiCornerUpLeft size={14} />
                      <span>Restore Point</span>
                    </div>
                  </Button>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
export default Backups;
