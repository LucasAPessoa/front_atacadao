import { QueryClient } from "@tanstack/react-query";
import { isClientError } from "./ui/errors";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // 4xx não melhora com nova tentativa; o resto tenta mais uma vez.
        retry: (failureCount, error) => !isClientError(error) && failureCount < 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export const queryClient = createQueryClient();
