import React, { useState } from "react";
import { Spinner } from "@heroui/react";
import { PageHeader } from "../components/layout/PageHeader";
import { useDoctor } from "../hooks/useDoctor";
import { 
  FiCheckCircle, 
  FiXCircle, 
  FiClipboard, 
  FiLayers, 
  FiCpu, 
  FiTool,
  FiCheck,
  FiX
} from "react-icons/fi";
import { api } from "../services/api";
import { toast } from "sonner";

export const Doctor: React.FC = () => {
  const { data: report, isLoading, refetch } = useDoctor();
  const [copying, setCopying] = useState(false);

  const handleCopyReport = async () => {
    try {
      setCopying(true);
      const text = await api.getDoctorReportText();
      await navigator.clipboard.writeText(text);
      toast.success("Doctor report copied to clipboard!");
    } catch (e: any) {
      toast.error(e?.message || e || "Failed to copy report");
    } finally {
      setCopying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Spinner size="md" className="text-ink" />
        <span className="type-meta text-stone">Running system diagnostics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <PageHeader 
        eyebrow="System Diagnostics"
        title="System Doctor" 
        subtitle="Diagnose system tools status, KDE utility paths, and active theme dependencies." 
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => refetch()}
              className="btn-ghost"
            >
              Re-run Diagnostics
            </button>
            <button
              className="btn-primary"
              onClick={handleCopyReport}
              disabled={copying}
            >
              <div className="flex items-center gap-1.5">
                <FiClipboard />
                <span>Copy Report</span>
              </div>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Core details & tool status */}
        <div className="lg:col-span-2 space-y-6">
          {/* System metadata */}
          <div className="card-flat">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 flex items-center justify-center border border-hairline-soft rounded-full text-ink shrink-0">
                  <FiCpu size={22} />
                </div>
                <div>
                  <span className="type-micro-caps text-stone font-semibold">System Profile</span>
                  <h3 className="type-heading-sm text-ink mt-0.5 font-medium">{report?.desktop || "KDE Plasma"}</h3>
                  {report?.plasma_version && (
                    <p className="type-meta text-stone mt-1">{report.plasma_version}</p>
                  )}
                </div>
              </div>
              
              <hr className="md:hidden border-t border-hairline-soft w-full" />

              <div className="flex flex-col justify-center">
                <span className="type-micro-caps text-stone font-semibold block">OS Distribution Details</span>
                <span className="type-body text-ink mt-1 font-semibold capitalize block">
                  {report?.distros.join(", ") || "Linux Platform"}
                </span>
              </div>
            </div>
          </div>

          {/* Tools status */}
          <div className="card-flat">
            <div className="border-b border-hairline-soft pb-3 mb-4">
              <span className="type-micro-caps text-stone font-semibold flex items-center gap-1.5">
                <FiTool size={15} />
                <span>Required Helper Utilities</span>
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {report?.tools.map((tool) => (
                <div 
                  key={tool.name} 
                  className={`flex items-center justify-between p-3 border ${
                    tool.installed 
                      ? "bg-canvas border-hairline-soft text-ink" 
                      : "bg-canvas-warm border-hairline-soft/40 text-stone"
                  }`}
                >
                  <span className="font-mono text-xs font-semibold">{tool.name}</span>
                  {tool.installed ? (
                    <span className="text-ink text-xs font-bold flex items-center gap-0.5">
                      <FiCheckCircle size={15} /> Installed
                    </span>
                  ) : (
                    <span className="text-stone text-xs font-bold flex items-center gap-0.5">
                      <FiXCircle size={15} /> Missing
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Applied theme dependencies check */}
        <div className="space-y-6">
          <div className="card-flat">
            <div className="border-b border-hairline-soft pb-3 mb-4 flex flex-col gap-1">
              <span className="type-micro-caps text-stone font-semibold flex items-center gap-1.5">
                <FiLayers size={15} />
                <span>Applied Theme Checks</span>
              </span>
              <span className="type-meta text-stone truncate max-w-full mt-1">
                Theme: <strong className="text-ink font-semibold">{report?.applied_theme || "None"}</strong>
              </span>
            </div>
            
            <div className="space-y-2">
              {report?.applied_theme ? (
                report.dependency_status.length > 0 ? (
                  <div className="space-y-2">
                    {report.dependency_status.map((dep) => (
                      <div 
                        key={dep.name} 
                        className={`flex items-center justify-between p-3 border text-xs ${
                          dep.installed 
                            ? "bg-canvas border-hairline-soft text-ink" 
                            : "bg-canvas-warm border-hairline-soft/40 text-stone"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-ink">{dep.name}</span>
                          <span className="type-micro-caps text-stone text-[10px] mt-0.5">{dep.kind}</span>
                        </div>
                        {dep.installed ? (
                          <span className="text-ink flex items-center gap-0.5 font-semibold text-[11px]">
                            <FiCheck size={13} /> Met
                          </span>
                        ) : (
                          <span className="text-stone flex items-center gap-0.5 font-semibold text-[11px]">
                            <FiX size={13} /> Missing
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="type-body text-stone italic text-center py-6">
                    All applied theme dependencies are met!
                  </div>
                )
              ) : (
                <div className="type-body text-stone italic text-center py-6">
                  No active theme package applied to verify dependencies.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Doctor;
