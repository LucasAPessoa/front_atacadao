export const PERIODS = [
  ["hoje", "Hoje"],
  ["7d", "7 dias"],
  ["30d", "30 dias"],
  ["mes", "Mês atual"],
  ["custom", "Personalizado"],
] as const;
export type PeriodKey = (typeof PERIODS)[number][0];

const TIMEZONE = "America/Sao_Paulo";
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Data de hoje (YYYY-MM-DD) no fuso da loja, não no do navegador. */
export function todayInStoreZone(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function shiftDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const isValidDate = (value: string) =>
  DATE.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

export const isPeriodKey = (value: string): value is PeriodKey =>
  PERIODS.some(([key]) => key === value);

export type PeriodResult = { ok: true; from: string; to: string } | { ok: false; message: string };

/** Resolve o período da URL. Períodos inválidos não geram requisição (evita 422). */
export function resolvePeriod(
  period: string,
  customFrom: string,
  customTo: string,
  now: Date = new Date(),
): PeriodResult {
  const today = todayInStoreZone(now);
  switch (period) {
    case "7d":
      return { ok: true, from: shiftDays(today, -6), to: today };
    case "30d":
      return { ok: true, from: shiftDays(today, -29), to: today };
    case "mes":
      return { ok: true, from: `${today.slice(0, 8)}01`, to: today };
    case "custom": {
      if (!isValidDate(customFrom) || !isValidDate(customTo))
        return { ok: false, message: "Informe as datas inicial e final do período." };
      if (customFrom > customTo)
        return { ok: false, message: "A data inicial não pode ser posterior à final." };
      return { ok: true, from: customFrom, to: customTo };
    }
    default:
      return { ok: true, from: today, to: today };
  }
}
