import { EmptyState } from "../ui/EmptyState";

function ComingSoon({ title }: { title: string }) {
  return (
    <section aria-labelledby="adm-page-title">
      <div className="adm-page-header">
        <h1 id="adm-page-title">{title}</h1>
      </div>
      <EmptyState title="Em construção">Esta tela ainda será implementada.</EmptyState>
    </section>
  );
}

export const Dashboard = () => <ComingSoon title="Dashboard" />;
export const Moderation = () => <ComingSoon title="Moderação" />;
