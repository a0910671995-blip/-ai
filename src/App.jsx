import React, { useState, useEffect, useCallback } from 'react';

// --- 進階 100% 繞過 CORS 的跨域代理 ---
const proxyUrl = "https://api.allorigins.win/get?url=";

const App = () => {
  // 1. 狀態管理 (LocalStorage 儲存版)
  const [stocks, setStocks] = useState(() => {
    const saved = localStorage.getItem('smc_ultra_v16');
    return saved ? JSON.parse(saved) : [];
  });

  const [form, setForm] = useState({ symbol: '', price: '', qty: '' });
  const [loading, setLoading] = useState(false);
  const [globalStatus, setGlobalStatus] = useState("系統就緒 - 即時報價連線中");

  // 2. 自動儲存
  useEffect(() => {
    localStorage.setItem('smc_ultra_v16', JSON.stringify(stocks));
  }, [stocks]);

  // --- 關鍵核心：自動抓取 Yahoo 即時報價 ---
  const fetchLivePrice = useCallback(async (symbol) => {
    try {
      // 在背景自动帮台股加上 .TW 后缀
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.TW`;
      const response = await fetch(`${proxyUrl}${encodeURIComponent(yahooUrl)}`);
      
      if (!response.ok) return null;
      
      const resData = await response.json();
      const rawContents = JSON.parse(resData.contents);
      
      if (rawContents.chart && rawContents.chart.result) {
        return rawContents.chart.result[0].meta.regularMarketPrice;
      }
      return null;
    } catch (e) {
      console.error(`無法獲取 ${symbol} 即時報價:`, e);
      return null;
    }
  }, []);

  // --- 關鍵核心：背景自动更新 (每 10 秒) ---
  useEffect(() => {
    if (stocks.length === 0) return;
    
    setGlobalStatus("🔄 正在更新即時行情...");
    const timer = setInterval(async () => {
      const updatedStocks = await Promise.all(stocks.map(async (s) => {
        const p = await fetchLivePrice(s.symbol);
        if (p) {
          return { ...s, live: p, lastUpdate: new Date().toLocaleTimeString() };
        }
        return s;
      }));
      setStocks(updatedStocks);
      setGlobalStatus(`✅ 行情已更新 (${new Date().toLocaleTimeString()})`);
    }, 10000); // 10秒更新一次，兼顾即时性与请求频率

    return () => clearInterval(timer);
  }, [stocks, fetchLivePrice]);

  // 3. 新增監控標的
  const addNewStock = async () => {
    if (!form.symbol || !form.price || !form.qty) return alert("欄位不能空白");
    const cost = parseFloat(form.price);
    const qty = parseInt(form.qty);
    const sym = form.symbol.toUpperCase();

    setLoading(true);
    setGlobalStatus(`🔍 正在驗證 ${sym} 代碼...`);
    
    // 建立時先抓一次價格驗證
    const p = await fetchLivePrice(sym);

    if (p === null) {
      alert(`找不到 [${sym}] 代碼。台股請確認代碼無誤，無需加 .TW (例如: 2313)`);
      setLoading(false);
      setGlobalStatus("❌ 驗證失敗");
      return;
    }

    setStocks([...stocks, {
      id: Date.now(),
      symbol: sym,
      name: sym, // 由於移除 Token，預設顯示代碼
      avgCost: cost, // 初始均價
      qty: qty,       // 持股股數
      live: p,         // 自動抓到的即時價
      profit: 0,       // 已實現損益
      chip: null,      // 籌碼資料 (留出整合空間)
      lastUpdate: new Date().toLocaleTimeString()
    }]);

    setForm({ symbol: '', price: '', qty: '' });
    setLoading(false);
    setGlobalStatus("✅ 策略建立成功，自動監控中");
  };

  // --- 功能 2：動態成本計算 (低位回補 - 攤平) ---
  const handleBuyMore = (id, buyP, buyQ) => {
    if (!buyP || !buyQ) return;
    setStocks(stocks.map(s => {
      if (s.id === id) {
        const totalCost = (s.avgCost * s.qty) + (buyP * buyQ);
        const newQty = s.qty + buyQ;
        // 自动计算新的加权均价
        const newAvg = parseFloat((totalCost / newQty).toFixed(2));
        return { ...s, qty: newQty, avgCost: newAvg };
      }
      return s;
    }));
  };

  // --- 功能 3：已實現損益 (賣出結利) ---
  const handleSell = (id, sellP, sellQ) => {
    if (!sellP || !sellQ) return;
    setStocks(stocks.map(s => {
      if (s.id === id) {
        if (sellQ > s.qty) { alert("庫存不足"); return s; }
        // 计算这一笔的实现损益
        const tradeProfit = (sellP - s.avgCost) * sellQ;
        return { ...s, qty: s.qty - sellQ, profit: s.profit + tradeProfit };
      }
      return s;
    }));
  };

  // 4. SMC 深色 UI 樣式
  const styles = {
    container: { maxWidth: '500px', margin: '0 auto', padding: '20px', backgroundColor: '#0b0e11', color: '#eaecef', minHeight: '100vh', fontFamily: 'sans-serif' },
    status: { textAlign: 'center', color: '#f0b90b', background: 'rgba(240, 185, 11, 0.1)', padding: '8px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.9em' },
    inputPanel: { backgroundColor: '#161a1e', padding: '15px', borderRadius: '12px', border: '1px solid #2b3139', marginBottom: '20px' },
    input: { backgroundColor: '#2b3139', border: '1px solid #474d57', color: 'white', padding: '10px', borderRadius: '4px', width: '85%', marginBottom: '8px' },
    btnAdd: { width: '100%', padding: '12px', backgroundColor: '#f0b90b', color: '#1e2329', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
    card: { backgroundColor: '#161a1e', border: '1px solid #2b3139', borderRadius: '12px', padding: '15px', marginBottom: '20px', borderTop: '4px solid #f0b90b', position: 'relative' },
    livePrice: { fontSize: '1.6em', fontWeight: 'bold', color: '#f6465d' },
    dataGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', background: '#1e2329', padding: '12px', borderRadius: '8px', textAlign: 'center', marginTop: '10px', fontSize: '0.85em' },
    tradeBtn: { border: 'none', borderRadius: '4px', padding: '6px 12px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }
  };

  return (
    <div style={styles.container}>
      <h2 style={{ textAlign: 'center', letterSpacing: '1px', marginBottom: '20px' }}>📈 SMC ULTRA PRO v16</h2>
      <div style={styles.status}>{globalStatus}</div>

      {/* 輸入區 */}
      <div style={styles.inputPanel}>
        <input name="symbol" placeholder="代碼 (2313)" style={styles.input} value={form.symbol} onChange={e=>setForm({...form, symbol:e.target.value})} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <input name="price" type="number" placeholder="買入價" style={styles.input} value={form.price} onChange={e=>setForm({...form, price:e.target.value})} />
          <input name="qty" type="number" placeholder="數量" style={styles.input} value={form.qty} onChange={e=>setForm({...form, qty:e.target.value})} />
        </div>
        <button style={styles.btnAdd} onClick={addNewStock} disabled={loading}>{loading ? "搜尋中..." : "建立即時監控策略"}</button>
      </div>

      {/* 列表區 */}
      {stocks.map(s => {
        // 未实现損益计算 = (现价 - 均价) * 持股数
        const unrealized = Math.round((s.live - s.avgCost) * s.qty);
        
        return (
          <div key={s.id} style={styles.card}>
            <button onClick={()=>{if(window.confirm("結案？"))setStocks(stocks.filter(x=>x.id!==s.id))}} style={{position:'absolute',top:10,right:10,background:'none',border:'none',color:'#333',cursor:'pointer'}}>刪除</button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.2em' }}><b>{s.symbol}</b> <small style={{color:'#666'}}>台股</small></span>
              <span style={styles.livePrice}>{s.live}</span>
            </div>

            {/* 籌碼預留區 */}
            <div style={{ background: '#1e2323', padding: '5px 10px', borderRadius: '4px', fontSize: '0.75em', color: '#aaa', margin: '10px 0' }}>
              SMC MAX 籌碼掃描中... [昨日法人：-- 張]
            </div>

            {/* 核心損益 */}
            <div style={{ marginTop: '10px', textAlign: 'center' }}>
              未實現：<b style={{ color: unrealized >= 0 ? '#f6465d' : '#0ecb81', fontSize: '1.3em' }}>{unrealized}</b>
            </div>

            {/* 專業數據網格 */}
            <div style={styles.dataGrid}>
              <div><small style={{color: '#848e9c'}}>均價</small><br/><b>{s.avgCost}</b></div>
              <div><small style={{color: '#848e9c'}}>持股</small><br/><b>{s.qty}</b></div>
              <div><small style={{color: '#848e9c'}}>本金</small><br/><b>{Math.round(s.avgCost * s.qty)}</b></div>
              <div><small style={{color: '#848e9c'}}>已領</small><br/><b style={{color:'#f6465d'}}>{Math.round(s.profit)}</b></div>
            </div>

            {/* 進階操作區 */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '15px', borderTop: '1px dashed #2b3139', paddingTop: '15px' }}>
              <button onClick={() => {
                const p = prompt(`${s.symbol} 賣出成交價?`, s.live);
                const q = prompt(`賣出股數? (持股 ${s.qty})`);
                if(p && q) handleSell(s.id, parseFloat(p), parseInt(q));
              }} style={{ ...styles.tradeBtn, backgroundColor: '#f6465d', flex: 1 }}>賣出結利</button>
              <button onClick={() => {
                const p = prompt(`${s.symbol} 回補成交價?`, s.live);
                const q = prompt(`回補股數?`);
                if(p && q) handleBuyMore(s.id, parseFloat(p), parseInt(q));
              }} style={{ ...styles.tradeBtn, backgroundColor: '#3498db', flex: 1 }}>低位回補</button>
            </div>
            <div style={{textAlign:'right', fontSize:'0.7em', color:'#444', marginTop:10}}>⏱ 價格更新：${s.lastUpdate}</div>
          </div>
        );
      })}
    </div>
  );
};

export default App;
