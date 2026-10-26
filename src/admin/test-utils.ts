import { vi } from "vitest";

type ActEnv = { IS_REACT_ACT_ENVIRONMENT?: boolean };

/**
 * Espera uma asserção passar (equivalente ao waitFor do Testing Library). Desliga o modo `act`
 * durante a espera para que o React processe as atualizações assíncronas (fetch, queries).
 */
export async function waitFor(check: () => void, timeout = 2000): Promise<void> {
  const env = globalThis as ActEnv;
  const previous = env.IS_REACT_ACT_ENVIRONMENT;
  env.IS_REACT_ACT_ENVIRONMENT = false;
  try {
    await vi.waitFor(check, { timeout, interval: 10 });
  } finally {
    env.IS_REACT_ACT_ENVIRONMENT = previous;
  }
}
