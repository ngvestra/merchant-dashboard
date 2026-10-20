/** Server-only boundary. Never import this module in a client component. */
const base = process.env.VESTRA_API_BASE_URL ?? 'https://vestra-server-s44md.ondigitalocean.app/api';
const key = process.env.VESTRA_MERCHANT_API_KEY;
async function request<T>(path:string, init:RequestInit={}):Promise<T>{
  if(!key) throw new Error('Merchant API key is not configured on the server.');
  const response=await fetch(`${base}${path}`,{...init,headers:{'x-api-key':key,'content-type':'application/json',...init.headers}});
  if(!response.ok) throw new Error(`Vestra API error: ${response.status}`); return response.json() as Promise<T>;
}
export const merchantApi={products:()=>request('/merchant/v1/products'),overview:()=>request('/merchant/v1/metrics/overview'),createCustomer:(data:unknown)=>request('/merchant/v1/customers',{method:'POST',body:JSON.stringify(data)}),fundWallet:(id:string,data:unknown,idempotencyKey:string)=>request(`/merchant/v1/customers/${id}/wallet/fund`,{method:'POST',headers:{'Idempotency-Key':idempotencyKey},body:JSON.stringify(data)})};
