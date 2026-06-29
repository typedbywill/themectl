import React, { useState, useEffect } from "react";
import { 
  Modal, 
  Button, 
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
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && onClose()} className="dark">
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[500px] bg-[#111827] border border-[#1e293b] text-[#f3f4f6]">
          <Modal.CloseTrigger onPress={onClose} />
          
          <Modal.Header>
            <Modal.Heading className="text-[#a78bfa] font-bold">Apply Theme: {themeName}</Modal.Heading>
          </Modal.Header>
          
          <Modal.Body className="py-4 space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <Spinner color="accent" />
                <span className="text-sm text-gray-400">Loading theme preview details...</span>
              </div>
            ) : error ? (
              <div className="text-red-400 text-sm text-center py-6">
                Failed to load theme preview: {String(error)}
              </div>
            ) : previewData ? (
              <div className="space-y-4">
                {/* Changes list */}
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2">Applying this theme will change:</h4>
                  <div className="bg-[#1f2937]/30 border border-[#374151]/30 rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto">
                    {previewData.changes.map(c => (
                      <div key={c.component} className="flex items-start gap-2 text-xs">
                        <FiCheckCircle className="text-emerald-400 shrink-0 mt-0.5" size={14} />
                        <span className="text-gray-300">
                          <strong className="text-white capitalize">{c.component.replace('_', ' ')}:</strong> {c.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Missing dependencies */}
                {previewData.missing_deps.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                      <FiAlertTriangle size={14} />
                      <span>Missing Optional Dependencies</span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Some visual features may not work as expected because the following tools are not installed:
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {previewData.missing_deps.map(d => (
                        <span key={d.name} className="px-2 py-0.5 rounded bg-amber-500/5 text-amber-300 border border-amber-500/15 text-[10px] capitalize">
                          {d.kind}: {d.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Component selection filter */}
                <div className="border-t border-[#1e293b] pt-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white mb-2">
                    <FiSliders size={13} />
                    <span>Customize applied components</span>
                  </div>
                  <CheckboxGroup
                    value={selectedComponents}
                    onChange={setSelectedComponents}
                    className="flex flex-wrap gap-2"
                  >
                    {previewData.changes.map(c => (
                      <Checkbox key={c.component} value={c.component}>
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          <span className="capitalize">{c.component.replace('_', ' ')}</span>
                        </Checkbox.Content>
                      </Checkbox>
                    ))}
                  </CheckboxGroup>
                </div>

                {/* Backup configuration */}
                <div className="border-t border-[#1e293b] pt-3 flex justify-between items-center text-xs">
                  <span className="text-gray-400">Create backup before applying?</span>
                  <Checkbox 
                    isSelected={!noBackup} 
                    onChange={(selected: boolean) => setNoBackup(!selected)}
                  >
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <span className="text-gray-300">Backup configuration</span>
                    </Checkbox.Content>
                  </Checkbox>
                </div>
              </div>
            ) : null}
          </Modal.Body>

          <Modal.Footer className="border-t border-[#1e293b]">
            <Button size="sm" variant="ghost" className="text-red-400 border-red-500/20 hover:bg-red-500/10" onPress={onClose}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              className="bg-[#7c3aed] hover:bg-[#9333ea] text-white" 
              onPress={handleApply}
              isPending={applyMutation.isPending}
              isDisabled={isLoading || !previewData || selectedComponents.length === 0}
            >
              Apply Theme
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
};
