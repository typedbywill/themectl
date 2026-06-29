import React, { useState, useEffect } from "react";
import { 
  Modal, 
  Spinner, 
  Checkbox, 
  CheckboxGroup 
} from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { useApplyTheme } from "../../hooks/useThemes";
import { FiCheckCircle, FiAlertTriangle, FiSliders } from "react-icons/fi";

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeName: string | null;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, onClose, themeName }) => {
  const applyMutation = useApplyTheme();
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [noBackup, setNoBackup] = useState(false);

  const { data: previewData, isLoading, error } = useQuery({
    queryKey: ["preview", themeName],
    queryFn: () => api.previewTheme(themeName!),
    enabled: !!themeName && isOpen,
  });

  useEffect(() => {
    if (previewData) {
      // Default to select all available changes
      setSelectedComponents(previewData.changes.map(c => c.component));
    }
  }, [previewData]);

  const handleApply = () => {
    if (!themeName) return;
    applyMutation.mutate({
      name: themeName,
      noBackup,
      components: selectedComponents.length > 0 ? selectedComponents : null
    }, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && onClose()} className="light">
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[500px] bg-canvas border border-hairline text-ink">
          <Modal.CloseTrigger onPress={onClose} className="text-stone hover:text-ink" />
          
          <Modal.Header>
            <Modal.Heading className="type-heading-sm text-ink font-semibold">Apply Theme: {themeName}</Modal.Heading>
          </Modal.Header>
          
          <Modal.Body className="py-6 space-y-5">
            {isLoading ? (
              <div className="flex flex-col items-center py-10 gap-3">
                <Spinner size="md" className="text-ink" />
                <span className="type-meta text-stone">Loading theme preview details...</span>
              </div>
            ) : error ? (
              <div className="text-red-500 type-body text-center py-6">
                Failed to load theme preview: {String(error)}
              </div>
            ) : previewData ? (
              <div className="space-y-5">
                {/* Changes list */}
                <div>
                  <h4 className="type-meta text-stone font-semibold mb-2">Applying this theme will change:</h4>
                  <div className="bg-canvas border border-hairline-soft p-3 space-y-2.5 max-h-48 overflow-y-auto">
                    {previewData.changes.map(c => (
                      <div key={c.component} className="flex items-start gap-2 type-meta">
                        <FiCheckCircle className="text-stone shrink-0 mt-0.5" size={14} />
                        <span className="text-graphite">
                          <strong className="text-ink capitalize">{c.component.replace('_', ' ')}:</strong> {c.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Missing dependencies */}
                {previewData.missing_deps.length > 0 && (
                  <div className="border border-hairline-soft p-4 bg-canvas-warm space-y-2">
                    <div className="flex items-center gap-1.5 type-meta text-stone font-semibold uppercase tracking-wider">
                      <FiAlertTriangle size={14} />
                      <span>Missing Optional Dependencies</span>
                    </div>
                    <p className="type-meta text-stone">
                      Some visual features may not work as expected because the following tools are not installed:
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {previewData.missing_deps.map(d => (
                        <span key={d.name} className="monochrome-badge monochrome-badge-outline text-[10px]">
                          {d.kind}: {d.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Component selection filter */}
                <div className="border-t border-hairline-soft pt-4">
                  <div className="flex items-center gap-1.5 type-meta font-semibold text-ink mb-3">
                    <FiSliders size={13} />
                    <span>Customize applied components</span>
                  </div>
                  <CheckboxGroup
                    value={selectedComponents}
                    onChange={setSelectedComponents}
                    className="flex flex-wrap gap-3"
                  >
                    {previewData.changes.map(c => (
                      <Checkbox key={c.component} value={c.component}>
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          <span className="capitalize type-meta text-ink">{c.component.replace('_', ' ')}</span>
                        </Checkbox.Content>
                      </Checkbox>
                    ))}
                  </CheckboxGroup>
                </div>

                {/* Backup configuration */}
                <div className="border-t border-hairline-soft pt-4 flex justify-between items-center type-meta">
                  <span className="text-stone">Create backup before applying?</span>
                  <Checkbox 
                    isSelected={!noBackup} 
                    onChange={(selected: boolean) => setNoBackup(!selected)}
                  >
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <span className="text-ink type-meta font-medium">Backup configuration</span>
                    </Checkbox.Content>
                  </Checkbox>
                </div>
              </div>
            ) : null}
          </Modal.Body>

          <Modal.Footer className="border-t border-hairline-soft pt-4 flex justify-end gap-2">
            <button className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button 
              className="btn-primary" 
              onClick={handleApply}
              disabled={isLoading || !previewData || selectedComponents.length === 0 || applyMutation.isPending}
            >
              {applyMutation.isPending ? (
                <Spinner size="sm" className="text-on-primary" />
              ) : (
                <span>Apply Theme</span>
              )}
            </button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
};
export default PreviewModal;
