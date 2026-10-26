export function pageInfo(total: number, skip: number, limit: number) {
  const size = Math.max(1, limit);
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(pages, Math.floor(Math.max(0, skip) / size) + 1);
  return { page, pages, hasPrev: page > 1, hasNext: page < pages };
}

export function Pagination({
  total,
  skip,
  limit,
  onChange,
  disabled = false,
}: {
  total: number;
  skip: number;
  limit: number;
  /** Recebe o novo `skip`. */
  onChange(skip: number): void;
  disabled?: boolean;
}) {
  const { page, pages, hasPrev, hasNext } = pageInfo(total, skip, limit);
  return (
    <nav className="adm-pagination" aria-label="Paginação">
      <span>
        Página {page} de {pages} · {total} {total === 1 ? "item" : "itens"}
      </span>
      <div className="adm-pagination-actions">
        <button
          type="button"
          className="adm-btn"
          disabled={disabled || !hasPrev}
          onClick={() => onChange(Math.max(0, (page - 2) * limit))}
        >
          Anterior
        </button>
        <button
          type="button"
          className="adm-btn"
          disabled={disabled || !hasNext}
          onClick={() => onChange(page * limit)}
        >
          Próxima
        </button>
      </div>
    </nav>
  );
}
