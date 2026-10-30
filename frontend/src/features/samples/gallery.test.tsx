import {render,screen,within} from "@testing-library/react";
import {expect,it} from "vitest";
import {SampleGallery} from "./SampleGallery";
import materials from "./materials.json";
it("offers six locally downloadable photos with sources and a complete manual verification pack",()=>{
 render(<SampleGallery/>);const gallery=screen.getByRole("region",{name:"示例素材"});
 expect(within(gallery).getAllByRole("img")).toHaveLength(6);
 for(const item of materials){
  expect(within(gallery).getByRole("link",{name:`下载${item.title}`})).toHaveAttribute("href",`/samples/${item.file}`);
  expect(within(gallery).getByRole("link",{name:`下载${item.title}`})).toHaveAttribute("download",item.file);
  expect(within(gallery).getByRole("link",{name:`${item.title}来源：${item.author}`})).toHaveAttribute("href",item.source);
 }
 expect(screen.getByRole("link",{name:"下载验证素材包"})).toHaveAttribute("href","/samples/manual-verification.zip");
 expect(screen.getByRole("link",{name:"下载验证素材包"})).toHaveAttribute("download");
 expect(screen.getByRole("link",{name:"Unsplash License"})).toHaveAttribute("href","https://unsplash.com/license");
 expect(screen.getByText("人工验证步骤").closest("details")).not.toHaveAttribute("open");
});
