import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';
import {SecurePanel,db} from './SecurePanel';
type Product={id:string;category_id:string;name:string;description:string;price_cents:number};
type Category={id:string;name:string};
type Restaurant={id:string;name:string;delivery_fee_cents:number};
const money=(c:number)=>(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
type DemoOrder={id:string;items:string;total:number;stage:number;customer:string;phone:string;address:string;method:string};
const stages=['Recebido','Confirmado','Em preparo','Saiu para entrega','Entregue'];
function Menu({onOrder}:{onOrder:(order:DemoOrder)=>void}){const [restaurant,setRestaurant]=useState<Restaurant|null>(null),[categories,setCategories]=useState<Category[]>([]),[products,setProducts]=useState<Product[]>([]),[cart,setCart]=useState<Record<string,number>>({}),[error,setError]=useState(''),[loading,setLoading]=useState(true),[notice,setNotice]=useState(''),[search,setSearch]=useState(''),[method,setMethod]=useState('pix'),[customer,setCustomer]=useState(''),[phone,setPhone]=useState(''),[address,setAddress]=useState('');
useEffect(()=>{let live=true;async function load(){try{const slug=new URLSearchParams(location.search).get('restaurante')||'nss-burger';const res=await db.from('restaurants').select('id,name,delivery_fee_cents').eq('slug',slug).eq('active',true).single();if(res.error)throw res.error;const [c,p]=await Promise.all([db.from('categories').select('id,name').eq('restaurant_id',res.data.id).eq('active',true).order('name'),db.from('products').select('id,category_id,name,description,price_cents').eq('restaurant_id',res.data.id).eq('active',true).order('name')]);if(c.error||p.error)throw new Error('Cardápio indisponível');if(live){setRestaurant(res.data);setCategories(c.data||[]);setProducts(p.data||[]);}}catch{if(live)setError('Cardápio indisponível no momento.');}finally{if(live)setLoading(false);}}void load();return()=>{live=false;};},[]);
const add=(id:string)=>{setNotice('');setCart(v=>({...v,[id]:Math.min(99,(v[id]||0)+1)}));};
const remove=(id:string)=>setCart(v=>({...v,[id]:Math.max(0,(v[id]||0)-1)}));
const items=products.filter(p=>cart[p.id]>0);const subtotal=items.reduce((n,p)=>n+p.price_cents*cart[p.id],0),fee=items.length?(restaurant?.delivery_fee_cents||0):0;
if(loading)return <p>Carregando cardápio...</p>;if(error||!restaurant)return <p role="alert">{error}</p>;
const match=(p:Product)=>(p.name+' '+p.description).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'));
const rank=(n:string)=>n.includes('Hambúrguer')?0:n.includes('Combos')?1:n.includes('Porções')?2:3;
return <>
<section className="hero"><small>DEMONSTRAÇÃO COMERCIAL · SEM COBRANÇA</small><h1>{restaurant.name}</h1><p>Escolha seus favoritos. Entrega {money(restaurant.delivery_fee_cents)}</p></section>
<div className="layout">
<section><h2>Cardápio</h2><input className="menu-search" type="search" placeholder="Buscar produtos..." value={search} onChange={e=>setSearch(e.target.value)}/>
{[...categories].sort((a,b)=>rank(a.name)-rank(b.name)).map(c=>{
const visible=products.filter(p=>p.category_id===c.id&&match(p));
return visible.length>0?<section key={c.id}><h3>{c.name}</h3>{visible.map(p=><article key={p.id}><div className="emoji">🍔</div><div className="grow"><h3>{p.name}</h3><p>{p.description}</p><b>{money(p.price_cents)}</b></div><button onClick={()=>add(p.id)}>+</button></article>)}</section>:null;
})}</section>
<section id="cart-panel" className="panel"><h2>Seu pedido</h2>
{!items.length&&<p>Seu carrinho está vazio.</p>}
{items.map(p=><div className="line" key={p.id}><span>{cart[p.id]}× {p.name} · {money(p.price_cents*cart[p.id])}</span><button onClick={()=>remove(p.id)}>−</button></div>)}
<p>Subtotal: {money(subtotal)}</p><p>Entrega: {money(fee)}</p><h3>Total: {money(subtotal+fee)}</h3>
{items.length>0&&<form className="checkout-form" onSubmit={e=>{
e.preventDefault();
if(!customer.trim()||!phone.trim()||!address.trim()){setNotice('Preencha todos os dados fictícios.');return;}
onOrder({id:crypto.randomUUID().slice(0,8),items:items.map(p=>cart[p.id]+'× '+p.name).join(', '),total:subtotal+fee,stage:0,customer:customer.trim(),phone:phone.trim(),address:address.trim(),method});
setCart({});
}}>
<h3>Dados da entrega</h3><p>Use somente dados fictícios. Nenhuma cobrança será realizada.</p>
<label>Nome<input required maxLength={100} value={customer} onChange={e=>setCustomer(e.target.value)}/></label>
<label>Telefone<input required type="tel" maxLength={20} value={phone} onChange={e=>setPhone(e.target.value)}/></label>
<label>Endereço<input required maxLength={250} value={address} onChange={e=>setAddress(e.target.value)}/></label>
<label>Forma de pagamento<select value={method} onChange={e=>setMethod(e.target.value)}><option value="pix">Pix (simulado)</option><option value="card">Cartão (simulado)</option></select></label>
<button type="submit">Confirmar pedido fictício</button>
</form>}
{notice&&<p role="status">{notice}</p>}
</section></div>
{items.length>0&&<button className="mobile-cart" onClick={()=>document.getElementById('cart-panel')?.scrollIntoView({behavior:'smooth',block:'start'})}>Ver carrinho · {money(subtotal+fee)}</button>}
</>;
}
const demoKey='nss-food-demo-orders-v1';
function readDemo():DemoOrder[]{try{const value=JSON.parse(sessionStorage.getItem(demoKey)||'[]');return Array.isArray(value)?value.filter(o=>typeof o.id==='string'&&typeof o.total==='number').slice(0,10):[];}catch{return [];}}
function saveDemo(orders:DemoOrder[]){try{sessionStorage.setItem(demoKey,JSON.stringify(orders.map(o=>({id:o.id,items:o.items,total:o.total,stage:o.stage,method:o.method,customer:'',phone:'',address:''})).slice(0,10)));}catch{}}
function App(){const path=location.pathname.replace(/\/$/,'').split('/').pop();const area=path==='restaurante'?'restaurante':path==='admin'?'admin':new URLSearchParams(location.search).get('area');const [view,setView]=useState('menu'),[demo,setDemo]=useState<DemoOrder[]>(readDemo);useEffect(()=>{saveDemo(demo);},[demo]);const restricted=area==='restaurante'||area==='admin';return <><header><strong>NSS<span>Food</span></strong><small>{restricted?(area==='admin'?'Administração':'Painel do restaurante'):'Ambiente demonstrativo · V2.3'}</small></header>{!restricted&&<nav>{[['menu','Cardápio'],['tracking','Acompanhar']].map(([id,label])=><button key={id} className={view===id?'active':''} onClick={()=>setView(id)}>{label}</button>)}</nav>}<main>{restricted?<SecurePanel admin={area==='admin'}/>:<><div hidden={view!=='menu'}><Menu onOrder={o=>{setDemo(v=>[o,...v]);setView('tracking');}}/></div>{view==='tracking'&&<section className="panel"><h1>Acompanhe seu pedido</h1><p>Pedido demonstrativo neste navegador. Sem cobrança, envio de WhatsApp ou sincronização com o restaurante. O número do pedido fica salvo temporariamente nesta aba.</p>{!demo.length&&<p>Faça um pedido de teste no cardápio.</p>}{demo.map(o=><article key={o.id}><div className="grow"><h3>Pedido #{o.id}</h3><p>{o.items}</p><p>Pagamento: {o.method==='pix'?'Pix':'Cartão'} (simulado)</p><p>{money(o.total)} · {stages[o.stage]}</p></div></article>)}</section>}</>}</main><footer>NSS Food · Demonstração · Não insira dados reais</footer></>;}createRoot(document.getElementById('root')!).render(<App/>);