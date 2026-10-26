import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { adminApi } from "../../api";
import { useUrlState } from "../../ui/useUrlState";
import { DashboardView } from "./DashboardView";
import { isPeriodKey, resolvePeriod } from "./period";

const defaults = { periodo: "hoje", de: "", ate: "" };

export function Dashboard() {
  const [state, update] = useUrlState(defaults);
  const periodo = isPeriodKey(state.periodo) ? state.periodo : "hoje";
  const period = resolvePeriod(periodo, state.de, state.ate);
  const range = period.ok ? { from: period.from, to: period.to } : null;
  const summary = useQuery({
    queryKey: ["admin", "dashboard", range],
    queryFn: ({ signal }) => adminApi.dashboard(range ?? {}, signal),
    placeholderData: keepPreviousData,
    enabled: range !== null,
  });

  return (
    <DashboardView
      filters={{ periodo, de: state.de, ate: state.ate }}
      periodError={period.ok ? "" : period.message}
      summary={range ? summary.data : undefined}
      loading={summary.isFetching}
      error={summary.error}
      onChange={update}
      onRetry={() => void summary.refetch()}
    />
  );
}
