import React, { useState } from "react";
import { 
  Spinner, 
  Modal
} from "@heroui/react";
import { PageHeader } from "../components/layout/PageHeader";
import { useSources, useAddSource, useRemoveSource, useRefreshSources } from "../hooks/useSources";
import { 
  FiTrash2, 
  FiRefreshCw, 
  FiPlus, 
  FiLink, 
  FiClock, 
  FiArchive 
} from "react-icons/fi";

export const Repositories: React.FC = () => {
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
        setNewUrl("");
        setNewName("");
        setIsOpen(false);
      }
    });
  };

  const handleRemove = (name: string) => {
    if (confirm(`Are you sure you want to remove repository source '${name}'?`)) {
      removeMutation.mutate(name);
    }
  };

  const handleRefreshAll = () => {
    refreshMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Spinner size="md" className="text-ink" />
        <span className="type-meta text-stone">Loading repositories...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <PageHeader 
        eyebrow="Configured Sources"
        title="Repositories" 
        subtitle="Manage remote repository links containing pre-packaged theme indexes." 
        actions={
          <div className="flex gap-2">
            <button
              onClick={handleRefreshAll}
              disabled={refreshMutation.isPending}
              className="btn-ghost"
            >
              <div className="flex items-center gap-1.5">
                <FiRefreshCw className={refreshMutation.isPending ? "animate-spin" : ""} />
                <span>Refresh Indexes</span>
              </div>
            </button>
            <button
              className="btn-primary"
              onClick={() => setIsOpen(true)}
            >
              <div className="flex items-center gap-1.5">
                <FiPlus />
                <span>Add Repository</span>
              </div>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6">
        {sources?.map((src) => (
          <div key={src.name} className="card-flat">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="type-heading-sm text-ink font-medium capitalize">{src.name}</h3>
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
                    Themes: <strong className="text-ink font-semibold">{src.theme_count}</strong>
                  </span>
                </div>
              </div>

              {src.name !== "official" && (
                <button
                  onClick={() => handleRemove(src.name)}
                  disabled={removeMutation.isPending && removeMutation.variables === src.name}
                  className="btn-ghost w-10 h-10 p-0 flex items-center justify-center rounded-full hover:border-red-500 hover:text-red-500 shrink-0 self-end sm:self-center"
                >
                  {removeMutation.isPending && removeMutation.variables === src.name ? (
                    <Spinner size="sm" className="text-ink" />
                  ) : (
                    <FiTrash2 size={16} />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Source Modal */}
      <Modal.Backdrop isOpen={isOpen} onOpenChange={setIsOpen} className="light">
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[450px] bg-canvas border border-hairline text-ink">
            <Modal.CloseTrigger onPress={() => setIsOpen(false)} className="text-stone hover:text-ink" />
            <Modal.Header>
              <Modal.Heading className="type-heading-sm text-ink font-medium">Add Repository Source</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="py-6 space-y-5">
              <p className="type-meta text-stone">
                Provide the index.json metadata URL of a custom repository server hosting themectl themes.
              </p>
              <div className="space-y-5">
                <div className="form-field-group">
                  <span className="type-meta text-stone font-medium">Repository URL</span>
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
                  <span className="type-meta text-stone font-medium">Identifier (Optional)</span>
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
              <button className="btn-ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleAdd}
                disabled={addMutation.isPending || !newUrl}
              >
                {addMutation.isPending ? (
                  <Spinner size="sm" className="text-on-primary" />
                ) : (
                  <span>Add Repository</span>
                )}
              </button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
};
export default Repositories;
