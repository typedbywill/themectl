import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { GuiSettings } from "../types";
import { toast } from "sonner";

export const useSettings = () => {
  return useQuery({
    queryKey: ["settings"],
    queryFn: api.getSettings,
  });
};

export const useSaveSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: GuiSettings) => api.saveSettings(settings),
    onSuccess: () => {
      toast.success("Settings saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error: any) => {
      toast.error(error?.message || error || "Failed to save settings");
    }
  });
};
