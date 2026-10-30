import {fireEvent,render,screen,waitFor} from "@testing-library/react";
import {expect,it,vi} from "vitest";
import {SubmissionForm} from "./SubmissionForm";
import type {UploadSlotsProps} from "../assets/UploadSlots";
vi.mock("../assets/UploadSlots",()=>({UploadSlots:({initialIds,onChange,template}:UploadSlotsProps)=><>
 <p>草稿素材：{initialIds?.filter(Boolean).join(",")||"空"}</p>
 <button type="button" onClick={()=>onChange(Array.from({length:template.requiredImageCount},(_,i)=>`photo-${i}`))}>添加测试照片</button>
 <button type="button" onClick={()=>onChange(Array(template.requiredImageCount).fill(null))}>移除全部照片</button>
</>}));
const template={id:"demo-portrait",title:"肖像",description:"",categoryId:"creative",coverUrl:"/cover.png",requiredImageCount:1,acceptedMimeTypes:["image/png"],maxFileSizeBytes:5242880};
function identity(){vi.stubGlobal("fetch",vi.fn(async()=>Response.json({user:{id:"draft-owner"}})));}
it("persists removal of the final photo so remount cannot restore the old selection",async()=>{
 identity();
 const view=render(<SubmissionForm template={template}/>);
 fireEvent.click(await screen.findByText("添加测试照片"));
 const key="material-draft:draft-owner:demo-portrait:new";
 await waitFor(()=>expect(JSON.parse(localStorage.getItem(key)!).assetIds).toEqual(["photo-0"]));
 fireEvent.click(screen.getByText("移除全部照片"));
 await waitFor(()=>expect(JSON.parse(localStorage.getItem(key)!).assetIds).toEqual([null]));
 view.unmount();render(<SubmissionForm template={template}/>);
 expect(await screen.findByText("草稿素材：空")).toBeVisible();
 expect(screen.getByRole("button",{name:"提交制作"})).toBeDisabled();
});
it("persists restoring default parameters when a text-only draft already exists",async()=>{
 identity();
 const postcard={...template,id:"demo-postcard",requiredImageCount:2};
 const view=render(<SubmissionForm template={postcard}/>);
 const title=await screen.findByLabelText("明信片标题");
 fireEvent.change(title,{target:{value:"修改过的标题"}});
 const key="material-draft:draft-owner:demo-postcard:new";
 await waitFor(()=>expect(JSON.parse(localStorage.getItem(key)!).parameters.title).toBe("修改过的标题"));
 fireEvent.change(title,{target:{value:"旅途来信"}});
 await waitFor(()=>expect(JSON.parse(localStorage.getItem(key)!).parameters.title).toBe("旅途来信"));
 view.unmount();render(<SubmissionForm template={postcard}/>);
 expect(await screen.findByLabelText("明信片标题")).toHaveValue("旅途来信");
});
it("does not create an empty draft just by opening a new form",async()=>{
 identity();render(<SubmissionForm template={template}/>);
 await screen.findByText("添加测试照片");
 expect(localStorage.getItem("material-draft:draft-owner:demo-portrait:new")).toBeNull();
});
