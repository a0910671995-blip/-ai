import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  TrendingUp, RefreshCw, Search, Wallet, BarChart2, Globe, Trash2, 
  LayoutDashboard, Menu, X, Target, Briefcase, LineChart, ChevronRight, 
  ArrowLeft, Newspaper, Target as Crosshair
} from 'lucide-react';

// --- 內嵌樣式定義 (確保不跑版) ---
const s = {
  body: { backgroundColor: '#0b0e14', color: '#eaecef', minHeight: '100vh', fontFamily: 'sans-serif', margin: 0 },
  navbar: { height: '64px', backgroundColor: '#121620', borderBottom: '1px solid #2a2f3a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 },
  sidebar: { position: 'fixed', top: 0, left: 0, height: '100%', width: '280px', backgroundColor: '#121620', borderRight: '1px solid #2a2f3a', zIndex: 200, padding: '24px', boxShadow: '10px 0 30px rgba(0,0,0,0.5)' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 150 },
  card: { backgroundColor: '#121620', border: '1px solid #2a2f3a', borderRadius: '16px', padding: '20px', cursor: 'pointer', transition: '0.2s' },
  badge: (up) => ({ backgroundColor: up ? 'rgba(246, 70, 93, 0.1)' : 'rgba(14, 203, 129, 0.1)', color: up ? '#f6465d' : '#0ecb81', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }),
  navBtn: (active) => ({ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', width: '100%', border: 'none', borderRadius: '12px', cursor: 'pointer', color: active ? '#3b82f6' : '#848e9c', backgroundColor: active ? 'rgba(59,130,246,0.1)' : 'transparent', textAlign: 'left', fontWeight: 'bold', marginBottom: '8px' })
};

const App = () => {
  const [view, setView] = useState('home'); // home | detail | portfolio
  const [selectedStock, setSelectedStock] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [marketData, setMarketData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [portfolio, setPortfolio] = useState(() => {
    const saved = localStorage.getItem('smc_v24_portfolio');
    return saved ? JSON.parse(saved) : [];
  });

  const TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkYXRlIjoiMjAyNi0wNC0wNiAxODoyOToxNSIsInVzZXJfaWQiOiJ0aW5nMDkwMiIsImVtYWlsIjoiYTA5MTA2NzE5OTVAZ21haWwuY29tIiwiaXAiOiIxMjMuMjA0LjE5OC4xMDgifQ._aQwOaw9SopLidA7fEgZzAY02nyPX6jLudW6_TwODMA";

  useEffect(() => localStorage.setItem('smc_v24_portfolio', JSON.stringify(portfolio)), [portfolio]);

  // --- 1. 抓取行情 (首頁卡片) ---
  const fetchMarket = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&token=${TOKEN}`);
      const json = await res.json();
      if (json.data) {
        setMarketData(json.data.slice(-60).reverse().map(t => ({
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

  // --- 2. 庫存操作 (買入/賣出/回補) ---
  const handlePortfolioAction = (type, stockId) => {
    if (type === 'ADD') {
      const p = parseFloat(window.prompt(`[${stockId}] 登記買入價格?`));
      const q = parseInt(window.prompt(`登記買入股數?`, "1000"));
      if (!isNaN(p) && !isNaN(q)) {
        setPortfolio([...portfolio, { id: Date.now(), symbol: stockId, avgCost: p, qty: q, realized: 0, live: p }]);
        alert("已登記至庫存頁面");
      }
    } else if (type === 'TRADE') {
      const s = portfolio.find(x => x.id === stockId);
      const action = window.confirm(`[${s.symbol}] 按「確定」進行回補，按「取消」進行賣出`);
      const p = parseFloat(window.prompt(`成交價格?`));
      const q = parseInt(window.prompt(`成交股數?`));
      if (isNaN(p) || isNaN(q)) return;

      setPortfolio(portfolio.map(item => {
        if (item.id === stockId) {
          if (!action) { // 賣出
            const profit = (p - item.avgCost) * q;
            return { ...item, qty: item.qty - q, realized: item.realized + profit };
          } else { // 回補 (重新算均價)
            const newAvg = ((item.avgCost * item.qty) + (p * q)) / (item.qty + q);
            return { ...item, qty: item.qty + q, avgCost: newAvg };
          }
        }
        return item;
      }));
    }
  };

  return (
    <div style={s.body}>
      {/* 頂部導航 */}
      <header style={s.navbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Menu onClick={() => setIsMenuOpen(true)} style={{ cursor: 'pointer', color: '#3b82f6' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LineChart color="#3b82f6" size={24} />
            <b style={{ fontSize: '20px', letterSpacing: '1px' }}>SMC MAX 戰情室</b>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#555' }} />
          <input 
            style={{ backgroundColor: '#0b0e14', border: '1px solid #2a2f3a', color: 'white', padding: '10px 15px 10px 40px', borderRadius: '10px', width: '300px', outline: 'none' }} 
            placeholder="搜尋代號或名稱..." 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {/* 側邊選單 */}
      {isMenuOpen && (
        <>
          <div style={s.overlay} onClick={() => setIsMenuOpen(false)} />
          <div style={s.sidebar}>
            <div style={{ display: 'flex', justify: 'space-between', marginBottom: '40px' }}><b style={{ color: '#3b82f6', fontSize: '22px' }}>系統目錄</b><X onClick={() => setIsMenuOpen(false)} style={{ cursor: 'pointer' }} /></div>
            <button style={s.navBtn(view === 'home')} onClick={() => { setView('home'); setIsMenuOpen(false); }}><LayoutDashboard size={22} /> 市場行情</button>
            <button style={s.navBtn(view === 'portfolio')} onClick={() => { setView('portfolio'); setIsMenuOpen(false); }}><Briefcase size={22} /> 我的庫存</button>
          </div>
        </>
      )}

      {/* 主畫面 */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        
        {/* VIEW: 市場首頁 (復刻你提供的樣式) */}
        {view === 'home' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {marketData.filter(t => t.stock_id.includes(searchTerm)).map(t => (
              <div key={t.stock_id} style={s.card} onClick={() => { setSelectedStock(t); setView('detail'); }}>
                <div style={{ display: 'flex', justify: 'space-between', alignItems: 'start' }}>
                  <div><b style={{ fontSize: '18px' }}>台股 {t.stock_id}</b><div style={{ fontSize: '12px', color: '#848e9c', marginTop: '4px' }}>成交量: {(t.Trading_Volume/1000).toFixed(0)}K</div></div>
                  <div style={s.badge(parseFloat(t.change) >= 0)}>{t.change}%</div>
                </div>
                <div style={{ fontSize: '36px', fontWeight: 'bold', margin: '20px 0', color: parseFloat(t.change) >= 0 ? '#f6465d' : '#0ecb81', fontFamily: 'monospace' }}>{t.close.toFixed(2)}</div>
                <div style={{ textAlign: 'right', color: '#3b82f6', fontSize: '13px' }}>點擊進入深度分析 <ChevronRight size={14} /></div>
              </div>
            ))}
          </div>
        )}

        {/* VIEW: 個股深度分析 (復刻 K 線工作區) */}
        {view === 'detail' && selectedStock && (
          <div style={{ animation: 'fadeIn 0.5s' }}>
            <button onClick={() => setView('home')} style={{ backgroundColor: 'transparent', border: '1px solid #2a2f3a', color: '#848e9c', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' }}><ArrowLeft size={16} /> 返回行情</button>
            <div style={{ ...s.card, cursor: 'default', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><h2 style={{ margin: 0, color: '#3b82f6' }}>{selectedStock.stock_id} 分析工作區</h2><p style={{ color: '#555' }}>即時 K 線、三大法人籌碼與技術指標讀取中...</p></div>
              <button onClick={() => handlePortfolioAction('ADD', selectedStock.stock_id)} style={{ backgroundColor: '#f0b90b', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>登記買入庫存</button>
            </div>
            {/* 這裡可以嵌入你原始碼中的 <TwKLineChart /> 或其他分析組件 */}
            <div style={{ height: '400px', backgroundColor: '#06080a', marginTop: '20px', borderRadius: '16px', border: '1px solid #2a2f3a', display: 'flex', alignItems: 'center', justify: 'center', color: '#333' }}>
               [ 這裡加載你 GitHub 原始碼中的 K 線圖表引擎 ]
            </div>
          </div>
        )}

        {/* VIEW: 庫存記帳頁面 */}
        {view === 'portfolio' && (
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#3b82f6' }}><Target /> 波段滾動交易帳簿</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px', marginTop: '24px' }}>
              {portfolio.map(p => (
                <div key={p.id} style={{ ...s.card, cursor: 'default', borderTop: '5px solid #3b82f6' }}>
                  <div style={{ display: 'flex', justify: 'space-between', marginBottom: '15px' }}>
                    <b style={{ fontSize: '22px' }}>{p.symbol}</b>
                    <Trash2 size={18} color="#333" onClick={() => setPortfolio(portfolio.filter(x => x.id !== p.id))} style={{ cursor: 'pointer' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', backgroundColor: '#06080a', padding: '15px', borderRadius: '12px', marginBottom: '15px' }}>
                    <div><small style={{ color: '#848e9c' }}>持股數</small><br/><b>{p.qty}</b></div>
                    <div><small style={{ color: '#848e9c' }}>平均成本</small><br/><b>{p.avgCost.toFixed(2)}</b></div>
                    <div><small style={{ color: '#848e9c' }}>停利目標</small><br/><b style={{ color: '#f6465d' }}>{(p.avgCost * 1.1).toFixed(2)}</b></div>
                    <div><small style={{ color: '#848e9c' }}>已實現盈虧</small><br/><b style={{ color: p.realized >= 0 ? '#f6465d' : '#0ecb81' }}>{Math.round(p.realized)}</b></div>
                  </div>
                  <button onClick={() => handlePortfolioAction('TRADE', p.id)} style={{ width: '100%', padding: '12px', backgroundColor: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>執行 賣出 / 回補 交易</button>
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
