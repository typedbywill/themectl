import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { toast } from "sonner";

export const useBackups = () => {
  return useQuery({
    queryKey: ["backups"],
    queryFn: api.listBackups,
  });
};

export const useRestoreBackup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (timestamp: string) => api.restoreBackup(timestamp),
    onSuccess: (_, timestamp) => {
      toast.success(`Successfully restored backup from ${timestamp}!`);
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      queryClient.invalidateQueries({ queryKey: ["installed-themes"] });
      queryClient.invalidateQueries({ queryKey: ["doctor"] });
    },
    onError: (error: any) => {
      toast.error(error?.message || error || "Failed to restore backup");
    }
  });
};

export const useDeleteBackup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (timestamp: string) => api.deleteBackup(timestamp),
    onSuccess: (_, timestamp) => {
      toast.success(`Deleted backup snapshot ${timestamp}.`);
      queryClient.invalidateQueries({ queryKey: ["backups"] });
    },
    onError: (error: any) => {
      toast.error(error?.message || error || "Failed to delete backup");
    }
  });
};
