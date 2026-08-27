export type AutomationKind="agent"|"workflow"
export interface AutomationDefinition {id:string;name:string;description:string;kind:AutomationKind;status:"draft"|"active"|"disabled";version:number;definition:Record<string,unknown>;metadata:Record<string,unknown>;created_at?:string;updated_at?:string}
export interface AutomationTemplate {slug:string;name:string;description?:string;category?:string;tags?:string[];kind:AutomationKind;definition:unknown}
export interface AutomationCredential {id:string;name:string;type:string;created_at?:string;updated_at?:string}
export interface SaveAutomation {name:string;description:string;status:AutomationDefinition["status"];definition:Record<string,unknown>;metadata:Record<string,unknown>}
export interface SaveCredential {name:string;type:string;data:Record<string,unknown>}
export interface ExecutionEvent {id?:string;status?:string;recorded_at?:string;[key:string]:unknown}
export interface AIAutomationsTransport {
 request<T=unknown>(method:"GET"|"POST"|"PUT"|"DELETE",path:string,options?:{body?:unknown;params?:Record<string,unknown>;responseType?:string}):Promise<T>
 list?(kind:AutomationKind,query?:{page?:number;limit?:number;keyword?:string}):Promise<AutomationDefinition[]>
 get?(kind:AutomationKind,id:string):Promise<AutomationDefinition>
 create?(kind:AutomationKind,input:SaveAutomation):Promise<AutomationDefinition>
 update?(kind:AutomationKind,id:string,input:SaveAutomation):Promise<AutomationDefinition>
 remove?(kind:AutomationKind,id:string):Promise<void>
 versions?(kind:AutomationKind,id:string):Promise<AutomationDefinition[]>
 templates?(kind:AutomationKind):Promise<AutomationTemplate[]>
 getTemplate?(kind:AutomationKind,slug:string):Promise<AutomationTemplate>
 useTemplate?(kind:AutomationKind,slug:string):Promise<AutomationDefinition>
 listCredentials?():Promise<AutomationCredential[]>
 createCredential?(input:SaveCredential):Promise<AutomationCredential>
 updateCredential?(id:string,input:SaveCredential):Promise<AutomationCredential>
 removeCredential?(id:string):Promise<void>
 listLogs?(kind:AutomationKind,id:string):Promise<ExecutionEvent[]>
 invoke?(kind:AutomationKind,id:string,payload:unknown):Promise<unknown>
 deploy?(kind:AutomationKind,id:string):Promise<unknown>
 undeploy?(kind:AutomationKind,id:string):Promise<unknown>
}
