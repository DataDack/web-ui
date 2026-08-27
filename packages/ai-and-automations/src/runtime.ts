import type {AIAutomationsTransport} from "./types"
let active:AIAutomationsTransport|null=null
export function setTransport(value:AIAutomationsTransport){active=value}
export function getTransport(){if(!active)throw new Error("AIAutomationsProvider transport is not configured");return active}
