"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import type { Template } from "../templates/types";
export type UploadSlotsProps = { template: Template; onChange: (ids: (string | null)[]) => void; disabled?: boolean };
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

export function UploadSlots({ template, onChange, disabled = false }: UploadSlotsProps) {
  const name = useId();
  const [slots, setSlots] = useState<Slot[]>(() => Array.from({ length: template.requiredImageCount }, () => ({ status: "empty" })));
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
  return <div className="upload-grid">
    {slots.map((slot, index) => <fieldset className="upload-slot" key={index} disabled={disabled}>
      <label htmlFor={`${name}-${index}`}>图片 {index + 1}</label>
      <input id={`${name}-${index}`} type="file" accept={template.acceptedMimeTypes.join(",")} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void start(index, file); }} />
      {slot.preview && <Image className="upload-preview" src={slot.preview} alt={`图片 ${index + 1} 预览`} width={240} height={160} unoptimized />}
      {slot.status === "validating" && <p role="status">图片 {index + 1} 校验中</p>}
      {slot.status === "uploading" && <p role="status">图片 {index + 1} 上传中</p>}
      {slot.status === "ready" && <p className="upload-success">图片 {index + 1} 已上传</p>}
      {slot.status === "error" && <p role="alert">{slot.message}</p>}
      <div className="slot-actions">
        {slot.status === "error" && slot.file && <button type="button" onClick={() => void start(index, slot.file!)}>重试图片 {index + 1}</button>}
        {slot.status !== "empty" && <button type="button" onClick={() => clear(index)}>移除图片 {index + 1}</button>}
      </div>
    </fieldset>)}
  </div>;
}
