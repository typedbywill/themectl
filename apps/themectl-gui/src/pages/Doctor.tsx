import React, { useState } from "react";
import { 
  Card, 
  Button, 
  Spinner 
} from "@heroui/react";
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
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <Spinner size="lg" color="accent" />
        <span className="text-sm text-gray-400">Running system diagnostics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="System Doctor" 
        subtitle="Diagnose system tools status, KDE utility paths, and active theme dependencies." 
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onPress={() => refetch()}
              className="border border-gray-800"
            >
              Re-run Diagnostics
            </Button>
            <Button
              size="sm"
              className="bg-[#7c3aed] hover:bg-[#9333ea] text-white"
              onPress={handleCopyReport}
              isPending={copying}
            >
              <div className="flex items-center gap-1.5">
                <FiClipboard />
                <span>Copy Report</span>
              </div>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core details & tool status */}
        <div className="lg:col-span-2 space-y-6">
          {/* System metadata */}
          <Card className="bg-[#111827] border border-[#1e293b]">
            <Card.Content className="p-5 flex flex-col md:flex-row gap-6 justify-between">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-[#7c3aed]/10 text-[#a78bfa] rounded-xl mt-1 shrink-0">
                  <FiCpu size={22} />
                </div>
                <div>
                  <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">System Profile</span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{report?.desktop || "KDE Plasma"}</h3>
                  {report?.plasma_version && (
                    <p className="text-xs text-gray-400 mt-1">{report.plasma_version}</p>
                  )}
                </div>
              </div>
              
              <hr className="md:hidden border-t border-[#1e293b]" />

              <div className="flex flex-col justify-center">
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block">OS Distribution Details</span>
                <span className="text-sm font-semibold text-gray-200 mt-1 capitalize block">
                  {report?.distros.join(", ") || "Linux Platform"}
                </span>
              </div>
            </Card.Content>
          </Card>

          {/* Tools status */}
          <Card className="bg-[#111827] border border-[#1e293b]">
            <Card.Header className="border-b border-[#1e293b] px-5 py-4">
              <Card.Title className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                <FiTool size={16} className="text-gray-400" />
                Required Helper Utilities
              </Card.Title>
            </Card.Header>
            <Card.Content className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {report?.tools.map((tool) => (
                  <div 
                    key={tool.name} 
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      tool.installed 
                        ? "bg-[#1f2937]/10 border-gray-800/60 text-gray-200" 
                        : "bg-red-500/5 border-red-500/10 text-gray-400"
                    }`}
                  >
                    <span className="font-mono text-xs font-semibold">{tool.name}</span>
                    {tool.installed ? (
                      <span className="text-emerald-400 text-xs font-bold flex items-center gap-0.5">
                        <FiCheckCircle size={15} /> Installed
                      </span>
                    ) : (
                      <span className="text-red-400 text-xs font-bold flex items-center gap-0.5">
                        <FiXCircle size={15} /> Missing
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Applied theme dependencies check */}
        <div className="space-y-6">
          <Card className="bg-[#111827] border border-[#1e293b]">
            <Card.Header className="border-b border-[#1e293b] px-5 py-4 flex flex-col items-start gap-1">
              <Card.Title className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                <FiLayers size={16} className="text-gray-400" />
                Applied Theme Checks
              </Card.Title>
              <Card.Description className="text-xs text-gray-400 truncate max-w-full">
                Theme: <strong className="text-[#a78bfa]">{report?.applied_theme || "None"}</strong>
              </Card.Description>
            </Card.Header>
            <Card.Content className="p-5 space-y-4">
              {report?.applied_theme ? (
                report.dependency_status.length > 0 ? (
                  <div className="space-y-2">
                    {report.dependency_status.map((dep) => (
                      <div 
                        key={dep.name} 
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                          dep.installed 
                            ? "bg-emerald-500/5 border-emerald-500/10" 
                            : "bg-amber-500/5 border-amber-500/10"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">{dep.name}</span>
                          <span className="text-[10px] text-gray-500 uppercase mt-0.5">{dep.kind}</span>
                        </div>
                        {dep.installed ? (
                          <span className="text-emerald-400 flex items-center gap-0.5 font-semibold text-[11px]">
                            <FiCheck size={13} /> Met
                          </span>
                        ) : (
                          <span className="text-amber-500 flex items-center gap-0.5 font-semibold text-[11px]">
                            <FiX size={13} /> Missing
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 italic text-center py-6">
                    All applied theme dependencies are met!
                  </div>
                )
              ) : (
                <div className="text-xs text-gray-400 italic text-center py-6">
                  No active theme package applied to verify dependencies.
                </div>
              )}
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  );
};
export default Doctor;
