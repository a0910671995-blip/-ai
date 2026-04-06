import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Search, Wallet, BarChart2, 
  Globe, Trash2, LayoutDashboard, Menu, 
  X, Target, Briefcase, LineChart 
} from 'lucide-react';

const App = () => {
  const [view, setView] = useState('home'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 初始數據 (防止 API 失敗時畫面全黑)
  const [marketTickers, setMarketTickers] = useState([
    { stock_id: '2313', close: 260.0, Trading_Volume: 119230, change: -2.26 },
    { stock_id: '2330', close: 780.0, Trading_Volume: 45000, change: +1.52 },
    { stock_id: '0050', close: 155.2, Trading_Volume: 89000, change: -0.45 }
  ]);

  const [portfolio, setPortfolio] = useState(() => {
    try {
      const saved = localStorage.getItem('smc_v22_data');
      return saved ? JSON.parse(saved) : [];
    } catch(e) { return []; }
  });

  // 樣式物件
  const s = {
    body: { backgroundColor: '#06080a', color: '#eaecef', minHeight: '100vh', fontFamily: 'sans-serif' },
    header: { height: '64px', backgroundColor: '#0b0e14', borderBottom: '1px solid #1a1e23', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', position: 'sticky', top: 0, zIndex: 100 },
    sidebar: { position: 'fixed', top: 0, left: 0, height: '100%', width: '250px', backgroundColor: '#0b0e14', borderRight: '1px solid #1a1e23', zIndex: 200, padding: '20px', display: 'flex', flexDirection: 'column' },
    overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 150 },
    card: { backgroundColor: '#0f1216', border: '1px solid #1a1e23', borderRadius: '12px', padding: '16px', cursor: 'pointer' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px', padding: '20px' },
    btn: { backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%' },
    navBtn: (active) => ({ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', width: '100%', border: 'none', borderRadius: '8px', cursor: 'pointer', color: active ? '#3b82f6' : '#848e9c', backgroundColor: active ? 'rgba(59,130,246,0.1)' : 'transparent', textAlign: 'left', marginBottom: '8px' })
  };

  useEffect(() => {
    localStorage.setItem('smc_v22_data', JSON.stringify(portfolio));
  }, [portfolio]);

  // 新增到庫存
  const handleAdd = (t) => {
    const cost = window.prompt(`請輸入 [${t.stock_id}] 的買入單價`, t.close);
    const qty = window.prompt(`請輸入買入股數`, "1000");
    if (cost && qty) {
      setPortfolio([...portfolio, { id: Date.now(), symbol: t.stock_id, avgCost: parseFloat(cost), qty: parseInt(qty), live: t.close }]);
      alert("庫存新增成功！");
    }
  };

  return (
    <div style={s.body}>
      {/* 頂部 */}
      <header style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Menu onClick={() => setIsMenuOpen(true)} style={{ cursor: 'pointer', color: '#3b82f6' }} />
          <LineChart color="#3b82f6" />
          <b style={{ fontSize: '18px' }}>台灣股市與 ETF</b>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#555' }} />
          <input 
            style={{ backgroundColor: '#0b0e14', border: '1px solid #1a1e23', color: 'white', padding: '8px 10px 8px 32px', borderRadius: '6px', width: '220px', outline: 'none' }} 
            placeholder="搜尋代號..." 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {/* 側邊選單 */}
      {isMenuOpen && (
        <>
          <div style={s.overlay} onClick={() => setIsMenuOpen(false)} />
          <div style={s.sidebar}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
              <b style={{ color: '#3b82f6' }}>系統選單</b>
              <X onClick={() => setIsMenuOpen(false)} style={{ cursor: 'pointer' }} />
            </div>
            <button style={s.navBtn(view === 'home')} onClick={() => { setView('home'); setIsMenuOpen(false); }}>
              <LayoutDashboard size={20} /> 市場行情
            </button>
            <button style={s.navBtn(view === 'portfolio')} onClick={() => { setView('portfolio'); setIsMenuOpen(false); }}>
              <Briefcase size={20} /> 我的庫存
            </button>
          </div>
        </>
      )}

      {/* 內容區 */}
      <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {view === 'home' && (
          <div style={s.grid}>
            {marketTickers.filter(t => t.stock_id.includes(searchTerm)).map(t => (
              <div key={t.stock_id} style={s.card} onClick={() => handleAdd(t)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <b style={{ fontSize: '18px' }}>{t.stock_id}</b>
                  <span style={{ color: t.change >= 0 ? '#f6465d' : '#0ecb81', fontSize: '12px', fontWeight: 'bold' }}>
                    {t.change >= 0 ? '+' : ''}{t.change}%
                  </span>
                </div>
                <div style={{ fontSize: '30px', fontWeight: 'bold', margin: '15px 0', color: t.change >= 0 ? '#f6465d' : '#0ecb81' }}>{t.close}</div>
                <div style={{ fontSize: '11px', color: '#555' }}>成交量：{(t.Trading_Volume / 1000).toFixed(0)}K</div>
              </div>
            ))}
          </div>
        )}

        {view === 'portfolio' && (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: '#3b82f6', marginBottom: '20px' }}>SMC 波段庫存計畫</h2>
            <div style={s.grid}>
              {portfolio.length === 0 ? (
                <p style={{ color: '#555' }}>目前無計畫，請從首頁加入股票。</p>
              ) : portfolio.map(p => {
                const tp = (p.avgCost * 1.1).toFixed(2);
                const sl = (p.avgCost * 0.93).toFixed(2);
                const unrealized = Math.round((p.live - p.avgCost) * p.qty);
                return (
                  <div key={p.id} style={{ ...s.card, borderLeft: '5px solid #3b82f6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                      <b style={{ fontSize: '20px' }}>{p.symbol}</b>
                      <Trash2 size={16} color="#444" onClick={() => setPortfolio(portfolio.filter(x => x.id !== p.id))} style={{ cursor: 'pointer' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', backgroundColor: '#06080a', padding: '10px', borderRadius: '8px' }}>
                      <div>均價: <b>{p.avgCost}</b></div>
                      <div>持股: <b>{p.qty}</b></div>
                      <div style={{ color: '#f6465d' }}>停利: {tp}</div>
                      <div style={{ color: '#0ecb81' }}>停損: {sl}</div>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '15px' }}>
                      未實現損益：<b style={{ color: unrealized >= 0 ? '#f6465d' : '#0ecb81' }}>{unrealized}</b>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
