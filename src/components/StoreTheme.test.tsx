// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/client";
import { store } from "../shared/store-config";
import { THEME_CACHE_KEY, StoreThemeProvider, useStoreTheme } from "./StoreTheme";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Probe() {
  const { theme, brand } = useStoreTheme();
  return <p id="probe">{`${theme}|${brand}`}</p>;
}

let root: ReturnType<typeof createRoot> | undefined;
async function mount() {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root?.render(
      <StoreThemeProvider>
        <Probe />
      </StoreThemeProvider>,
    ),
  );
}
const probe = () => document.getElementById("probe")?.textContent;

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});
afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

describe("tema da loja", () => {
  it("aplica brand_color e theme vindos da API", async () => {
    vi.spyOn(api, "storeTheme").mockResolvedValue({
      theme: "feira",
      brand_color: "#112233",
      updated_at: null,
    });
    await mount();
    expect(probe()).toBe("feira|#112233");
  });
  it("brand_color null usa VITE_STORE_BRAND_COLOR", async () => {
    vi.spyOn(api, "storeTheme").mockResolvedValue({
      theme: "gondola",
      brand_color: null,
      updated_at: null,
    });
    await mount();
    expect(probe()).toBe(`gondola|${store.theme.brand}`);
  });
  it("falha da API mantém a cor do build", async () => {
    vi.spyOn(api, "storeTheme").mockRejectedValue(new Error("rede"));
    await mount();
    expect(probe()).toBe(`gondola|${store.theme.brand}`);
  });
  it("grava a resposta e a usa de imediato na próxima abertura", async () => {
    vi.spyOn(api, "storeTheme").mockResolvedValue({
      theme: "feira",
      brand_color: "#112233",
      updated_at: null,
    });
    await mount();
    expect(JSON.parse(localStorage.getItem(THEME_CACHE_KEY) ?? "null")).toEqual({
      theme: "feira",
      brand: "#112233",
    });
    act(() => root?.unmount());
    document.body.innerHTML = "";
    vi.spyOn(api, "storeTheme").mockReturnValue(new Promise(() => {}));
    await mount();
    expect(probe()).toBe("feira|#112233");
  });
  it("cache corrompido é ignorado", async () => {
    localStorage.setItem(THEME_CACHE_KEY, "{x");
    vi.spyOn(api, "storeTheme").mockRejectedValue(new Error("rede"));
    await mount();
    expect(probe()).toBe(`gondola|${store.theme.brand}`);
  });
});
