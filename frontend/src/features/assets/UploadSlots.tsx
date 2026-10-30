"use client";

import { StudioIcon } from "../../components/StudioIcon";
import { AssetPicker } from "./AssetPicker";
import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import type { Template } from "../templates/types";
export type UploadSlotsProps = { template: Template; onChange: (ids: (string | null)[]) => void; disabled?: boolean; initialIds?:(string|null)[] };
type Slot = { status: "empty" | "validating" | "uploading" | "ready" | "error"; file?: File; preview?: string; assetId?: string; message?: string };

async function validateImage(file: File): Promise<void> {
  const header = new Uint8Array(await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error("无法读取图片，请重新选择"));
    reader.readAsArrayBuffer(file.slice(0, 8));
  }));
  const isPng = [137,80,78,71,13,10,26,10].every((byte,index) => header[index] === byte);
  const isJpeg = header[0] === 255 && header[1] === 216 && header[2] === 255;
  if (!(file.type === "image/png" && isPng || file.type === "image/jpeg" && isJpeg)) throw new Error("图片内容与JPEG或PNG格式不匹配");
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error("无法读取图片，请选择完整的JPEG或PNG文件"); }
  try { if (bitmap.width * bitmap.height > 20000000 || bitmap.width === 0 || bitmap.height === 0) throw new Error("图片不能超过2000万像素"); }
  finally { bitmap.close(); }
}

export function UploadSlots({ template, onChange, disabled = false,initialIds=[] }: UploadSlotsProps) {
  const name = useId();
  const [picking,setPicking]=useState<number|null>(null);
  const [slots, setSlots] = useState<Slot[]>(() => Array.from({ length: template.requiredImageCount }, (_,index) => initialIds[index]?({status:"ready",assetId:initialIds[index]!,preview:`/api/assets/${encodeURIComponent(initialIds[index]!)}/content`}):({ status: "empty" })));
  const resources = useRef({ slots, active: true, versions: Array<number>(template.requiredImageCount).fill(0), controllers: Array<AbortController | null>(template.requiredImageCount).fill(null) });
  useEffect(() => {
    const state = resources.current; state.active = true;
    return () => { state.active = false; state.controllers.forEach(c => c?.abort()); state.slots.forEach(slot => { if (slot.preview) URL.revokeObjectURL(slot.preview); }); };
  }, []);
  function update(index: number, slot: Slot) {
    const state = resources.current; if (!state.active) return;
    const next = [...state.slots]; next[index] = slot; state.slots = next; setSlots(next);
    onChange(next.map(item => item.status === "ready" ? item.assetId ?? null : null));
  }
  function clear(index: number) {
    const state = resources.current; state.versions[index]++; state.controllers[index]?.abort(); state.controllers[index] = null;
    if (state.slots[index].preview) URL.revokeObjectURL(state.slots[index].preview!);
    update(index, { status: "empty" });
  }
  async function start(index: number, file: File) {
    clear(index);
    const state = resources.current, version = state.versions[index];
    const current = () => state.active && state.versions[index] === version;
    if (!template.acceptedMimeTypes.includes(file.type)) { update(index, { status: "error", message: "请选择JPEG或PNG图片" }); return; }
    if (file.size <= 0 || file.size > template.maxFileSizeBytes) { update(index, { status: "error", message: "请选择非空且不超过5 MiB的图片" }); return; }
    const preview = URL.createObjectURL(file);
    update(index, { status: "validating", file, preview });
    try { await validateImage(file); }
    catch (error) { if (current()) update(index, { status: "error", file, preview, message: error instanceof Error ? error.message : "无法读取图片" }); return; }
    if (!current()) return;
    const controller = new AbortController(); state.controllers[index] = controller;
    update(index, { status: "uploading", file, preview });
    const body = new FormData(); body.append("file", file);
    try {
      const response = await fetch("/api/assets", { method: "POST", body, credentials: "same-origin", signal: controller.signal });
      const result = await response.json();
      if (!response.ok || typeof result.id !== "string") throw new Error(result.error?.message ?? "上传失败，请重试");
      if (current()) update(index, { status: "ready", file, preview, assetId: result.id });
    } catch (error) {
      if (current()) update(index, { status: "error", file, preview, message: `上传失败：${error instanceof Error ? error.message : "请重试"}` });
    }
  }
  return <div className={`upload-grid ${slots.length === 1 ? "upload-single" : "upload-multiple"}`}>
    {slots.map((slot, index) => <fieldset className={`upload-slot slot-${slot.status}`} key={index} disabled={disabled}>
      <div className="slot-body">
        <div className="slot-media">
          <input className="file-input" aria-label={`图片 ${index + 1}`} id={`${name}-${index}`} type="file" accept={template.acceptedMimeTypes.join(",")} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void start(index, file); }} />
          <label className={`file-target ${slot.preview ? "has-photo" : ""}`} htmlFor={`${name}-${index}`}>
            {slot.preview ? <><Image className="upload-preview" src={slot.preview} alt={`图片 ${index + 1} 预览`} width={360} height={240} unoptimized /><span className="replace-photo"><StudioIcon name="upload" />更换图片</span></> : <><span className="file-target-icon"><StudioIcon name="upload" /></span><strong>选择本地图片</strong><span>JPEG / PNG</span></>}
          </label>
        </div>
        <div className="slot-content">
          <div className="slot-heading"><strong>图片 {index + 1}</strong><span className={`slot-badge ${slot.status === "ready" ? "is-ready" : ""}`}>{slot.status === "ready" ? "已就绪" : slot.status === "error" ? "需重新选择" : slot.status === "uploading" || slot.status === "validating" ? "处理中" : "待添加"}</span></div>
          <p className="slot-description">{slot.file ? slot.file.name : slot.assetId ? "已从素材库选择。" : "上传图片，或从素材库选择。"}</p>
          <div className="slot-actions"><button type="button" className="library-select" aria-label={`从素材库选择图片 ${index+1}`} onClick={()=>setPicking(index)}><StudioIcon name="library" />从素材库选择</button>
            {slot.status === "error" && slot.file && <button type="button" onClick={() => void start(index, slot.file!)}>重试图片 {index + 1}</button>}
            {slot.status !== "empty" && <button type="button" className="remove-photo" onClick={() => clear(index)}>移除图片 {index + 1}</button>}
          </div>
          {slot.status === "validating" && <p className="slot-feedback" role="status">图片 {index + 1} 校验中</p>}
          {slot.status === "uploading" && <p className="slot-feedback" role="status">图片 {index + 1} 上传中</p>}
          {slot.status === "ready" && <p className="upload-success">图片 {index + 1} 已上传</p>}
          {slot.status === "error" && <p className="slot-feedback" role="alert">{slot.message}</p>}
        </div>
      </div>
      {picking===index&&<AssetPicker excluded={slots.filter((_,i)=>i!==index).flatMap(item=>item.assetId?[item.assetId]:[])} onClose={()=>setPicking(null)} onSelect={id=>{clear(index);update(index,{status:"ready",assetId:id,preview:`/api/assets/${encodeURIComponent(id)}/content`});setPicking(null);}}/>}
    </fieldset>)}
  </div>;
}
