import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TemplateCatalog } from "./TemplateCatalog";

const categories = [{ id: "creative", name: "创意图片" }, { id: "social", name: "社交分享" }];
const portrait = { id: "demo-portrait", title: "日光肖像", categoryId: "creative", coverUrl: "/api/demo/portrait.png", description: "留住一束日光", requiredImageCount: 1, acceptedMimeTypes: ["image/jpeg", "image/png"], maxFileSizeBytes: 5242880 };
const collage = { ...portrait, id: "demo-collage", title: "周末拼贴", categoryId: "social", requiredImageCount: 3 };
function api(items = [portrait, collage]) {
  return vi.fn(async (url: string) => Response.json({ items: url.includes("template-categories") ? categories : items }));
}

describe("template catalog", () => {
  it("announces loading, shows server cards and links to a detail", async () => {
    vi.stubGlobal("fetch", api()); render(<TemplateCatalog />);
    expect(screen.getByRole("status")).toHaveTextContent("正在加载模板");
    expect(await screen.findByRole("link", { name: /日光肖像/ })).toHaveAttribute("href", "/templates/demo-portrait");
    expect(screen.getByText("需要 3 张图片")).toBeVisible();
  });
  it("filters and does not let an older ignored-abort response replace the selected category", async () => {
    let resolveOld!: (response: Response) => void;
    const old = new Promise<Response>(resolve => { resolveOld = resolve; });
    const mock = vi.fn((url: string) => {
      if (url.includes("template-categories")) return Promise.resolve(Response.json({ items: categories }));
      if (url.includes("categoryId=creative")) return old;
      if (url.includes("categoryId=social")) return Promise.resolve(Response.json({ items: [collage] }));
      return Promise.resolve(Response.json({ items: [portrait, collage] }));
    });
    vi.stubGlobal("fetch", mock); render(<TemplateCatalog />);
    await screen.findByRole("link", { name: /日光肖像/ });
    fireEvent.click(screen.getByRole("button", { name: "创意图片" }));
    fireEvent.click(screen.getByRole("button", { name: "社交分享" }));
    await screen.findByRole("link", { name: /周末拼贴/ });
    await act(async () => { resolveOld(Response.json({ items: [portrait] })); });
    await waitFor(() => expect(screen.getByRole("button", { name: "社交分享" })).toHaveAttribute("aria-pressed", "true"));
    expect(screen.queryByRole("link", { name: /日光肖像/ })).not.toBeInTheDocument();
    expect(mock.mock.calls.some(([url]) => url.includes("categoryId=social"))).toBe(true);
  });
  it("explains an empty collection", async () => {
    vi.stubGlobal("fetch", api([])); render(<TemplateCatalog />);
    expect(await screen.findByText("这个分类还没有模板")).toBeVisible();
  });
  it("offers retry after request failure", async () => {
    const mock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", mock); render(<TemplateCatalog />);
    expect(await screen.findByRole("alert")).toHaveTextContent("暂时无法加载模板");
    mock.mockImplementation(api());
    await userEvent.click(screen.getByRole("button", { name: "重新加载" }));
    expect(await screen.findByRole("link", { name: /日光肖像/ })).toBeVisible();
  });
  it("aborts pending requests on unmount", () => {
    const mock = vi.fn(() => new Promise<Response>(() => {})); vi.stubGlobal("fetch", mock);
    const view = render(<TemplateCatalog />);
    expect(mock).toHaveBeenCalled();
    const signal = (mock.mock.calls as unknown as [string, RequestInit][])[0][1].signal;
    view.unmount(); expect(signal?.aborted).toBe(true);
  });
});
