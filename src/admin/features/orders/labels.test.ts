import { describe, expect, it } from "vitest";
import { formatDateTime } from "./labels";

describe("formatDateTime", () => {
  it("usa America/Sao_Paulo: 02:30Z mostra o dia anterior", () => {
    expect(formatDateTime("2026-10-26T02:30:00Z")).toContain("25/10/2026");
    expect(formatDateTime("2026-10-26T02:30:00Z")).toContain("23:30");
  });
  it("vazio vira travessão", () => {
    expect(formatDateTime(null)).toBe("—");
  });
});
