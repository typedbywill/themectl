import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { toast } from "sonner";

export const useInstalledThemes = () => {
  return useQuery({
    queryKey: ["installed-themes"],
    queryFn: api.listInstalledThemes,
  });
};

export const useAvailableThemes = () => {
  return useQuery({
    queryKey: ["available-themes"],
    queryFn: api.listAvailableThemes,
  });
};

export const useThemeDetails = (name: string) => {
  return useQuery({
    queryKey: ["theme", name],
    queryFn: () => api.getThemeDetails(name),
    enabled: !!name,
  });
};

export const useInstallTheme = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ source, force }: { source: string; force: boolean }) => 
      api.installTheme(source, force),
    onSuccess: (data) => {
      toast.success(data || "Theme installed successfully!");
      queryClient.invalidateQueries({ queryKey: ["installed-themes"] });
      queryClient.invalidateQueries({ queryKey: ["available-themes"] });
    },
    onError: (error: any) => {
      toast.error(error?.message || error || "Failed to install theme");
    }
  });
};

export const useApplyTheme = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, noBackup, components }: { name: string; noBackup: boolean; components: string[] | null }) => 
      api.applyTheme(name, noBackup, components),
    onSuccess: (data) => {
      toast.success(`Theme applied successfully!`);
      if (data.backup_timestamp) {
        toast.info(`Backup created: ${data.backup_timestamp}`);
      }
      if (data.warnings && data.warnings.length > 0) {
        data.warnings.forEach(w => toast.warning(w));
      }
      queryClient.invalidateQueries({ queryKey: ["installed-themes"] });
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      queryClient.invalidateQueries({ queryKey: ["doctor"] });
    },
    onError: (error: any) => {
      toast.error(error?.message || error || "Failed to apply theme");
    }
  });
};

export const useRemoveTheme = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, force }: { name: string; force: boolean }) => 
      api.removeTheme(name, force),
    onSuccess: (_, { name }) => {
      toast.success(`Theme '${name}' removed successfully.`);
      queryClient.invalidateQueries({ queryKey: ["installed-themes"] });
      queryClient.invalidateQueries({ queryKey: ["available-themes"] });
    },
    onError: (error: any) => {
      toast.error(error?.message || error || "Failed to remove theme");
    }
  });
};
