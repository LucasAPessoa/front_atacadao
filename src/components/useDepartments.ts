import { useEffect, useState } from "react";
import { departmentsWithProducts } from "../lib/product";
import { api } from "../services/client";
import type { Category } from "../shared/types/domain";

let cached: Promise<Category[]> | null = null;

/** Departamentos com produto à venda, carregados uma vez por visita (chips do cabeçalho). */
export function loadDepartments(): Promise<Category[]> {
  cached ??= Promise.all([api.categories(), api.products()])
    .then(([categories, products]) => departmentsWithProducts(categories, products))
    .catch(() => {
      cached = null; // falha não fica em cache: a próxima página tenta de novo
      return [];
    });
  return cached;
}

export function useDepartments(): Category[] {
  const [departments, setDepartments] = useState<Category[]>([]);
  useEffect(() => {
    let alive = true;
    void loadDepartments().then((list) => {
      if (alive) setDepartments(list);
    });
    return () => {
      alive = false;
    };
  }, []);
  return departments;
}

/** Só para testes. */
export const resetDepartments = () => {
  cached = null;
};
