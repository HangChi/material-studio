"use client";
import { StudioIcon } from "../../components/StudioIcon";
import Image from "next/image";
import { useId } from "react";
export type PostcardParameters={title:string;palette:"CREAM"|"OCEAN";format:"LANDSCAPE"|"SQUARE";crops:{x:number;y:number;zoom:number}[]};
export const defaultParameters=():PostcardParameters=>({title:"旅途来信",palette:"CREAM",format:"LANDSCAPE",crops:[{x:0.5,y:0.5,zoom:1},{x:0.5,y:0.5,zoom:1}]});
export function PostcardEditor({value,onChange,assets,disabled}:{value:PostcardParameters;onChange:(value:PostcardParameters)=>void;assets:(string|null)[];disabled:boolean}){
 const prefix=useId();
 function changeCrop(index:number,key:"x"|"y"|"zoom",next:number){onChange({...value,crops:value.crops.map((crop,i)=>i===index?{...crop,[key]:next}:crop)});}
 return <section className="postcard-editor" aria-label="明信片制作设置">
  <div className="editor-heading"><h3>明信片排版</h3><p>调整标题、配色与照片位置。</p></div>
  <div className="editor-layout">
   <div className="postcard-preview-wrap">
    <div className="preview-heading"><span>构图预览</span><span className="preview-size">{value.format==="LANDSCAPE"?"1200 × 800":"1000 × 1000"} px</span></div>
    <div className="postcard-stage"><div className={`postcard-preview palette-${value.palette.toLowerCase()}`} style={{aspectRatio:value.format==="LANDSCAPE"?"3 / 2":"1"}}>
     <span className="postcard-rule"/>
     {value.crops.map((crop,index)=><div key={index} className={`postcard-photo photo-${index}`}>
      {assets[index]?<Image src={`/api/assets/${encodeURIComponent(assets[index]!)}/content`} alt={`图片 ${index+1} 裁剪预览`} width={600} height={600} unoptimized style={{objectPosition:`${crop.x*100}% ${crop.y*100}%`,transform:`scale(${crop.zoom})`,transformOrigin:`${crop.x*100}% ${crop.y*100}%`}}/>:<span className="preview-empty-photo"><StudioIcon name="upload" /><span>图片 {index+1}</span></span>}
     </div>)}
     <p className="postcard-title" style={{fontSize:`${Math.min(value.format==="LANDSCAPE"?3.67:5.5,88/Math.max(Array.from(value.title).length,1))}cqw`}}>{value.title}</p><p className="postcard-imprint">POSTCARD / MATERIAL STUDIO</p>
    </div></div>
    <div className="preview-footer"><span>{value.palette==="CREAM"?"奶油纸":"海蓝信笺"} · {value.format==="LANDSCAPE"?"横版":"方版"}</span><span>{assets.filter(Boolean).length < 2 ? "添加照片后查看构图" : "实时预览"}</span></div>
    <p className="field-help">预览展示裁剪与排版，最终字体以下载作品为准。</p>
   </div>
   <fieldset className="editor-fields" disabled={disabled}><legend>作品设置</legend>
    <div className="editor-title-row"><label htmlFor={`${prefix}-title`}>明信片标题</label><span id={`${prefix}-title-help`}>{Array.from(value.title).length} / 40 字</span></div><input id={`${prefix}-title`} value={value.title} onChange={event=>onChange({...value,title:Array.from(event.target.value.replace(/[\r\n\t]/g," ")).slice(0,40).join("")})} aria-describedby={`${prefix}-title-help`}/>
    <div className="editor-selects"><div><label htmlFor={`${prefix}-palette`}>配色<span className={`paper-swatch swatch-${value.palette.toLowerCase()}`} aria-hidden="true" /></label><select id={`${prefix}-palette`} value={value.palette} onChange={event=>onChange({...value,palette:event.target.value as PostcardParameters["palette"]})}><option value="CREAM">奶油纸</option><option value="OCEAN">海蓝信笺</option></select></div>
     <div><label htmlFor={`${prefix}-format`}>输出比例</label><select id={`${prefix}-format`} value={value.format} onChange={event=>onChange({...value,format:event.target.value as PostcardParameters["format"]})}><option value="LANDSCAPE">横版 · 1200 × 800</option><option value="SQUARE">方版 · 1000 × 1000</option></select></div></div>
    <div className="crop-section-heading"><span>照片构图</span><span>调整位置与缩放</span></div>
    <div className="crop-controls">{value.crops.map((crop,index)=><div key={index} className="crop-control">
     <div className="crop-heading"><h4>图片 {index+1}</h4><button type="button" aria-label={`重置图片 ${index+1} 裁剪`} onClick={()=>onChange({...value,crops:value.crops.map((item,i)=>i===index?{x:0.5,y:0.5,zoom:1}:item)})}>重置</button></div>
     {([['x','横向位置','横向',0,1],['y','纵向位置','纵向',0,1],['zoom','放大','放大',1,3]] as const).map(([key,label,shortLabel,min,max])=><div key={key} className="crop-row"><label htmlFor={`${prefix}-${index}-${key}`}>{shortLabel}</label><input id={`${prefix}-${index}-${key}`} type="range" aria-label={`图片 ${index+1} ${label}`} min={min} max={max} step="0.01" value={crop[key]} onChange={event=>changeCrop(index,key,Number(event.target.value))}/><output aria-hidden="true">{key==="zoom"?`${crop[key].toFixed(2)}×`:`${Math.round(crop[key]*100)}%`}</output></div>)}
    </div>)}</div>
   </fieldset>
  </div>
 </section>;
}
