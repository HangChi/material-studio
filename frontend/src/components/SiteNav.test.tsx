import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SiteNav } from "./SiteNav";
const route = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
describe("studio navigation", () => {
  it.each(["/", "/templates/demo-postcard"])("marks the template section on %s", pathname => {
    route.pathname = pathname; render(<SiteNav />);
    expect(screen.getByRole("link", { name: "模板库" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "制作记录" })).not.toHaveAttribute("aria-current");
  });
  it("marks creation history without marking templates", () => {
    route.pathname = "/history"; render(<SiteNav />);
    expect(screen.getByRole("link", { name: "制作记录" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "模板库" })).not.toHaveAttribute("aria-current");
  });
});
