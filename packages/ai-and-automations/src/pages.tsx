import {css} from "@emotion/css"
import {Bot,GitBranch,KeyRound,LayoutTemplate} from "lucide-react"
import {Link} from "react-router-dom"
const page=css({padding:24,maxWidth:1120,margin:"0 auto"}),grid=css({display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}),card=css({display:"block",border:"1px solid var(--border)",borderRadius:10,padding:20,color:"inherit",textDecoration:"none",background:"var(--card)"})
export function AIAutomationsHome({basePath="/automations"}:{basePath?:string}){const links=[{to:"agents",label:"AI Agents",icon:Bot},{to:"workflows",label:"Workflows",icon:GitBranch},{to:"templates",label:"Templates",icon:LayoutTemplate},{to:"credentials",label:"Credentials",icon:KeyRound}];return <main className={page}><h1>AI & Automations</h1><div className={grid}>{links.map(({to,label,icon:Icon})=><Link className={card} key={to} to={`${basePath}/${to}`}><Icon/><h2>{label}</h2></Link>)}</div></main>}
export function PackageSurface({title}:{title:string}){return <main className={page}><h1>{title}</h1><p>The reusable studio surface is connected through the package transport.</p></main>}
