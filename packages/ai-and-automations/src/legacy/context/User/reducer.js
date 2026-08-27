export const initialState={user:{}}
export function reducer(state,action){switch(action?.type){case 'set':return {...state,...action.payload};default:return state}}
