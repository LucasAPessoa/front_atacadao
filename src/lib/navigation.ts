/** Navegação da loja (SPA sem router): troca a URL e avisa o App pelo popstate. */
export function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  // Nova página abre no topo; voltar/avançar do histórico deixa o navegador restaurar a rolagem.
  window.scrollTo?.(0, 0);
}
