import React from "react";
import { Spinner } from "@heroui/react";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
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
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Spinner size="md" className="text-ink" />
        <span className="type-meta text-stone">Loading backups...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader 
        eyebrow="Configuration Rollback"
        title="Backups" 
        subtitle="Manage visual configuration snapshots. You can restore your desktop layout at any time." 
      />

      {backups?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-hairline-soft text-stone">
          <FiAlertTriangle size={32} className="text-stone mb-4" />
          <p className="type-body-strong text-ink">No backup snapshots found</p>
          <p className="type-meta text-stone mt-1">
            Backups are generated automatically when a new theme package is applied.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {backups?.map((snap) => (
            <div 
              key={snap.timestamp} 
              className={snap.is_current ? "card-featured" : "card-flat"}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="type-heading-sm text-ink flex items-center gap-2">
                      <FiClock className="text-stone shrink-0" size={16} />
                      {snap.timestamp}
                    </h3>
                    {snap.is_current && (
                      <span className="monochrome-badge monochrome-badge-active">Active configuration</span>
                    )}
                  </div>

                  <p className="type-meta text-stone">
                    Created: {new Date(snap.created_at).toLocaleString()}
                  </p>

                  <div className="flex flex-wrap gap-4 type-meta text-stone pt-2">
                    {snap.theme_applied && (
                      <span className="flex items-center gap-1.5">
                        <FiLayers size={13} className="text-stone" />
                        Theme: <span className="text-ink type-body-strong">{snap.theme_applied}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 truncate max-w-xs">
                      <FiSliders size={13} className="text-stone" />
                      Plasma Style: <span className="text-ink type-body-strong truncate">{snap.plasma_style || "None"}</span>
                    </span>
                    <span className="flex items-center gap-1.5 truncate max-w-xs">
                      <FiSliders size={13} className="text-stone" />
                      Color: <span className="text-ink type-body-strong truncate">{snap.color_scheme || "None"}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button 
                    variant="icon-danger"
                    onClick={() => handleDelete(snap.timestamp)}
                    disabled={restoreMutation.isPending || deleteMutation.isPending}
                    title="Permanently Delete Snapshot"
                    aria-label="Delete snapshot"
                  >
                    {deleteMutation.isPending && deleteMutation.variables === snap.timestamp ? (
                      <Spinner size="sm" className="text-ink" />
                    ) : (
                      <FiTrash2 size={16} />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => handleRestore(snap.timestamp)}
                    disabled={restoreMutation.isPending}
                  >
                    {restoreMutation.isPending && restoreMutation.variables === snap.timestamp ? (
                      <Spinner size="sm" className="text-ink" />
                    ) : (
                      <>
                        <FiCornerUpLeft size={14} />
                        <span>Restore Point</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default Backups;
