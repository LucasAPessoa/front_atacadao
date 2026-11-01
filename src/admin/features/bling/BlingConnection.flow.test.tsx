// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../shared/http";
import { adminApi } from "../../api";
import type { BlingStatus } from "../../api/types";
import { waitFor } from "../../test-utils";
import { BlingConnection } from "./BlingConnection";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const connected: BlingStatus = {
  status: "CONNECTED",
  company: { id: "1", name: "Loja" },
  connected_at: null,
  last_refreshed_at: null,
  last_error: null,
  recent_events: [],
};

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

const button = (text: string) =>
  [...document.querySelectorAll("button")].find((b) => b.textContent === text) as
    | HTMLButtonElement
    | undefined;

describe("desconectar o Bling", () => {
  it("falha fecha o diálogo e mostra o erro no card", async () => {
    vi.spyOn(adminApi, "blingStatus").mockResolvedValue(connected);
    vi.spyOn(adminApi, "blingDisconnect").mockRejectedValue(new ApiError(500, "Erro interno"));
    const box = document.createElement("div");
    document.body.append(box);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await act(async () => {
      createRoot(box).render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <BlingConnection />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });
    await waitFor(() => expect(button("Desconectar")).toBeDefined());
    await act(async () => button("Desconectar")?.click());
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    const confirm = [...document.querySelectorAll('[role="alertdialog"] button')].find(
      (b) => b.textContent === "Desconectar",
    ) as HTMLButtonElement;
    await act(async () => confirm.click());
    await waitFor(() => expect(document.querySelector('[role="alertdialog"]')).toBeNull());
    expect(box.querySelector('[role="alert"]')?.textContent).toBe("Erro interno");
  });
});
