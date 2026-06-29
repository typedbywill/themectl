import React, { useState } from "react";
import { 
  Card, 
  Button, 
  Spinner, 
  Input,
  Modal,
  Chip
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
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <Spinner size="lg" color="accent" />
        <span className="text-sm text-gray-400">Loading repositories...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Repositories" 
        subtitle="Manage remote repository links containing pre-packaged theme indexes." 
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onPress={handleRefreshAll}
              isPending={refreshMutation.isPending}
              className="border border-[#7c3aed]/20 text-white"
            >
              <div className="flex items-center gap-1.5">
                <FiRefreshCw className={refreshMutation.isPending ? "animate-spin" : ""} />
                <span>Refresh Indexes</span>
              </div>
            </Button>
            <Button
              size="sm"
              className="bg-[#7c3aed] hover:bg-[#9333ea] text-white"
              onPress={() => setIsOpen(true)}
            >
              <div className="flex items-center gap-1.5">
                <FiPlus />
                <span>Add Repository</span>
              </div>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4">
        {sources?.map((src) => (
          <Card key={src.name} className="bg-[#111827] border border-[#1e293b] hover:border-gray-800 transition-all duration-150">
            <Card.Content className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white capitalize">{src.name}</h3>
                  {src.name === "official" && (
                    <Chip size="sm" color="success" variant="soft" className="border border-emerald-500/25">
                      <Chip.Label className="text-[10px] font-semibold uppercase">Official</Chip.Label>
                    </Chip>
                  )}
                </div>
                
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <FiLink size={13} className="shrink-0 text-gray-500" />
                  <span className="truncate">{src.url}</span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-0.5">
                  <span className="flex items-center gap-1">
                    <FiClock size={13} />
                    Last Refreshed: {src.last_refreshed ? new Date(src.last_refreshed).toLocaleString() : "Never"}
                  </span>
                  <span className="flex items-center gap-1">
                    <FiArchive size={13} />
                    Themes: <strong className="text-gray-300 font-semibold">{src.theme_count}</strong>
                  </span>
                </div>
              </div>

              {src.name !== "official" && (
                <Button
                  size="sm"
                  variant="danger-soft"
                  isIconOnly
                  onPress={() => handleRemove(src.name)}
                  isPending={removeMutation.isPending && removeMutation.variables === src.name}
                  className="shrink-0"
                >
                  <FiTrash2 size={16} />
                </Button>
              )}
            </Card.Content>
          </Card>
        ))}
      </div>

      {/* Add Source Modal */}
      <Modal.Backdrop isOpen={isOpen} onOpenChange={setIsOpen} className="dark">
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[450px] bg-[#111827] border border-[#1e293b] text-[#f3f4f6]">
            <Modal.CloseTrigger onPress={() => setIsOpen(false)} />
            <Modal.Header>
              <Modal.Heading>Add Repository Source</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="py-4 space-y-4">
              <p className="text-xs text-gray-400">
                Provide the index.json metadata URL of a custom repository server hosting themectl themes.
              </p>
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-gray-400 font-medium">Repository URL</span>
                  <Input
                    placeholder="https://example.com/themes/index.json"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-gray-400 font-medium">Identifier (Optional)</span>
                  <Input
                    placeholder="my-custom-repo"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer className="border-t border-[#1e293b]">
              <Button size="sm" variant="ghost" className="text-red-400 border-red-500/20 hover:bg-red-500/10" onPress={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button 
                size="sm" 
                className="bg-[#7c3aed] hover:bg-[#9333ea] text-white"
                onPress={handleAdd}
                isPending={addMutation.isPending}
                isDisabled={!newUrl}
              >
                Add Repository
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
};
export default Repositories;
