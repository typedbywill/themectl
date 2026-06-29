import React, { useState } from "react";
import { 
  Spinner, 
  Modal
} from "@heroui/react";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { useSources, useAddSource, useRemoveSource, useRefreshSources } from "../hooks/useSources";
import { useTranslation } from "../hooks/useTranslation";
import { 
  FiTrash2, 
  FiRefreshCw, 
  FiPlus, 
  FiLink, 
  FiClock, 
  FiArchive 
} from "react-icons/fi";
import { toast } from "sonner";

export const Repositories: React.FC = () => {
  const { t } = useTranslation();
  const { data: sources, isLoading } = useSources();
  const addMutation = useAddSource();
  const removeMutation = useRemoveSource();
  const refreshMutation = useRefreshSources();

  const [isOpen, setIsOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    if (!newUrl) return;
    addMutation.mutate({ 
      url: newUrl, 
      name: newName || undefined 
    }, {
      onSuccess: () => {
        toast.success(t("repositories.addSuccess"));
        setNewUrl("");
        setNewName("");
        setIsOpen(false);
      },
      onError: (err: any) => {
        toast.error(err?.message || "Failed to add source");
      }
    });
  };

  const handleRemove = (name: string) => {
    if (confirm(t("repositories.confirmDelete", { name }))) {
      removeMutation.mutate(name, {
        onSuccess: () => {
          toast.success(t("repositories.deleteSuccess"));
        },
        onError: (err: any) => {
          toast.error(err?.message || "Failed to delete source");
        }
      });
    }
  };

  const handleRefreshAll = () => {
    refreshMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Repositories refreshed successfully");
      },
      onError: (err: any) => {
        toast.error(err?.message || "Failed to refresh repositories");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Spinner size="md" className="text-ink" />
        <span className="type-meta text-stone">{t("repositories.loadingSources")}</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader 
        eyebrow={t("repositories.eyebrow")}
        title={t("repositories.title")} 
        subtitle={t("repositories.subtitle")} 
        actions={
          <>
            <Button
              variant="ghost"
              onClick={handleRefreshAll}
              disabled={refreshMutation.isPending}
            >
              <FiRefreshCw className={refreshMutation.isPending ? "animate-spin" : ""} />
              <span>{t("store.refresh")}</span>
            </Button>
            <Button variant="primary" onClick={() => setIsOpen(true)}>
              <FiPlus />
              <span>{t("repositories.addSource")}</span>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4">
        {sources?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-hairline-soft text-stone">
            <p className="type-body-strong text-ink">{t("repositories.noSources")}</p>
            <p className="type-meta text-stone mt-1 mb-5">{t("repositories.noSourcesDesc")}</p>
          </div>
        ) : (
          sources?.map((src) => (
            <div key={src.name} className="card-flat">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="type-heading-sm text-ink capitalize">{src.name}</h3>
                    {src.name === "official" && (
                      <span className="monochrome-badge monochrome-badge-active">Official</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5 type-meta text-stone">
                    <FiLink size={13} className="shrink-0 text-stone" />
                    <span className="truncate">{src.url}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 type-meta text-stone pt-1">
                    <span className="flex items-center gap-1.5">
                      <FiClock size={13} />
                      Last Refreshed: {src.last_refreshed ? new Date(src.last_refreshed).toLocaleString() : "Never"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FiArchive size={13} />
                      Themes: <span className="text-ink type-body-strong">{src.theme_count}</span>
                    </span>
                  </div>
                </div>

                {src.name !== "official" && (
                  <Button
                    variant="icon-danger"
                    onClick={() => handleRemove(src.name)}
                    disabled={removeMutation.isPending && removeMutation.variables === src.name}
                    className="self-end sm:self-center"
                    aria-label="Remove repository"
                  >
                    {removeMutation.isPending && removeMutation.variables === src.name ? (
                      <Spinner size="sm" className="text-ink" />
                    ) : (
                      <FiTrash2 size={16} />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal.Backdrop isOpen={isOpen} onOpenChange={setIsOpen} className="light">
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[450px] bg-canvas border border-hairline text-ink">
            <Modal.CloseTrigger onPress={() => setIsOpen(false)} className="text-stone hover:text-ink" />
            <Modal.Header>
              <Modal.Heading className="type-heading-sm text-ink">{t("repositories.addSource")}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="py-6 space-y-5">
              <p className="type-meta text-stone">
                Provide the index.json metadata URL of a custom repository server hosting themectl themes.
              </p>
              <div className="space-y-5">
                <div className="form-field-group">
                  <span className="type-meta text-stone">{t("repositories.sourceUrl")}</span>
                  <input
                    type="text"
                    placeholder="https://example.com/themes/index.json"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="form-field-input"
                    required
                  />
                </div>
                <div className="form-field-group">
                  <span className="type-meta text-stone">{t("repositories.sourceName")}</span>
                  <input
                    type="text"
                    placeholder="my-custom-repo"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="form-field-input"
                  />
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer className="border-t border-hairline-soft pt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button 
                variant="primary"
                onClick={handleAdd}
                disabled={addMutation.isPending || !newUrl}
              >
                {addMutation.isPending ? (
                  <Spinner size="sm" className="text-on-primary" />
                ) : (
                  <span>{t("repositories.addSource")}</span>
                )}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
};
export default Repositories;
