import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";

export const useDoctor = () => {
  return useQuery({
    queryKey: ["doctor"],
    queryFn: api.runDoctor,
  });
};
