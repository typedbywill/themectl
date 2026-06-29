import React from "react";
import { Spinner } from "@heroui/react";
import { CardSectionHeader } from "../components/ui/CardSectionHeader";
import { useDoctor } from "../hooks/useDoctor";
import { useTranslation } from "../hooks/useTranslation";
import { 
  FiCheckCircle, 
  FiXCircle, 
  FiLayers, 
  FiCpu, 
  FiTool,
  FiCheck,
  FiX
} from "react-icons/fi";

export const DoctorTab: React.FC = () => {
  const { t } = useTranslation();
  const { data: report, isLoading } = useDoctor();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Spinner size="md" className="text-ink" />
        <span className="type-meta text-stone">{t("doctor.loading")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="card-flat">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 flex items-center justify-center border border-hairline-soft rounded-full text-ink shrink-0">
                  <FiCpu size={22} />
                </div>
                <div>
                  <span className="type-micro-caps text-stone block">{t("doctor.profile")}</span>
                  <h3 className="type-heading-sm text-ink mt-1">{report?.desktop || "KDE Plasma"}</h3>
                  {report?.plasma_version && (
                    <p className="type-meta text-stone mt-1">{report.plasma_version}</p>
                  )}
                </div>
              </div>
              
              <hr className="md:hidden border-t border-hairline-soft w-full" />

              <div className="flex flex-col justify-center">
                <span className="type-micro-caps text-stone block">{t("doctor.distro")}</span>
                <span className="type-body-strong text-ink mt-1 capitalize block">
                  {report?.distros.join(", ") || "Linux Platform"}
                </span>
              </div>
            </div>
          </div>

          <div className="card-flat">
            <CardSectionHeader title={t("doctor.helpers")} icon={<FiTool size={15} />} />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 -mt-2">
              {report?.tools.map((tool) => (
                <div 
                  key={tool.name} 
                  className={`flex items-center justify-between p-3 border ${
                    tool.installed 
                      ? "bg-canvas border-hairline-soft text-ink" 
                      : "bg-canvas-warm border-hairline-soft/40 text-stone"
                  }`}
                >
                  <span className="font-mono type-meta">{tool.name}</span>
                  {tool.installed ? (
                    <span className="type-meta text-ink flex items-center gap-1">
                      <FiCheckCircle size={14} /> {t("doctor.installed")}
                    </span>
                  ) : (
                    <span className="type-meta text-stone flex items-center gap-1">
                      <FiXCircle size={14} /> {t("doctor.missing")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-flat">
            <CardSectionHeader title={t("doctor.checks")} icon={<FiLayers size={15} />} />
            <p className="type-meta text-stone truncate -mt-2 mb-4">
              {t("doctor.activeTheme")} <span className="text-ink type-body-strong">{report?.applied_theme || "None"}</span>
            </p>
            
            <div className="space-y-2">
              {report?.applied_theme ? (
                report.dependency_status.length > 0 ? (
                  <div className="space-y-2">
                    {report.dependency_status.map((dep) => (
                      <div 
                        key={dep.name} 
                        className={`flex items-center justify-between p-3 border ${
                          dep.installed 
                            ? "bg-canvas border-hairline-soft text-ink" 
                            : "bg-canvas-warm border-hairline-soft/40 text-stone"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="type-body-strong text-ink">{dep.name}</span>
                          <span className="type-micro-caps text-stone mt-0.5">{dep.kind}</span>
                        </div>
                        {dep.installed ? (
                          <span className="type-meta text-ink flex items-center gap-1">
                            <FiCheck size={13} /> {t("doctor.met")}
                          </span>
                        ) : (
                          <span className="type-meta text-stone flex items-center gap-1">
                            <FiX size={13} /> {t("doctor.missing")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="type-body text-stone italic text-center py-6">
                    {t("doctor.allMet")}
                  </div>
                )
              ) : (
                <div className="type-body text-stone italic text-center py-6">
                  {t("doctor.noActiveTheme")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorTab;
