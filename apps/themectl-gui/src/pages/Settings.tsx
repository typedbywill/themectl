import React, { useState, useEffect } from "react";
import { Spinner, Switch } from "@heroui/react";
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
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Spinner size="md" className="text-ink" />
        <span className="type-meta text-stone">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <PageHeader 
        eyebrow="Preferences"
        title="Settings" 
        subtitle="Manage CLI directories, maximum backup limits, and package signature security policies." 
        actions={
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Spinner size="sm" className="text-on-primary" />
            ) : (
              <div className="flex items-center gap-1.5">
                <FiSave />
                <span>Save Settings</span>
              </div>
            )}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6">
        {/* Directories Card */}
        <div className="card-flat">
          <div className="border-b border-hairline-soft pb-3 mb-4">
            <span className="type-micro-caps text-stone font-semibold flex items-center gap-1.5">
              <FiFolder size={15} />
              <span>CLI Storage Directories</span>
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="form-field-group">
              <span className="type-meta text-stone font-medium">Theme Directory</span>
              <input
                type="text"
                value={form.theme_directory}
                disabled
                className="form-field-input opacity-60 cursor-not-allowed"
              />
              <span className="type-meta text-stone mt-1">Local package folder: ~/.local/share/themectl/themes/</span>
            </div>
            <div className="form-field-group">
              <span className="type-meta text-stone font-medium">Backup Directory</span>
              <input
                type="text"
                value={form.backup_directory}
                disabled
                className="form-field-input opacity-60 cursor-not-allowed"
              />
              <span className="type-meta text-stone mt-1">Local configuration snapshot storage: ~/.local/share/themectl/backups/</span>
            </div>
          </div>
        </div>

        {/* Configurations Card */}
        <div className="card-flat">
          <div className="border-b border-hairline-soft pb-3 mb-4">
            <span className="type-micro-caps text-stone font-semibold flex items-center gap-1.5">
              <FiSliders size={15} />
              <span>General Preferences</span>
            </span>
          </div>

          <div className="space-y-6">
            {/* Max Backups */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-hairline-soft">
              <div className="space-y-0.5">
                <span className="type-body-strong text-ink block">Maximum Backups</span>
                <span className="type-meta text-stone block">Rotate backups to delete oldest when limit is reached.</span>
              </div>
              <div className="w-28">
                <input
                  type="number"
                  value={String(form.max_backups)}
                  onChange={(e) => updateField("max_backups", parseInt(e.target.value) || 10)}
                  className="form-field-input text-right"
                />
              </div>
            </div>

            {/* Switches list */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <span className="type-body-strong text-ink block">Backup before apply</span>
                  <span className="type-meta text-stone block">Create configuration snapshot automatically before applying theme changes.</span>
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

              <div className="flex items-center justify-between border-t border-hairline-soft pt-4 py-2">
                <div className="space-y-0.5">
                  <span className="type-body-strong text-ink block">Auto remove old backups</span>
                  <span className="type-meta text-stone block">Enable automatic rotation of configuration backups to respect limits.</span>
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

              <div className="flex items-center justify-between border-t border-hairline-soft pt-4 py-2">
                <div className="space-y-0.5">
                  <span className="type-body-strong text-ink block">Auto refresh repositories</span>
                  <span className="type-meta text-stone block">Periodically refresh local cache repository listings.</span>
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
        </div>

        {/* Security policy card */}
        <div className="card-flat">
          <div className="border-b border-hairline-soft pb-3 mb-4">
            <span className="type-micro-caps text-stone font-semibold">🔒 Cryptographic Security Policies</span>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3">
              <div className="space-y-0.5 max-w-md">
                <span className="type-body-strong text-ink block">Signature Policy</span>
                <span className="type-meta text-stone block">
                  Define verification criteria for Ed25519 cryptography signatures on package installs.
                </span>
              </div>
              
              <div className="w-56">
                <select
                  value={form.signature_policy}
                  onChange={(e) => {
                    const val = e.target.value as 'warn' | 'allow' | 'require';
                    if (val) {
                      updateField("signature_policy", val);
                      updateField("allow_unsigned_themes", val !== "require");
                    }
                  }}
                  className="form-field-input"
                >
                  <option value="allow">Allow (Silent)</option>
                  <option value="warn">Warn (Notify unsigned)</option>
                  <option value="require">Require (Blocked unless signed)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-hairline-soft pt-4 py-2">
              <div className="space-y-0.5">
                <span className="type-body-strong text-ink block">Allow unsigned themes</span>
                <span className="type-meta text-stone block">Permit extraction and installation of theme packages lacking Ed25519 validation.</span>
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
          </div>
        </div>
      </div>
    </div>
  );
};
export default Settings;
