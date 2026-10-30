import type {ApiProblem,AuthUser,BoardRequest,BoardResponse,BusRoute,ConductorTrip,Manifest,OfflineSync,OfflineSyncResponse,OperationalEvent,OperatorBooking,OperatorNotification,Trip,TripStatus,UserProfile} from './types';

const API_BASE=(import.meta.env.VITE_API_BASE_URL||'/railbus-api').replace(/\/$/,'');

export class ApiError extends Error {
  constructor(public status:number,message:string){super(message);this.name='ApiError'}
}

// The API's role claim can arrive in lowercase even though the UI uses the
// canonical uppercase values for routing and access checks.
function normalizeRole<T extends {role:string}>(user:T):T&{role:AuthUser['role']} {
  return {...user,role:user.role.trim().toUpperCase() as AuthUser['role']};
}

async function request<T>(path:string,init:RequestInit={},authenticated=true):Promise<T>{
  const token=sessionStorage.getItem('railbus-token');
  const headers=new Headers(init.headers);
  if(init.body&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
  headers.set('ngrok-skip-browser-warning','true');
  if(authenticated&&token)headers.set('Authorization',`Bearer ${token}`);
  let response:Response;
  try{response=await fetch(`${API_BASE}${path}`,{...init,headers})}
  catch{throw new ApiError(0,`Cannot reach the RailBus API through ${API_BASE}. Start the local backend with npm run dev:all, then retry.`)}
  const payload=await response.json().catch(()=>null) as ApiProblem|null;
  if(!response.ok){
    if(response.status===401&&authenticated){sessionStorage.removeItem('railbus-token');window.dispatchEvent(new Event('railbus-auth-expired'))}
    const detail=payload?.detail;
    const message=typeof detail==='string'?detail:Array.isArray(detail)?detail.map(item=>item.msg||'Invalid request').join('; '):`Request failed (${response.status})`;
    throw new ApiError(response.status,message);
  }
  return payload as T;
}

export const api={
  login:async(email:string,password:string)=>normalizeRole(await request<AuthUser>('/api/v1/auth/login',{method:'POST',body:JSON.stringify({email,password})},false)),
  me:async()=>normalizeRole(await request<UserProfile>('/api/v1/auth/me')),
  trips:(status?:TripStatus)=>request<Trip[]>(`/api/v1/trips${status?`?status=${encodeURIComponent(status)}`:''}`),
  activity:()=>request<OperationalEvent[]>('/api/v1/operator/activity'),
  notifications:()=>request<OperatorNotification[]>('/api/v1/notifications'),
  bookings:()=>request<OperatorBooking[]>('/api/v1/operator/bookings?limit=1000'),
  dispatch:(id:string)=>request<Trip>(`/api/v1/operator/trips/${encodeURIComponent(id)}/dispatch`,{method:'POST',body:JSON.stringify({})}),
  trip:(id:string)=>request<Trip>(`/api/v1/trips/${encodeURIComponent(id)}`),
  routes:async()=>{const all:BusRoute[]=[];for(let offset=0;;offset+=200){const page=await request<BusRoute[]>(`/api/v1/routes?limit=200&offset=${offset}`);all.push(...page);if(page.length<200)break}return all},
  route:(id:string)=>request<BusRoute>(`/api/v1/routes/${encodeURIComponent(id)}`),
  conductorTrips:()=>request<ConductorTrip[]>('/api/v1/conductor/trips'),
  manifest:(id:string)=>request<Manifest>(`/api/v1/conductor/trips/${encodeURIComponent(id)}/manifest`),
  openBoarding:(id:string)=>request<unknown>(`/api/v1/conductor/trips/${encodeURIComponent(id)}/boarding/open`,{method:'POST'}),
  board:(id:string,data:BoardRequest)=>request<BoardResponse>(`/api/v1/conductor/trips/${encodeURIComponent(id)}/board`,{method:'POST',body:JSON.stringify(data)}),
  syncOffline:(id:string,data:OfflineSync)=>request<OfflineSyncResponse>(`/api/v1/conductor/trips/${encodeURIComponent(id)}/sync-offline`,{method:'POST',body:JSON.stringify(data)}),
  depart:(id:string)=>request<unknown>(`/api/v1/conductor/trips/${encodeURIComponent(id)}/depart`,{method:'POST'}),
  complete:(id:string)=>request<unknown>(`/api/v1/conductor/trips/${encodeURIComponent(id)}/complete`,{method:'POST'}),
};

export const apiBaseUrl=API_BASE;
