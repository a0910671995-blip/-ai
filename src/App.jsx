import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, RefreshCw, Search, Wallet, 
  BarChart2, Globe, Trash2, LayoutDashboard, 
  Menu, X, Target, Briefcase, LineChart
} from 'lucide-react';

const App = () => {
  const [view, setView] = useState('home'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [marketTickers, setMarketTickers] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [portfolio, setPortfolio] = useState(() => {
    const saved = localStorage.getItem('smc_portfolio_v21');
    return saved ? JSON.parse(saved) : [];
  });

  const TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkYXRlIjoiMjAyNi0wNC0wNiAxODoyOToxNSIsInVzZXJfaWQiOiJ0aW5nMDkwMiIsImVtYWlsIjoiYTA5MTA2NzE5OTVAZ21haWwuY29tIiwiaXAiOiIxMjMuMjA0LjE5OC4xMDgifQ._aQwOaw9SopLidA7fEgZzAY02nyPX6jLudW6_TwODMA";

  useEffect(() => {
    localStorage.setItem('smc_portfolio_v21', JSON.stringify(portfolio));
  }, [portfolio]);

  const fetchMarketData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&token=${TOKEN}`);
      const json = await res.json();
      if (json.data) {
        setMarketTickers(json.data.slice(-40).reverse().map(t => ({
          ...t,
          change: (Math.random() * 6 - 3).toFixed(2)
        })));
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchMarketData();
    const timer = setInterval(fetchMarketData, 30000);
    return () => clearInterval(timer);
  }, [fetchMarketData]);

  // --- 樣式定義 (Inline Styles) ---
  const s = {
    body: { backgroundColor: '#06080a', color: '#eaecef', minHeight: '100vh', fontFamily: 'sans-serif', margin: 0 },
    header: { height: '64px', backgroundColor: '#0b0e14', borderBottom: '1px solid #1a1e23', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 },
    logoArea: { display: 'flex', alignItems: 'center', gap: '24px' },
    menuBtn: { backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', color: '#3b82f6' },
    searchBar: { backgroundColor: '#0b0e14', border: '1px solid #1a1e23', borderRadius: '6px', color: 'white', padding: '8px 12px 8px 36px', width: '300px', outline: 'none' },
    sidebar: { position: 'fixed', top: 0, left: 0, height: '100%', width: '260px', backgroundColor: '#0b0e14', borderRight: '1px solid #1a1e23', zIndex: 200, padding: '24px' },
    overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 150 },
    navItem: (active) => ({ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: active ? 'rgba(59, 130, 246, 0.1)' : 'transparent', color: active ? '#3b82f6' : '#848e9c', cursor: 'pointer', marginBottom: '8px', fontWeight: 'bold' }),
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', padding: '24px' },
    card: { backgroundColor: '#0f1216', border: '1px solid #1a1e23', borderRadius: '12px', padding: '20px', cursor: 'pointer' },
    badge: (isUp) => ({ backgroundColor: isUp ? 'rgba(246, 70, 93, 0.1)' : 'rgba(14, 203, 129, 0.1)', color: isUp ? '#f6465d' : '#0ecb81', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }),
    priceText: (isUp) => ({ fontSize: '32px', fontWeight: 'bold', margin: '16px 0', color: isUp ? '#f6465d' : '#0ecb81', fontFamily: 'monospace' }),
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#0f1216', padding: '24px', borderRadius: '12px', border: '1px solid #1a1e23', marginBottom: '24px' }
  };

  const handleTrade = (ticker, type) => {
    const cost = parseFloat(window.prompt(`[${ticker.stock_id}] 買入價?`, ticker.close));
    const qty = parseInt(window.prompt(`[${ticker.stock_id}] 股數?`, 1000));
    if (!isNaN(cost) && !isNaN(qty)) {
      setPortfolio([...portfolio, { id: Date.now(), symbol: ticker.stock_id, avgCost: cost, qty, profit: 0, live: ticker.close }]);
      alert("已存入庫存管理");
    }
  };

  return (
    <div style={s.body}>
      {/* 導航欄 */}
      <header style={s.header}>
        <div style={s.logoArea}>
          <button style={s.menuBtn} onClick={() => setIsMenuOpen(true)}><Menu /></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LineChart color="#3b82f6" />
            <b style={{ fontSize: '18px' }}>台灣股市與 ETF</b>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#555' }} />
          <input 
            style={s.searchBar} 
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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
              <b style={{ color: '#3b82f6' }}>系統選單</b>
              <X onClick={() => setIsMenuOpen(false)} style={{ cursor: 'pointer' }} />
            </div>
            <button style={s.navItem(view === 'home')} onClick={() => { setView('home'); setIsMenuOpen(false); }}>
              <LayoutDashboard size={20} /> 市場行情
            </button>
            <button style={s.navItem(view === 'portfolio')} onClick={() => { setView('portfolio'); setIsMenuOpen(false); }}>
              <Briefcase size={20} /> 我的庫存
            </button>
          </div>
        </>
      )}

      {/* 內容區 */}
      <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {view === 'home' && (
          <div style={s.grid}>
            {marketTickers.filter(t => t.stock_id.includes(searchTerm)).map(t => {
              const isUp = parseFloat(t.change) >= 0;
              return (
                <div key={t.stock_id} style={s.card} onClick={() => handleTrade(t)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <b style={{ fontSize: '18px' }}>台股 {t.stock_id}</b>
                      <div style={{ fontSize: '12px', color: '#848e9c', marginTop: '4px' }}>即時監控中</div>
                    </div>
                    <div style={s.badge(isUp)}>{isUp ? '+' : ''}{t.change}%</div>
                  </div>
                  <div style={s.priceText(isUp)}>{t.close.toFixed(2)}</div>
                  <div style={{ fontSize: '11px', color: '#555' }}>成交量：{t.Trading_Volume}</div>
                </div>
              );
            })}
          </div>
        )}

        {view === 'portfolio' && (
          <div style={{ padding: '24px' }}>
            <h2 style={{ color: '#3b82f6', marginBottom: '24px' }}>SMC 庫存管理計畫</h2>
            {portfolio.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', border: '1px dashed #1a1e23', borderRadius: '16px', color: '#555' }}>目前尚無庫存計畫</div>
            ) : (
              portfolio.map(p => {
                const tp = (p.avgCost * 1.1).toFixed(2);
                const sl = (p.avgCost * 0.93).toFixed(2);
                return (
                  <div key={p.id} style={{ ...s.card, borderLeft: '6px solid #3b82f6', marginBottom: '16px', cursor: 'default' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <b style={{ fontSize: '20px' }}>{p.symbol} <small style={{ fontWeight: 'normal', color: '#555' }}>台股計畫</small></b>
                      <div style={{ textAlign: 'right', fontSize: '12px' }}>
                        <div style={{ color: '#f6465d' }}>停利目標：{tp}</div>
                        <div style={{ color: '#0ecb81' }}>保命停損：{sl}</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', backgroundColor: '#06080a', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                      <div><small style={{ color: '#848e9c' }}>持股</small><br /><b>{p.qty}</b></div>
                      <div><small style={{ color: '#848e9c' }}>成本均價</small><br /><b>{p.avgCost}</b></div>
                      <div onClick={() => setPortfolio(portfolio.filter(x => x.id !== p.id))} style={{ cursor: 'pointer', color: '#444' }}>
                        <Trash2 size={16} style={{ marginTop: '8px' }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
