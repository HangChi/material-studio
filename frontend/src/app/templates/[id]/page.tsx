import { TemplateDetail } from "../../../features/templates/TemplateDetail";
export default async function TemplatePage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{from?:string}>}){
 const {id}=await params;const {from}=await searchParams;return <TemplateDetail key={`${id}:${from??""}`} id={id} sourceJobId={from}/>;
}
