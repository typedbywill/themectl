import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Spinner, Switch } from "@heroui/react";
import { PageHeader } from "../components/layout/PageHeader";
import { CardSectionHeader } from "../components/ui/CardSectionHeader";
import { Button } from "../components/ui/Button";
import { useSettings, useSaveSettings } from "../hooks/useSettings";
import { useDoctor } from "../hooks/useDoctor";
import { useTranslation } from "../hooks/useTranslation";
import { GuiSettings } from "../types";
import { api } from "../services/api";
import { toast } from "sonner";
import { BackupsTab } from "./Backups";
import { DoctorTab } from "./Doctor";
import { 
  FiSave, 
  FiSliders, 
  FiFolder, 
  FiBriefcase, 
  FiCpu, 
  FiClipboard 
} from "react-icons/fi";

export const Settings: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'general' | 'backups' | 'doctor'>('general');
  
  const { data: settings, isLoading } = useSettings();
  const saveMutation = useSaveSettings();
  const { refetch: refetchDoctor } = useDoctor();
  const [copyingReport, setCopyingReport] = useState(false);
  
  const [form, setForm] = useState<GuiSettings | null>(null);

  useEffect(() => {
    if (settings) {
      setForm({ ...settings });
    }
  }, [settings]);

  useEffect(() => {
    const state = location.state as { tab?: 'general' | 'backups' | 'doctor' } | null;
    if (state?.tab && ['general', 'backups', 'doctor'].includes(state.tab)) {
      setActiveTab(state.tab);
    }
  }, [location]);

  const handleSave = () => {
    if (form) {
      saveMutation.mutate(form, {
        onSuccess: () => {
          toast.success(t("settings.general.saveSuccess"));
        },
        onError: (err: any) => {
          toast.error(err?.message || t("settings.general.saveFailed"));
        }
      });
    }
  };

  const handleCopyReport = async () => {
    try {
      setCopyingReport(true);
      const text = await api.getDoctorReportText();
      await navigator.clipboard.writeText(text);
      toast.success(t("doctor.copySuccess"));
    } catch (e: any) {
      toast.error(e?.message || t("doctor.copyFailed"));
    } finally {
      setCopyingReport(false);
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
        <span className="type-meta text-stone">{t("settings.loadingSettings")}</span>
      </div>
    );
  }

  const getHeaderDetails = () => {
    switch (activeTab) {
      case "general":
        return {
          eyebrow: t("settings.eyebrow"),
          title: t("settings.title"),
          subtitle: t("settings.subtitle"),
          actions: (
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Spinner size="sm" className="text-on-primary" />
              ) : (
                <>
                  <FiSave />
                  <span>{t("settings.saveBtn")}</span>
                </>
              )}
            </Button>
          )
        };
      case "backups":
        return {
          eyebrow: t("backups.eyebrow"),
          title: t("backups.title"),
          subtitle: t("backups.subtitle"),
          actions: null
        };
      case "doctor":
        return {
          eyebrow: t("doctor.eyebrow"),
          title: t("doctor.title"),
          subtitle: t("doctor.subtitle"),
          actions: (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => refetchDoctor()}>
                {t("doctor.rerun")}
              </Button>
              <Button
                variant="primary"
                onClick={handleCopyReport}
                disabled={copyingReport}
              >
                <FiClipboard />
                <span>{t("doctor.copy")}</span>
              </Button>
            </div>
          )
        };
    }
  };

  const header = getHeaderDetails();

  return (
    <div className="page-container">
      <PageHeader 
        eyebrow={header.eyebrow}
        title={header.title} 
        subtitle={header.subtitle} 
        actions={header.actions}
      />

      {/* Tabs navigation */}
      <div className="flex border-b border-hairline-soft mb-6 -mt-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2.5 font-medium text-sm flex items-center gap-2 border-b-2 -mb-[2px] transition-all cursor-pointer ${
            activeTab === 'general' ? 'border-primary text-ink' : 'border-transparent text-stone hover:text-ink'
          }`}
        >
          <FiSliders size={15} />
          <span>{t("settings.tabs.general")}</span>
        </button>
        <button
          onClick={() => setActiveTab('backups')}
          className={`px-4 py-2.5 font-medium text-sm flex items-center gap-2 border-b-2 -mb-[2px] transition-all cursor-pointer ${
            activeTab === 'backups' ? 'border-primary text-ink' : 'border-transparent text-stone hover:text-ink'
          }`}
        >
          <FiBriefcase size={15} />
          <span>{t("settings.tabs.backups")}</span>
        </button>
        <button
          onClick={() => setActiveTab('doctor')}
          className={`px-4 py-2.5 font-medium text-sm flex items-center gap-2 border-b-2 -mb-[2px] transition-all cursor-pointer ${
            activeTab === 'doctor' ? 'border-primary text-ink' : 'border-transparent text-stone hover:text-ink'
          }`}
        >
          <FiCpu size={15} />
          <span>{t("settings.tabs.doctor")}</span>
        </button>
      </div>

      <div className="mt-4">
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 gap-4 max-w-4xl">
            <div className="card-flat">
              <CardSectionHeader title={t("settings.general.storageTitle")} icon={<FiFolder size={15} />} />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 -mt-2">
                <div className="form-field-group">
                  <span className="type-meta text-stone">{t("settings.general.themeDir")}</span>
                  <input
                    type="text"
                    value={form.theme_directory}
                    disabled
                    className="form-field-input opacity-60 cursor-not-allowed"
                  />
                  <span className="type-meta text-stone mt-1">{t("settings.general.themeDirDesc")}</span>
                </div>
                <div className="form-field-group">
                  <span className="type-meta text-stone">{t("settings.general.backupDir")}</span>
                  <input
                    type="text"
                    value={form.backup_directory}
                    disabled
                    className="form-field-input opacity-60 cursor-not-allowed"
                  />
                  <span className="type-meta text-stone mt-1">{t("settings.general.backupDirDesc")}</span>
                </div>
              </div>
            </div>

            <div className="card-flat">
              <CardSectionHeader title={t("settings.general.prefTitle")} icon={<FiSliders size={15} />} />

              <div className="space-y-6 -mt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-hairline-soft">
                  <div className="space-y-0.5">
                    <span className="type-body-strong text-ink block">{t("settings.general.maxBackups")}</span>
                    <span className="type-meta text-stone block">{t("settings.general.maxBackupsDesc")}</span>
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

                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between py-2">
                    <div className="space-y-0.5">
                      <span className="type-body-strong text-ink block">{t("settings.general.backupBeforeApply")}</span>
                      <span className="type-meta text-stone block">{t("settings.general.backupBeforeApplyDesc")}</span>
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
                      <span className="type-body-strong text-ink block">{t("settings.general.autoRemoveOld")}</span>
                      <span className="type-meta text-stone block">{t("settings.general.autoRemoveOldDesc")}</span>
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
                      <span className="type-body-strong text-ink block">{t("settings.general.autoRefresh")}</span>
                      <span className="type-meta text-stone block">{t("settings.general.autoRefreshDesc")}</span>
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

            <div className="card-flat">
              <CardSectionHeader title={t("settings.general.cryptoTitle")} />

              <div className="space-y-6 -mt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3">
                  <div className="space-y-0.5 max-w-md">
                    <span className="type-body-strong text-ink block">{t("settings.general.sigPolicy")}</span>
                    <span className="type-meta text-stone block">
                      {t("settings.general.sigPolicyDesc")}
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
                      <option value="allow">{t("settings.general.sigAllowSilent")}</option>
                      <option value="warn">{t("settings.general.sigWarnNotify")}</option>
                      <option value="require">{t("settings.general.sigRequireBlocked")}</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-hairline-soft pt-4 py-2">
                  <div className="space-y-0.5">
                    <span className="type-body-strong text-ink block">{t("settings.general.allowUnsigned")}</span>
                    <span className="type-meta text-stone block">{t("settings.general.allowUnsignedDesc")}</span>
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
        )}

        {activeTab === 'backups' && <BackupsTab />}

        {activeTab === 'doctor' && <DoctorTab />}
      </div>
    </div>
  );
};

export default Settings;
