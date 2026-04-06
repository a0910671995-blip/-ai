import React, { useState, useEffect } from 'react';

const App = () => {
  const [stocks, setStocks] = useState(() => {
    const saved = localStorage.getItem('smc_pro_v15');
    return saved ? JSON.parse(saved) : [];
  });

  const [form, setForm] = useState({ symbol: '', price: '', qty: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('smc_pro_v15', JSON.stringify(stocks));
  }, [stocks]);

  // --- 功能 1: 自動抓取股票名稱 (利用 API) ---
  const fetchStockName = async (symbol) => {
    if (!symbol) return "";
    setLoading(true);
    try {
      // 嘗試從 FinMind 獲取 (假設 Token 有效)
      const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkYXRlIjoiMjAyNi0wNC0wNiAxODoyOToxNSIsInVzZXJfaWQiOiJ0aW5nMDkwMiIsImVtYWlsIjoiYTA5MTA2NzE5OTVAZ21haWwuY29tIiwiaXAiOiIxMjMuMjA0LjE5OC4xMDgifQ._aQwOaw9SopLidA7fEgZzAY02nyPX6jLudW6_TwODMA";
      const res = await fetch(`https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInfo&token=${token}`);
      const json = await res.json();
      const info = json.data.find(item => item.stock_id === symbol);
      setLoading(false);
      return info ? info.stock_name : symbol;
    } catch (e) {
      setLoading(false);
      return symbol; // 失敗則顯示代碼
    }
  };

  const addNewStock = async () => {
    if (!form.symbol || !form.price || !form.qty) return alert("請輸入完整資料");
    const name = await fetchStockName(form.symbol);
    const newStock = {
      id: Date.now(),
      symbol: form.symbol,
      name: name,
      avgCost: parseFloat(form.price), // 均價
      qty: parseInt(form.qty),         // 持股數
      realizedProfit: 0,               // 已實現損益
      currentPrice: parseFloat(form.price) // 預設現價等於買入價，之後手動更新或按按鈕
    };
    setStocks([...stocks, newStock]);
    setForm({ symbol: '', price: '', qty: '' });
  };

  // --- 功能 2: 賣出邏輯 (計算實現損益) ---
  const handleSell = (id, sellPrice, sellQty) => {
    if (!sellPrice || !sellQty) return alert("請輸入賣出價格與數量");
    setStocks(stocks.map(s => {
      if (s.id === id) {
        if (sellQty > s.qty) { alert("賣出數量不能大於持股數"); return s; }
        const profit = (sellPrice - s.avgCost) * sellQty;
        return {
          ...s,
          qty: s.qty - sellQty,
          realizedProfit: s.realizedProfit + profit
        };
      }
      return s;
    }));
  };

  // --- 功能 3: 回補邏輯 (重新計算均價 - 攤平) ---
  const handleBuyMore = (id, buyPrice, buyQty) => {
    if (!buyPrice || !buyQty) return alert("請輸入回補價格與數量");
    setStocks(stocks.map(s => {
      if (s.id === id) {
        const totalCost = (s.avgCost * s.qty) + (buyPrice * buyQty);
        const newQty = s.qty + buyQty;
        return {
          ...s,
          qty: newQty,
          avgCost: parseFloat((totalCost / newQty).toFixed(2))
        };
      }
      return s;
    }));
  };

  const updateCurrentPrice = (id, newPrice) => {
    setStocks(stocks.map(s => s.id === id ? { ...s, currentPrice: parseFloat(newPrice) } : s));
  };

  // --- 樣式設定 ---
  const theme = {
    bg: '#0b0e11', card: '#161a1e', text: '#eaecef', primary: '#f0b90b',
    red: '#f6465d', green: '#0ecb81', blue: '#3498db', border: '#2b3139'
  };

  return (
    <div style={{ backgroundColor: theme.bg, color: theme.text, minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', color: theme.primary, borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px' }}>
          SMC 專業波段戰情室 v15
        </h2>

        {/* 新增區域 */}
        <div style={{ backgroundColor: theme.card, padding: '20px', borderRadius: '12px', border: `1px solid ${theme.border}`, marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <input placeholder="代碼 (2313)" style={inputStyle} value={form.symbol} onChange={e => setForm({...form, symbol: e.target.value})} />
            <input type="number" placeholder="買入價" style={inputStyle} value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
            <input type="number" placeholder="數量" style={inputStyle} value={form.qty} onChange={e => setForm({...form, qty: e.target.value})} />
          </div>
          <button onClick={addNewStock} style={{ width: '100%', padding: '12px', backgroundColor: theme.primary, border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            {loading ? "查詢名稱中..." : "建立監控計畫"}
          </button>
        </div>

        {/* 列表區域 */}
        {stocks.map(s => {
          const unrealized = Math.round((s.currentPrice - s.avgCost) * s.qty);
          const tp = (s.avgCost * 1.1).toFixed(2);
          const sl = (s.avgCost * 0.93).toFixed(2);

          return (
            <div key={s.id} style={{ backgroundColor: theme.card, borderRadius: '12px', padding: '15px', marginBottom: '20px', borderLeft: `5px solid ${theme.primary}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <b style={{ fontSize: '1.2em' }}>{s.name} <small style={{color: '#848e9c'}}>{s.symbol}</small></b>
                <div style={{ textAlign: 'right' }}>
                   現價：<input type="number" value={s.currentPrice} onChange={e => updateCurrentPrice(s.id, e.target.value)} style={{ width: '60px', background: '#2b3139', border: 'none', color: 'white', textAlign: 'center' }} />
                </div>
              </div>

              {/* 核心數據 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center', backgroundColor: '#1e2329', padding: '10px', borderRadius: '8px' }}>
                <div><small style={{color: '#848e9c'}}>均價</small><br/><b>{s.avgCost}</b></div>
                <div><small style={{color: '#848e9c'}}>持股</small><br/><b>{s.qty}</b></div>
                <div><small style={{color: '#848e9c'}}>已實現損益</small><br/><b style={{color: theme.red}}>{Math.round(s.realizedProfit)}</b></div>
              </div>

              <div style={{ marginTop: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.9em' }}>未實現損益：</span>
                <b style={{ color: unrealized >= 0 ? theme.red : theme.green, fontSize: '1.2em' }}>{unrealized}</b>
              </div>

              {/* 操作區 */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px', borderTop: `1px dashed ${theme.border}`, paddingTop: '15px' }}>
                <div style={{ flex: 1 }}>
                  <button onClick={() => {
                    const p = prompt("賣出價格?");
                    const q = prompt("賣出數量?");
                    if(p && q) handleSell(s.id, parseFloat(p), parseInt(q));
                  }} style={{ width: '100%', padding: '8px', backgroundColor: theme.red, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>賣出結利</button>
                </div>
                <div style={{ flex: 1 }}>
                  <button onClick={() => {
                    const p = prompt("回補價格?");
                    const q = prompt("回補數量?");
                    if(p && q) handleBuyMore(s.id, parseFloat(p), parseInt(q));
                  }} style={{ width: '100%', padding: '8px', backgroundColor: theme.blue, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>低位回補</button>
                </div>
              </div>

              {/* 紀律提示 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.8em', color: '#848e9c' }}>
                <span>建議停利: {tp}</span>
                <span>建議停損: {sl}</span>
                <span onClick={() => {if(window.confirm("結案？")) setStocks(stocks.filter(x=>x.id!==s.id))}} style={{cursor:'pointer'}}>刪除紀錄</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const inputStyle = {
  backgroundColor: '#2b3139', border: '1px solid #474d57', color: 'white', padding: '10px', borderRadius: '6px', width: '80%'
};

export default App;
