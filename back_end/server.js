import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;
let pool;

(async function initDB(){
  pool = await mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  });
})();

// GET menu
app.get('/api/menu', async (req,res)=>{
  try{
    const [rows] = await pool.query('SELECT id, name, description, price FROM menu_items WHERE available = 1');
    res.json(rows);
  }catch(e){ console.error(e); res.status(500).json({error:'db error'}); }
});

// POST order
app.post('/api/order', async (req,res)=>{
  try{
    const {table, items} = req.body;
    if(!items || items.length===0) return res.json({success:false, msg:'no items'});
    const conn = await pool.getConnection();
    try{
      await conn.beginTransaction();
      const [r] = await conn.query('INSERT INTO orders (table_id, status, placed_at) VALUES (?, ?, NOW())', [table, 'pending']);
      const orderId = r.insertId;
      for(const it of items){
        await conn.query('INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES (?, ?, ?)', [orderId, it.menu_item_id, it.quantity]);
      }
      await conn.commit();
      res.json({success:true, orderId});
    }catch(err){ await conn.rollback(); throw err; } finally{ conn.release(); }
  }catch(e){ console.error(e); res.status(500).json({success:false, error:'server error'}); }
});

// GET orders (optional ?status=pending)
app.get('/api/orders', async (req,res)=>{
  try{
    const status = req.query.status;
    let q = 'SELECT o.id, o.table_id, o.status, o.placed_at FROM orders o';
    const params = [];
    if(status){ q += ' WHERE o.status = ?'; params.push(status); }
    q += ' ORDER BY o.placed_at DESC LIMIT 200';
    const [orders] = await pool.query(q, params);
    for(const o of orders){
      const [items] = await pool.query('SELECT oi.quantity, mi.name FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id WHERE oi.order_id = ?', [o.id]);
      o.items = items;
    }
    res.json(orders);
  }catch(e){ console.error(e); res.status(500).json({error:'db error'}); }
});

// POST update-status {id, status}
app.post('/api/update-status', async (req,res)=>{
  try{
    const {id, status} = req.body;
    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    res.json({success:true});
  }catch(e){ console.error(e); res.status(500).json({error:'db error'}); }
});

app.listen(PORT, ()=>console.log('Server running on', PORT));
