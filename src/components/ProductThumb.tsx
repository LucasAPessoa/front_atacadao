import { useState } from "react";
import { safeImageUrl } from "../lib/product";

/** Miniatura com dimensões fixas (via CSS); cai nas iniciais se faltar URL ou a imagem falhar. */
export function ProductThumb({ name, src }: { name: string; src?: string | null }) {
  const [failed, setFailed] = useState(false);
  const safe = safeImageUrl(src);
  if (!safe || failed) return <span aria-hidden="true">{name.slice(0, 2).toUpperCase()}</span>;
  return (
    <img
      src={safe}
      alt={name}
      loading="lazy"
      decoding="async"
      width={240}
      height={240}
      onError={() => setFailed(true)}
    />
  );
}
