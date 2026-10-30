import { describe, expect, it } from "vitest";
import { messageFor } from "./App";
import { ApiError } from "./shared/http";

describe("messageFor", () => {
  it("mostra a mensagem do servidor no 409 de estoque (com available)", () => {
    const error = new ApiError(
      409,
      "Estoque insuficiente para 'Cor: Preto'. Você já tem 4 no carrinho e pode adicionar mais 1.",
      [],
      undefined,
      1,
    );
    expect(messageFor(error)).toBe(error.message);
  });

  it("mantém o aviso genérico no 409 sem available (total do carrinho mudou)", () => {
    expect(messageFor(new ApiError(409, "total divergente"))).toBe(
      "O carrinho foi alterado. Revise os valores antes de continuar.",
    );
  });

  it("mostra a mensagem do 400 de variação indisponível", () => {
    const error = new ApiError(400, "Esta variação de produto não está disponível no momento.");
    expect(messageFor(error)).toBe(error.message);
  });
});
