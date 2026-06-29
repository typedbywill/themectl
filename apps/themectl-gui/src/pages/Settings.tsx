import React, { useState, useEffect } from "react";
import { 
  Card, 
  Button, 
  Spinner, 
  Input,
  Switch,
  Select,
  Label,
  ListBox
} from "@heroui/react";
import { PageHeader } from "../components/layout/PageHeader";
import { useSettings, useSaveSettings } from "../hooks/useSettings";
import { GuiSettings } from "../types";
import { FiSave, FiSliders, FiFolder } from "react-icons/fi";

export const Settings: React.FC = () => {
  const { data: settings, isLoading } = useSettings();
  const saveMutation = useSaveSettings();
  
  const [form, setForm] = useState<GuiSettings | null>(null);

  useEffect(() => {
    if (settings) {
      setForm({ ...settings });
    }
  }, [settings]);

  const handleSave = () => {
    if (form) {
      saveMutation.mutate(form);
    }
  };

  const updateField = <K extends keyof GuiSettings>(key: K, value: GuiSettings[K]) => {
    if (form) {
      setForm({ ...form, [key]: value });
    }
  };

  if (isLoading || !form) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <Spinner size="lg" color="accent" />
        <span className="text-sm text-gray-400">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader 
        title="Settings" 
        subtitle="Manage CLI directories, maximum backup limits, and package signature security policies." 
        actions={
          <Button
            size="sm"
            className="bg-[#7c3aed] hover:bg-[#9333ea] text-white font-medium"
            onPress={handleSave}
            isPending={saveMutation.isPending}
          >
            <div className="flex items-center gap-1.5">
              <FiSave />
              <span>Save Settings</span>
            </div>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6">
        {/* Directories Card */}
        <Card className="bg-[#111827] border border-[#1e293b]">
          <Card.Content className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <FiFolder size={16} className="text-gray-400" />
              CLI Storage Directories
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-gray-400 font-medium">Theme Directory</span>
                <Input
                  value={form.theme_directory}
                  disabled
                  className="opacity-70 cursor-not-allowed text-white"
                />
                <span className="text-[10px] text-gray-500 mt-0.5">Local package folder: ~/.local/share/themectl/themes/</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-gray-400 font-medium">Backup Directory</span>
                <Input
                  value={form.backup_directory}
                  disabled
                  className="opacity-70 cursor-not-allowed text-white"
                />
                <span className="text-[10px] text-gray-500 mt-0.5">Local configuration snapshot storage: ~/.local/share/themectl/backups/</span>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Configurations Card */}
        <Card className="bg-[#111827] border border-[#1e293b]">
          <Card.Content className="p-5 space-y-6">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
              <FiSliders size={16} className="text-gray-400" />
              General Preferences
            </h3>

            <div className="space-y-4">
              {/* Max Backups */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-gray-800/60 pb-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-white block">Maximum Backups</span>
                  <span className="text-[11px] text-gray-400 block">Rotate backups to delete oldest when limit is reached.</span>
                </div>
                <div className="w-28">
                  <Input
                    type="number"
                    value={String(form.max_backups)}
                    onChange={(e) => updateField("max_backups", parseInt(e.target.value) || 10)}
                  />
                </div>
              </div>

              {/* Switches list */}
              <div className="space-y-3.5 pt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-white block">Backup before apply</span>
                    <span className="text-[11px] text-gray-400 block">Create configuration snapshot automatically before applying theme changes.</span>
                  </div>
                  <Switch 
                    isSelected={form.auto_backup_before_apply}
                    onChange={(val) => updateField("auto_backup_before_apply", val)}
                  >
                    <Switch.Content>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch.Content>
                  </Switch>
                </div>

                <div className="flex items-center justify-between border-t border-gray-800/60 pt-3.5">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-white block">Auto remove old backups</span>
                    <span className="text-[11px] text-gray-400 block">Enable automatic rotation of configuration backups to respect limits.</span>
                  </div>
                  <Switch 
                    isSelected={form.auto_remove_old_backups}
                    onChange={(val) => updateField("auto_remove_old_backups", val)}
                  >
                    <Switch.Content>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch.Content>
                  </Switch>
                </div>

                <div className="flex items-center justify-between border-t border-gray-800/60 pt-3.5">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-white block">Auto refresh repositories</span>
                    <span className="text-[11px] text-gray-400 block">Periodically refresh local cache repository listings.</span>
                  </div>
                  <Switch 
                    isSelected={form.auto_refresh_repositories}
                    onChange={(val) => updateField("auto_refresh_repositories", val)}
                  >
                    <Switch.Content>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch.Content>
                  </Switch>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Security policy card */}
        <Card className="bg-[#111827] border border-[#1e293b]">
          <Card.Content className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-1.5 mb-2">
              🔒 Cryptographic Security Policies
            </h3>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
              <div className="space-y-0.5 max-w-md">
                <span className="text-xs font-semibold text-white block">Signature Policy</span>
                <span className="text-[11px] text-gray-400 block">
                  Define verification criteria for Ed25519 cryptography signatures on package installs.
                </span>
              </div>
              
              <div className="w-56">
                <Select
                  selectedKey={form.signature_policy}
                  onSelectionChange={(key) => {
                    const val = String(key) as 'warn' | 'allow' | 'require';
                    if (val) {
                      updateField("signature_policy", val);
                      updateField("allow_unsigned_themes", val !== "require");
                    }
                  }}
                  className="w-full text-white"
                  placeholder="Select policy"
                >
                  <Label className="text-white text-xs mb-1">Select policy</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox className="bg-[#111827] border border-[#1e293b] text-white">
                      <ListBox.Item id="allow" textValue="Allow (Silent)">
                        Allow (Silent)
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                      <ListBox.Item id="warn" textValue="Warn (Notify unsigned)">
                        Warn (Notify unsigned)
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                      <ListBox.Item id="require" textValue="Require (Blocked unless signed)">
                        Require (Blocked unless signed)
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-800/60 pt-3.5">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-white block">Allow unsigned themes</span>
                <span className="text-[11px] text-gray-400 block">Permit extraction and installation of theme packages lacking Ed25519 validation.</span>
              </div>
              <Switch 
                isSelected={form.allow_unsigned_themes}
                onChange={(val) => {
                  updateField("allow_unsigned_themes", val);
                  if (!val) {
                    updateField("signature_policy", "require");
                  }
                }}
                isDisabled={form.signature_policy === "require"}
              >
                <Switch.Content>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Content>
              </Switch>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};
export default Settings;
