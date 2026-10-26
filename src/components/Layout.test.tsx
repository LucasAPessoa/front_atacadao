import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { User } from "../shared/types/domain";
import { Layout } from "./Layout";

const render = (user: User | null) =>
  renderToStaticMarkup(
    <Layout user={user} cartCount={0} onLogout={() => {}} path="/">
      x
    </Layout>,
  );

describe("link do painel", () => {
  it("aparece só para admin, abrindo em nova aba", () => {
    const html = render({ id: "1", email: "a@a", role: { name: "admin" } });
    expect(html).toContain('href="/admin/"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener"');
    expect(html).toContain("Painel admin");
  });
  it("não aparece para cliente nem visitante", () => {
    expect(render({ id: "2", email: "b@b", role: { name: "user" } })).not.toContain("Painel admin");
    expect(render(null)).not.toContain("Painel admin");
  });
});
