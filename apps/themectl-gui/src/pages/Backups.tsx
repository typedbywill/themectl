import React from "react";
import { Spinner } from "@heroui/react";
import { Button } from "../components/ui/Button";
import { CardSectionHeader } from "../components/ui/CardSectionHeader";
import { useBackups, useRestoreBackup, useDeleteBackup } from "../hooks/useBackups";
import { useTranslation } from "../hooks/useTranslation";
import {
  FiClock,
  FiCornerUpLeft,
  FiTrash2,
  FiLayers,
  FiAlertTriangle,
  FiCheckCircle,
  FiArchive,
} from "react-icons/fi";

export const BackupsTab: React.FC = () => {
  const { t } = useTranslation();
  const { data: backups, isLoading } = useBackups();
  const restoreMutation = useRestoreBackup();
  const deleteMutation = useDeleteBackup();

  const activeBackup = backups?.find((snap) => snap.is_current);
  const restorePoints = backups?.filter((snap) => !snap.is_current).length ?? 0;

  const handleRestore = (timestamp: string) => {
    if (confirm(t("backups.confirmRestore", { timestamp }))) {
      restoreMutation.mutate(timestamp);
    }
  };

  const handleDelete = (timestamp: string) => {
    if (confirm(t("backups.confirmDelete", { timestamp }))) {
      deleteMutation.mutate(timestamp);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Spinner size="md" className="text-ink" />
        <span className="type-meta text-stone">{t("backups.loading")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card-flat">
          <p className="type-micro-caps text-stone">{t("backups.total")}</p>
          <p className="stat-value text-ink mt-1">{backups?.length ?? 0}</p>
        </div>
        <div className="card-flat">
          <p className="type-micro-caps text-stone">{t("backups.points")}</p>
          <p className="stat-value text-ink mt-1">{restorePoints}</p>
          {activeBackup && (
            <p className="type-meta text-stone mt-2 truncate">
              {t("backups.active")}: <span className="text-ink">{activeBackup.timestamp}</span>
            </p>
          )}
        </div>
      </div>

      {backups?.length === 0 ? (
        <div className="empty-state text-stone py-12 border border-dashed border-hairline-soft flex flex-col items-center justify-center">
          <FiAlertTriangle size={32} className="text-stone mb-4" />
          <p className="type-body-strong text-ink">{t("backups.noBackups")}</p>
          <p className="type-meta text-stone mt-1 max-w-[28rem] text-center">
            {t("backups.noBackupsDesc")}
          </p>
        </div>
      ) : (
        <section className="space-y-4">
          <CardSectionHeader title={t("backups.history")} icon={<FiArchive size={12} />} />

          <div className="grid grid-cols-1 gap-4 -mt-2">
            {backups?.map((snap) => (
              <article
                key={snap.timestamp}
                className={snap.is_current ? "card-featured" : "card-flat"}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  <div className="space-y-4 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="type-heading-sm text-ink flex items-center gap-2 min-w-0">
                        <FiClock className="text-stone shrink-0" size={16} />
                        <span className="truncate">{snap.timestamp}</span>
                      </h3>
                      {snap.is_current ? (
                        <span className="monochrome-badge monochrome-badge-active gap-1">
                          <FiCheckCircle size={12} />
                          <span>{t("backups.activeConfig")}</span>
                        </span>
                      ) : (
                        <span className="monochrome-badge monochrome-badge-outline">
                          {t("backups.restorePoint")}
                        </span>
                      )}
                    </div>

                    <p className="type-meta text-stone">
                      {t("backups.created")} {new Date(snap.created_at).toLocaleString()}
                    </p>

                    {snap.theme_applied && (
                      <div className="type-meta text-stone bg-canvas-warm border border-hairline-soft p-3">
                        {t("backups.themeAtCapture")}{" "}
                        <span className="text-ink type-body-strong">{snap.theme_applied}</span>
                      </div>
                    )}

                    <div className="meta-grid">
                      <div className="meta-grid-item">
                        <span className="type-micro-caps text-stone block">{t("backups.plasmaStyle")}</span>
                        <span className="type-body-tight text-ink truncate block mt-1">
                          {snap.plasma_style || "None"}
                        </span>
                      </div>
                      <div className="meta-grid-item">
                        <span className="type-micro-caps text-stone block">{t("backups.colorScheme")}</span>
                        <span className="type-body-tight text-ink truncate block mt-1">
                          {snap.color_scheme || "None"}
                        </span>
                      </div>
                      <div className="meta-grid-item">
                        <span className="type-micro-caps text-stone block">{t("backups.iconTheme")}</span>
                        <span className="type-body-tight text-ink truncate block mt-1">
                          {snap.icon_theme || "None"}
                        </span>
                      </div>
                      <div className="meta-grid-item">
                        <span className="type-micro-caps text-stone block flex items-center gap-1">
                          <FiLayers size={11} />
                          {t("backups.components")}
                        </span>
                        <span className="type-body-tight text-ink block mt-1">
                          {t("backups.componentsCount", {
                            count: [snap.plasma_style, snap.color_scheme, snap.icon_theme].filter(Boolean).length
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-start lg:pt-1">
                    <Button
                      variant="icon-danger"
                      onClick={() => handleDelete(snap.timestamp)}
                      disabled={restoreMutation.isPending || deleteMutation.isPending}
                      title={t("backups.deleteTitle")}
                      aria-label="Delete snapshot"
                    >
                      {deleteMutation.isPending && deleteMutation.variables === snap.timestamp ? (
                        <Spinner size="sm" className="text-ink" />
                      ) : (
                        <FiTrash2 size={16} />
                      )}
                    </Button>

                    {!snap.is_current && (
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
                            <span>{t("common.apply")}</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default BackupsTab;
