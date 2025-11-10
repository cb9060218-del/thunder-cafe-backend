// Replace API_BASE with your backend URL after deploy
let API_BASE = 'REPLACE_WITH_API_BASE';

// Read table param
const params = new URLSearchParams(location.search);
const TABLE = params.get('table') || 'TBL-DEMO';
if(document.getElementById('table-info')) document.getElementById('table-info').innerText = 'Table: ' + TABLE;

let MENU = [];
let cart = [];

async function loadMenu(){
  try {
    const res = await fetch(API_BASE + '/api/menu');
    MENU = await res.json();
    const el = document.getElementById('menu-list');
    if(!el) return;
    el.innerHTML = MENU.map(m => `
      <div class="menu-item">
        <div><strong>${m.name}</strong> — ₹${m.price}</div>
        <div>${m.description||''}</div>
        <div><button onclick="addToCart(${m.id})">Add</button></div>
      </div>
    `).join('');
  } catch(e) { console.error('Load menu failed', e); if(document.getElementById('menu-list')) document.getElementById('menu-list').innerText = 'Failed to load menu'; }
}

function addToCart(id){
  const item = MENU.find(m => m.id === id);
  const existing = cart.find(c => c.id === id);
  if(existing) existing.quantity++;
  else cart.push({id:item.id, name:item.name, price:item.price, quantity:1});
  renderCart();
}

function renderCart(){
  const ul = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  if(!ul) return;
  ul.innerHTML = cart.map(c => `<li>${c.name} x ${c.quantity}</li>`).join('') || '<li>Empty</li>';
  const total = cart.reduce((s,i)=>s+i.price*i.quantity,0);
  totalEl.innerText = total.toFixed(2);
}

async function placeOrder(){
  if(cart.length===0){alert('Cart empty'); return}
  const payload = {table: TABLE, items: cart.map(c=>({menu_item_id:c.id, quantity:c.quantity}))};
  try {
    const res = await fetch(API_BASE + '/api/order', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    const data = await res.json();
    if(data.success){ alert('Order placed: ' + data.orderId); cart=[]; renderCart(); }
    else alert('Failed to place order');
  } catch(e){ alert('Network error: could not place order'); console.error(e); }
}

if(document.getElementById('place-order')){
  document.getElementById('place-order').addEventListener('click', placeOrder);
  loadMenu().then(renderCart);
}

// expose for debugging in console
window._thunder = {loadMenu, renderCart, addToCart};
