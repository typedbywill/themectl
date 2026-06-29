import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { toast } from "sonner";

export const useSources = () => {
  return useQuery({
    queryKey: ["sources"],
    queryFn: api.listSources,
  });
};

export const useAddSource = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ url, name }: { url: string; name?: string }) => api.addSource(url, name),
    onSuccess: (data) => {
      toast.success(`Repository '${data.name}' added successfully!`);
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["available-themes"] });
    },
    onError: (error: any) => {
      toast.error(error?.message || error || "Failed to add repository source");
    }
  });
};

export const useRemoveSource = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.removeSource(name),
    onSuccess: (_, name) => {
      toast.success(`Repository '${name}' removed successfully.`);
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["available-themes"] });
    },
    onError: (error: any) => {
      toast.error(error?.message || error || "Failed to remove repository source");
    }
  });
};

export const useRefreshSources = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.refreshSources,
    onSuccess: () => {
      toast.success("All repositories refreshed successfully.");
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["available-themes"] });
    },
    onError: (error: any) => {
      toast.error(error?.message || error || "Failed to refresh repositories");
    }
  });
};
