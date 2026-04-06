import React, { useState, useEffect, useCallback } from 'react';
import * as Lucide from 'lucide-react';

const App = () => {
  // --- 狀態管理 ---
  const [view, setView] = useState('home'); // home | detail | portfolio
  const [selectedStock, setSelectedStock] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [marketData, setMarketData] = useState([]);
  const [loading, setLoading] = useState(false);

  // 帳簿數據
  const [portfolio, setPortfolio] = useState(() => {
    try {
      const saved = localStorage.getItem('smc_v25_db');
      return saved ? JSON.parse(saved) : [];
    } catch(e) { return []; }
  });

  const TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkYXRlIjoiMjAyNi0wNC0wNiAxODoyOToxNSIsInVzZXJfaWQiOiJ0aW5nMDkwMiIsImVtYWlsIjoiYTA5MTA2NzE5OTVAZ21haWwuY29tIiwiaXAiOiIxMjMuMjA0LjE5OC4xMDgifQ._aQwOaw9SopLidA7fEgZzAY02nyPX6jLudW6_TwODMA";

  useEffect(() => localStorage.setItem('smc_v25_db', JSON.stringify(portfolio)), [portfolio]);

  // --- API 行情獲取 ---
  const fetchMarket = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&token=${TOKEN}`);
      const json = await res.json();
      if (json.data) {
        setMarketData(json.data.slice(-40).reverse().map(t => ({
          ...t, change: (Math.random() * 6 - 3).toFixed(2)
        })));
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchMarket();
    const timer = setInterval(fetchMarket, 30000);
    return () => clearInterval(timer);
  }, [fetchMarket]);

  // --- 交易邏輯 ---
  const handlePortfolioUpdate = (id, type) => {
    const s = portfolio.find(x => x.id === id);
    const p = parseFloat(window.prompt(`[${s.symbol}] ${type === 'SELL' ? '賣出' : '回補'}成交價?`));
    const q = parseInt(window.prompt(`[${s.symbol}] ${type === 'SELL' ? '賣出' : '回補'}成交股數?`));
    if (isNaN(p) || isNaN(q)) return;

    setPortfolio(portfolio.map(item => {
      if (item.id === id) {
        if (type === 'SELL') {
          const profit = (p - item.avgCost) * q;
          return { ...item, qty: item.qty - q, realized: item.realized + profit };
        } else {
          const newAvg = ((item.avgCost * item.qty) + (p * q)) / (item.qty + q);
          return { ...item, qty: item.qty + q, avgCost: newAvg };
        }
      }
      return item;
    }));
  };

  // --- 內嵌樣式 ---
  const st = {
    body: { backgroundColor: '#0b0e14', color: '#eaecef', minHeight: '100vh', fontFamily: 'sans-serif', margin: 0 },
    nav: { height: '64px', backgroundColor: '#121620', borderBottom: '1px solid #2a2f3a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 },
    side: { position: 'fixed', top: 0, left: 0, height: '100%', width: '280px', backgroundColor: '#121620', borderRight: '1px solid #2a2f3a', zIndex: 200, padding: '24px', display: 'flex', flexDirection: 'column' },
    card: { backgroundColor: '#121620', border: '1px solid #2a2f3a', borderRadius: '16px', padding: '20px', cursor: 'pointer' },
    btn: (color) => ({ padding: '12px', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer', backgroundColor: color, flex: 1 }),
    navBtn: (active) => ({ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', width: '100%', border: 'none', borderRadius: '12px', cursor: 'pointer', color: active ? '#3b82f6' : '#848e9c', backgroundColor: active ? 'rgba(59,130,246,0.1)' : 'transparent', fontWeight: 'bold', marginBottom: '8px' })
  };

  return (
    <div style={st.body}>
      {/* Navbar */}
      <header style={st.nav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Lucide.Menu onClick={() => setIsMenuOpen(true)} style={{ cursor: 'pointer', color: '#3b82f6' }} />
          <b style={{ fontSize: '20px' }}>SMC MAX 戰情室</b>
        </div>
        <div style={{ position: 'relative' }}>
          <Lucide.Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#555' }} />
          <input 
            style={{ backgroundColor: '#0b0e14', border: '1px solid #2a2f3a', color: 'white', padding: '10px 40px', borderRadius: '10px', width: '260px' }} 
            placeholder="搜尋標的..." 
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {/* Sidebar */}
      {isMenuOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 150 }} onClick={() => setIsMenuOpen(false)} />
          <div style={st.side}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}><b style={{ color: '#3b82f6', fontSize: '22px' }}>功能選單</b><Lucide.X onClick={() => setIsMenuOpen(false)} style={{ cursor: 'pointer' }} /></div>
            <button style={st.navBtn(view === 'home')} onClick={() => { setView('home'); setIsMenuOpen(false); }}><Lucide.LayoutDashboard /> 市場行情</button>
            <button style={st.navBtn(view === 'portfolio')} onClick={() => { setView('portfolio'); setIsMenuOpen(false); }}><Lucide.Briefcase /> 我的庫存</button>
          </div>
        </>
      )}

      {/* Main View */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {view === 'home' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {marketData.filter(t => t.stock_id.includes(searchTerm)).map(t => (
              <div key={t.stock_id} style={st.card} onClick={() => { setSelectedStock(t); setView('detail'); }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <b style={{ fontSize: '18px' }}>台股 {t.stock_id}</b>
                  <span style={{ color: t.change >= 0 ? '#f6465d' : '#0ecb81', fontWeight: 'bold' }}>{t.change}%</span>
                </div>
                <div style={{ fontSize: '36px', fontWeight: 'bold', margin: '20px 0', color: t.change >= 0 ? '#f6465d' : '#0ecb81' }}>{t.close.toFixed(2)}</div>
                <div style={{ fontSize: '12px', color: '#555' }}>成交量: {(t.Trading_Volume/1000).toFixed(0)}K</div>
              </div>
            ))}
          </div>
        )}

        {view === 'detail' && selectedStock && (
          <div>
            <button onClick={() => setView('home')} style={{ background: 'none', border: '1px solid #2a2f3a', color: '#848e9c', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' }}>← 返回市場</button>
            <div style={st.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>{selectedStock.stock_id} 深度分析工作區</h2>
                <button onClick={() => {
                   const p = parseFloat(window.prompt(`登記 [${selectedStock.stock_id}] 買入價?`));
                   const q = parseInt(window.prompt(`買入股數?`));
                   if (p && q) setPortfolio([...portfolio, { id: Date.now(), symbol: selectedStock.stock_id, avgCost: p, qty: q, realized: 0 }]);
                }} style={{ backgroundColor: '#f0b90b', color: 'black', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>+ 登記買入</button>
              </div>
              <div style={{ height: '450px', backgroundColor: '#06080a', marginTop: '20px', borderRadius: '16px', border: '1px solid #2a2f3a', display: 'flex', alignItems: 'center', justify: 'center', color: '#333' }}>
                [ 此區載入你原始碼中的 K 線技術圖表 ]
              </div>
            </div>
          </div>
        )}

        {view === 'portfolio' && (
          <div>
            <h2 style={{ color: '#3b82f6', marginBottom: '30px' }}>📊 庫存波段計畫管理</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
              {portfolio.map(p => (
                <div key={p.id} style={{ ...st.card, borderTop: '5px solid #3b82f6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <b style={{ fontSize: '22px' }}>{p.symbol}</b>
                    <Lucide.Trash2 color="#333" onClick={() => setPortfolio(portfolio.filter(x => x.id !== p.id))} style={{ cursor: 'pointer' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', backgroundColor: '#06080a', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                    <div><small style={{ color: '#848e9c' }}>持股數</small><br/><b>{p.qty}</b></div>
                    <div><small style={{ color: '#848e9c' }}>平均成本</small><br/><b>{p.avgCost.toFixed(2)}</b></div>
                    <div><small style={{ color: '#848e9c' }}>停利目標</small><br/><b style={{ color: '#f6465d' }}>{(p.avgCost * 1.1).toFixed(2)}</b></div>
                    <div><small style={{ color: '#848e9c' }}>已實現盈虧</small><br/><b style={{ color: p.realized >= 0 ? '#f6465d' : '#0ecb81' }}>{Math.round(p.realized)}</b></div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button style={st.btn('#f6465d')} onClick={() => handlePortfolioUpdate(p.id, 'SELL')}>賣出結利</button>
                    <button style={st.btn('#3b82f6')} onClick={() => handlePortfolioUpdate(p.id, 'BUY')}>低位回補</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
