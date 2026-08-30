class WebSocketService {
  constructor(){ this.ws=null; this.listeners=new Map(); this.connected=false }
  ensureConnected(){ if(this.ws?.readyState===WebSocket.OPEN||this.ws?.readyState===WebSocket.CONNECTING)return; const protocol=location.protocol==='https:'?'wss:':'ws:'; this.ws=new WebSocket(`${protocol}//${location.host}/api/v1/workflows/events`); this.ws.onopen=()=>{this.connected=true;for(const topic of this.listeners.keys())this.send({action:'subscribe',topic})}; this.ws.onmessage=e=>{try{const msg=JSON.parse(e.data);this.listeners.get(msg.topic)?.forEach(cb=>cb(msg.payload,msg))}catch{}}; this.ws.onclose=()=>{this.connected=false} }
  subscribe(topic,callback){ if(!this.listeners.has(topic))this.listeners.set(topic,new Set());this.listeners.get(topic).add(callback);if(this.connected)this.send({action:'subscribe',topic});return()=>this.unsubscribe(topic,callback) }
  unsubscribe(topic,callback){const set=this.listeners.get(topic);set?.delete(callback);if(!set?.size)this.listeners.delete(topic)}
  send(value){if(this.ws?.readyState===WebSocket.OPEN)this.ws.send(JSON.stringify(value))}
}
export const wsService=new WebSocketService()
