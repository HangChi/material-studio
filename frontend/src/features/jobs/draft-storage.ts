import type { PostcardParameters } from "./PostcardEditor";
export type Draft={version:1;assetIds:(string|null)[];parameters:PostcardParameters;savedAt:string};
export const draftKey=(owner:string,template:string,source?:string)=>`material-draft:${owner}:${template}:${source??"new"}`;
export function readDraft(key:string,count:number):{draft:Draft|null;error:string}{
 try{
  const raw=localStorage.getItem(key);if(!raw)return {draft:null,error:""};if(raw.length>10000)throw new Error("Invalid draft");
  const value=JSON.parse(raw) as Draft,p=value.parameters;
  if(value.version!==1||!Array.isArray(value.assetIds)||value.assetIds.length!==count||!value.assetIds.every(id=>id===null||typeof id==="string"&&/^[A-Za-z0-9_-]+$/.test(id))||!p||typeof p.title!=="string"||Array.from(p.title).length>40||!["CREAM","OCEAN"].includes(p.palette)||!["LANDSCAPE","SQUARE"].includes(p.format)||!Array.isArray(p.crops)||p.crops.length!==2||!p.crops.every(c=>c&&Number.isFinite(c.x)&&c.x>=0&&c.x<=1&&Number.isFinite(c.y)&&c.y>=0&&c.y<=1&&Number.isFinite(c.zoom)&&c.zoom>=1&&c.zoom<=3))throw new Error("Invalid draft");
  return {draft:value,error:""};
 }catch{return {draft:null,error:"无法恢复本地草稿，原文件和作品不受影响。"};}
}
export function saveDraft(key:string,assetIds:(string|null)[],parameters:PostcardParameters,count:number){
 localStorage.setItem(key,JSON.stringify({version:1,assetIds:Array.from({length:count},(_,i)=>assetIds[i]??null),parameters,savedAt:new Date().toISOString()} satisfies Draft));
}
