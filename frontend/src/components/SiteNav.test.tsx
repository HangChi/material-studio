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

it.each([["/batches","批量制作"]])("marks only the active additional section %s",(pathname,label)=>{route.pathname=pathname;render(<SiteNav/>);expect(screen.getByRole("link",{name:label})).toHaveAttribute("aria-current","page");expect(screen.getAllByRole("link").filter(link=>link.getAttribute("aria-current")==="page")).toHaveLength(1);});

it("keeps account access separate from the main creation navigation",()=>{route.pathname="/account";render(<SiteNav/>);expect(screen.getAllByRole("link")).toHaveLength(3);expect(screen.queryByRole("link",{name:"账号"})).not.toBeInTheDocument();});
