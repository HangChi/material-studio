import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TemplateDetail } from "./TemplateDetail";

vi.mock("../jobs/SubmissionForm",()=>({SubmissionForm:()=> <section><h2>上传素材</h2></section>}));

const detail = { id: "demo-postcard", title: "旅行明信片", description: "用两张旅途照片留住故事", categoryId: "creative", coverUrl: "/api/demo/postcard.png", requiredImageCount: 2, acceptedMimeTypes: ["image/jpeg", "image/png"], maxFileSizeBytes: 5242880 };
describe("template detail", () => {
  it("shows loading then server requirements", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(detail)));
    render(<TemplateDetail id="demo-postcard" />);
    expect(screen.getByRole("status")).toHaveTextContent("正在加载模板");
    expect(await screen.findByRole("heading", { name: "旅行明信片" })).toBeVisible();
    expect(screen.getByText("2 张图片")).toBeVisible();
    expect(screen.getByRole("heading",{name:"上传素材"})).toBeVisible();
    expect(screen.getByText("JPEG、PNG")).toBeVisible();
    expect(screen.getByText("每张不超过 5 MiB")).toBeVisible();
    expect(screen.getByRole("link", { name: /返回模板库/ })).toHaveAttribute("href", "/");
  });
  it("distinguishes a missing template from a query failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({}, { status: 404 })));
    render(<TemplateDetail id="missing" />);
    expect(await screen.findByRole("heading", { name: "模板不存在" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "重新加载" })).not.toBeInTheDocument();
  });
  it("retries a temporary failure without showing fake requirements", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock); render(<TemplateDetail id="demo-postcard" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("暂时无法加载模板");
    expect(screen.queryByText("2 张图片")).not.toBeInTheDocument();
    fetchMock.mockResolvedValue(Response.json(detail));
    await userEvent.click(screen.getByRole("button", { name: "重新加载" }));
    expect(await screen.findByRole("heading", { name: "旅行明信片" })).toBeVisible();
  });
});
