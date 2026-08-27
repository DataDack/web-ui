import {API} from '../helpers'
const unwrap=res=>res.data.data
export const agentsApi={list:({page=1,pageSize=20,keyword=''}={})=>API.get('/api/agent/',{params:{p:page,page_size:pageSize,keyword}}).then(unwrap),get:id=>API.get(`/api/agent/${id}`).then(unwrap),versions:id=>API.get(`/api/agent/${id}/versions`).then(unwrap),create:data=>API.post('/api/agent/',data).then(unwrap),update:(id,data)=>API.put(`/api/agent/${id}`,data).then(unwrap),delete:id=>API.delete(`/api/agent/${id}`).then(unwrap)}
