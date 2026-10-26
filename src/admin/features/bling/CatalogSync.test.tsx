import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ApiError } from "../../../shared/http";
import type { CatalogSyncRun, CatalogSyncRuns } from "../../api/types";
import {
  CatalogSyncView,
  catalogSyncErrorMessage,
  historyItems,
  isInProgress,
  pollInterval,
} from "./CatalogSync";

const counts = {
  created: 1,
  updated: 2,
  deactivated: 3,
  blocked: 4,
  unchanged: 5,
  failed: 6,
};
const mk = (
  status: CatalogSyncRun["status"],
  extra: Partial<CatalogSyncRun> = {},
): CatalogSyncRun => ({
  id: status,
  trigger: "MANUAL",
  status,
  started_at: "2026-10-26T12:00:00",
  finished_at: null,
  counts,
  errors: [],
  reason: null,
  ...extra,
});
const view = (data: CatalogSyncRuns | null, extra = {}) =>
  renderToStaticMarkup(
    <CatalogSyncView
      data={data}
      loading={false}
      busy={false}
      error=""
      onImport={() => {}}
      onRefresh={() => {}}
      {...extra}
    />,
  );

describe("catálogo do Bling", () => {
  it("renderiza histórico com rótulos, gatilho, motivo e erros", () => {
    const items = [
      mk("SUCCESS"),
      mk("PARTIAL", {
        trigger: "SCHEDULED",
        errors: [
          { bling_id: 123, code: "incompleto_peso", message: "sem peso" },
          { bling_id: null, code: "filtro_alteracao_ignorado", message: "aviso geral" },
        ],
      }),
      mk("FAILED"),
      mk("SKIPPED", { reason: "conexao_inativa" }),
    ];
    const html = view({ current: null, items });
    for (const t of ["Concluída", "Parcial", "Falhou", "Ignorada", "Automática", "Manual"])
      expect(html).toContain(t);
    expect(html).toContain("conexao_inativa");
    expect(html).toContain("<details>");
    expect(html).toContain("123 · incompleto_peso · sem peso");
    expect(html).toContain("Geral · filtro_alteracao_ignorado · aviso geral");
  });

  it("mostra a execução corrente e desabilita o botão em RUNNING", () => {
    const current = mk("RUNNING", { phase: "SCAN" });
    const html = view({ current, items: [current] });
    expect(html).toContain("Em andamento");
    expect(html).toContain("Fase: SCAN");
    expect(html).toContain("Desativados: 3");
    expect(html).toMatch(
      /<button type="button" class="adm-btn adm-btn-primary" disabled="">Importar agora/,
    );
  });

  it("habilita o botão sem execução em andamento e tem botão Atualizar", () => {
    const html = view({ current: null, items: [] });
    expect(html).not.toMatch(/disabled="">Importar agora/);
    expect(html).toContain("Atualizar");
    expect(html).toContain("Nenhuma importação registrada.");
  });

  it("diferencia os dois 409 pelo detail", () => {
    const busy = new ApiError(409, "Importação já em andamento");
    expect(catalogSyncErrorMessage(busy)).toBe("Já existe uma importação em andamento.");
    expect(isInProgress(busy)).toBe(true);
    const other = new ApiError(409, "outro");
    expect(catalogSyncErrorMessage(other)).toContain("Conexão com o Bling inativa");
    expect(isInProgress(other)).toBe(false);
    expect(isInProgress(new ApiError(409, "Conexão com o Bling inativa"))).toBe(false);
  });

  it("não duplica a execução corrente no histórico", () => {
    const current = mk("RUNNING", { phase: "SCAN" });
    const data = { current, items: [{ ...current, phase: null }, mk("SUCCESS")] };
    expect(historyItems(data).map((r) => r.id)).toEqual(["SUCCESS"]);
    const html = view(data);
    expect(html.match(/Em andamento/g)).toHaveLength(1);
  });

  it("traduz 409, 503 e 403", () => {
    expect(catalogSyncErrorMessage(new ApiError(409, "x"))).toContain(
      "Conexão com o Bling inativa",
    );
    expect(catalogSyncErrorMessage(new ApiError(503, "x"))).toContain(
      "não configurada neste ambiente",
    );
    expect(catalogSyncErrorMessage(new ApiError(403, "x"))).toContain("permissão");
  });

  it("polling liga enquanto há RUNNING e desliga ao terminar", () => {
    const running = mk("RUNNING");
    expect(pollInterval({ current: running, items: [running] })).toBe(3000);
    expect(pollInterval({ current: null, items: [running] })).toBe(3000);
    expect(pollInterval({ current: null, items: [mk("SUCCESS")] })).toBe(false);
    expect(pollInterval(undefined)).toBe(false);
  });
});
