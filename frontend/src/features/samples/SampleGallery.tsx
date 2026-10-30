import Image from "next/image";
import materials from "./materials.json";

function fileSize(bytes:number){return bytes>=1048576?`${(bytes/1048576).toFixed(1)} MiB`:`${Math.round(bytes/1024)} KiB`;}
export function SampleGallery(){
 return <section id="sample-materials" className="sample-materials" aria-labelledby="sample-materials-title">
  <div className="sample-heading"><div><h2 id="sample-materials-title">示例素材</h2><p>下载照片后，上传到任意模板试做。</p></div><a className="sample-pack" href="/samples/manual-verification.zip" download="manual-verification.zip">下载验证素材包</a></div>
  <div className="sample-grid">{materials.map(item=><figure className="sample-card" key={item.file}>
   <div className="sample-photo"><Image src={`/samples/${item.file}`} alt={item.title} width={item.width} height={item.height} unoptimized/></div>
   <figcaption><h3>{item.title}</h3><p>{item.width} × {item.height} · {item.format} · {fileSize(item.bytes)}</p><div className="sample-card-actions"><a href={item.source} target="_blank" rel="noreferrer" aria-label={`${item.title}来源：${item.author}`}>{item.author}</a><a className="sample-download" href={`/samples/${item.file}`} download={item.file} aria-label={`下载${item.title}`}>下载</a></div></figcaption>
  </figure>)}</div>
  <div className="sample-notes"><p>摄影作品来自 Unsplash，使用遵循 <a href="https://unsplash.com/license" target="_blank" rel="noreferrer">Unsplash License</a>。<a href="/samples/SOURCES.md" download>下载来源清单</a></p>
   <details><summary>人工验证步骤</summary><ol><li>单图：湖边行者或花卉；检查上传、预览和PNG下载。</li><li>双图：山间湖景与旷野远景；调整明信片标题、配色和裁剪。</li><li>三图：花卉、咖啡、森林；检查拼贴顺序和批量制作进度。</li></ol><p>ZIP 内还附有完整步骤，以及超大小、超像素、损坏和非图片4类异常文件，用于验证拒绝提示。</p></details>
  </div>
 </section>;
}
