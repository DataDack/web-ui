import type {AIAutomationsTransport} from "./types"
let active:AIAutomationsTransport|null=null
let basePath="/automations"
export function setTransport(value:AIAutomationsTransport){active=value}
export function getTransport(){if(!active)throw new Error("AIAutomationsProvider transport is not configured");return active}
export function setAutomationBasePath(value:string){basePath=`/${value.replace(/^\/+|\/+$/g,"")}`.replace(/^\/$/,"")}
export function automationPath(path=""){const suffix=path.replace(/^\/+/,"");return suffix?`${basePath}/${suffix}`:basePath||"/"}
