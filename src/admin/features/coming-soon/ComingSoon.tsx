import { EmptyState } from "../../ui/EmptyState";

export function ComingSoon({ title }: { title: string }) {
  return (
    <>
      <div className="adm-page-header">
        <h1>{title}</h1>
      </div>
      <EmptyState title="Em breve">Em breve: esta seção ainda está em desenvolvimento.</EmptyState>
    </>
  );
}
