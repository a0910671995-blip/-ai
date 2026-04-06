import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, RefreshCw, Search, Wallet, 
  BarChart2, Globe, Trash2, LayoutDashboard, 
  Menu, X, Target, Briefcase, LineChart, ChevronRight 
} from 'lucide-react';

const App = () => {
  // --- 1. 狀態與資料管理 ---
  const [view, setView] = useState('home'); // home | portfolio
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [marketData, setMarketData] = useState([]); // 存放行情
  const [loading, setLoading] = useState(false);

  // 庫存資料 (LocalStorage)
  const [portfolio, setPortfolio] = useState(() => {
    try {
      const saved = localStorage.getItem('smc_v23_portfolio');
      return saved ? JSON.parse(saved) : [];
    } catch(e) { return []; }
  });

  const TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkYXRlIjoiMjAyNi0wNC0wNiAxODoyOToxNSIsInVzZXJfaWQiOiJ0aW5nMDkwMiIsImVtYWlsIjoiYTA5MTA2NzE5OTVAZ21haWwuY29tIiwiaXAiOiIxMjMuMjA0LjE5OC4xMDgifQ._aQwOaw9SopLidA7fEgZzAY02nyPX6jLudW6_TwODMA";

  useEffect(() => {
    localStorage.setItem('smc_v23_portfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  // --- 2. 即時報價連線 ---
  const fetchMarket = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&token=${TOKEN}`);
      const json = await res.json();
      if (json.data) {
        // 抓取最近 40 筆作為首頁行情展示
        const latest = json.data.slice(-40).reverse().map(t => ({
          ...t,
          change: (Math.random() * 4 - 2).toFixed(2) // 模擬漲跌幅
        }));
        setMarketData(latest);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchMarket();
    const timer = setInterval(fetchMarket, 30000);
    return () => clearInterval(timer);
  }, [fetchMarket]);

  // --- 3. 核心交易與均價邏輯 ---
  const addToPortfolio = (t) => {
    const cost = parseFloat(window.prompt(`[${t.stock_id}] 買入單價?`, t.close));
    const qty = parseInt(window.prompt(`買入股數?`, "1000"));
    if (isNaN(cost) || isNaN(qty)) return;

    setPortfolio([...portfolio, {
      id: Date.now(),
      symbol: t.stock_id,
      avgCost: cost,
      qty: qty,
      realizedProfit: 0,
      livePrice: t.close
    }]);
    alert("已成功加入庫存監控");
  };

  const handleTrade = (id, type) => {
    const item = portfolio.find(p => p.id === id);
    const p = parseFloat(window.prompt(`${type === 'SELL' ? '賣出' : '回補'}成交價?`, item.livePrice));
    const q = parseInt(window.prompt(`${type === 'SELL' ? '賣出' : '回補'}股數? (持股 ${item.qty})`));
    if (isNaN(p) || isNaN(q)) return;

    setPortfolio(portfolio.map(s => {
      if (s.id === id) {
        if (type === 'SELL') {
          if (q > s.qty) { alert("庫存不足"); return s; }
          const profit = (p - s.avgCost) * q;
          return { ...s, qty: s.qty - q, realizedProfit: s.realizedProfit + profit };
        } else {
          // 關鍵：回補攤平均價計算
          const newAvg = ((s.avgCost * s.qty) + (p * q)) / (s.qty + q);
          return { ...s, qty: s.qty + q, avgCost: newAvg };
        }
      }
      return s;
    }));
  };

  // --- 4. 內嵌樣式定義 (復刻你提供的 SMC 原始碼風格) ---
  const styles = {
    body: { backgroundColor: '#06080a', color: '#eaecef', minHeight: '100vh', fontFamily: 'sans-serif', margin: 0 },
    navbar: { height: '64px', backgroundColor: '#0b0e14', borderBottom: '1px solid #1a1e23', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', position: 'sticky', top: 0, zIndex: 100 },
    sidebar: { position: 'fixed', top: 0, left: 0, height: '100%', width: '260px', backgroundColor: '#0b0e14', borderRight: '1px solid #1a1e23', zIndex: 200, padding: '20px', display: 'flex', flexDirection: 'column', boxShadow: '10px 0 30px rgba(0,0,0,0.5)' },
    overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 150 },
    card: { backgroundColor: '#0f1216', border: '1px solid #1a1e23', borderRadius: '12px', padding: '20px', transition: '0.2s', cursor: 'pointer' },
    main: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
    navItem: (active) => ({ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', width: '100%', border: 'none', borderRadius: '10px', cursor: 'pointer', color: active ? '#3b82f6' : '#848e9c', backgroundColor: active ? 'rgba(59,130,246,0.1)' : 'transparent', textAlign: 'left', fontWeight: 'bold', marginBottom: '10px' }),
    price: (up) => ({ fontSize: '32px', fontWeight: 'bold', color: up ? '#f6465d' : '#0ecb81', margin: '15px 0', fontFamily: 'monospace' }),
    badge: (up) => ({ backgroundColor: up ? 'rgba(246, 70, 93, 0.1)' : 'rgba(14, 203, 129, 0.1)', color: up ? '#f6465d' : '#0ecb81', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }),
    btnTrade: (color) => ({ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer', backgroundColor: color }),
  };

  return (
    <div style={styles.body}>
      {/* 導航列 */}
      <header style={styles.navbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Menu onClick={() => setIsMenuOpen(true)} style={{ cursor: 'pointer', color: '#3b82f6' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LineChart color="#3b82f6" />
            <b style={{ fontSize: '18px', letterSpacing: '1px' }}>SMC MAX 戰情室</b>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#555' }} />
          <input 
            style={{ backgroundColor: '#06080a', border: '1px solid #1a1e23', color: 'white', padding: '10px 15px 10px 40px', borderRadius: '8px', width: '280px', outline: 'none' }} 
            placeholder="搜尋代號或名稱..." 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {/* 側邊選單 */}
      {isMenuOpen && (
        <>
          <div style={styles.overlay} onClick={() => setIsMenuOpen(false)} />
          <div style={styles.sidebar}>
            <div style={{ display: 'flex', justify: 'space-between', marginBottom: '40px' }}>
              <b style={{ color: '#3b82f6', fontSize: '20px' }}>系統目錄</b>
              <X onClick={() => setIsMenuOpen(false)} style={{ cursor: 'pointer' }} />
            </div>
            <button style={styles.navItem(view === 'home')} onClick={() => { setView('home'); setIsMenuOpen(false); }}>
              <LayoutDashboard size={22} /> 市場即時行情
            </button>
            <button style={styles.navItem(view === 'portfolio')} onClick={() => { setView('portfolio'); setIsMenuOpen(false); }}>
              <Briefcase size={22} /> 庫存波段管理
            </button>
          </div>
        </>
      )}

      {/* 主畫面內容 */}
      <main style={styles.main}>
        {view === 'home' && (
          <div style={{ animation: 'fadeIn 0.5s' }}>
            <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TrendingUp color="#f6465d" /> 即時行情總覽
            </h2>
            <div style={styles.grid}>
              {marketData.filter(t => t.stock_id.includes(searchTerm)).map(t => {
                const isUp = parseFloat(t.change) >= 0;
                return (
                  <div key={t.stock_id} style={styles.card} onClick={() => addToPortfolio(t)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <b style={{ fontSize: '18px' }}>台股 {t.stock_id}</b>
                      <div style={styles.badge(isUp)}>{isUp ? '+' : ''}{t.change}%</div>
                    </div>
                    <div style={styles.price(isUp)}>{t.close.toFixed(2)}</div>
                    <div style={{ fontSize: '11px', color: '#555', display: 'flex', justifyContent: 'space-between' }}>
                      <span>成交量: {(t.Trading_Volume / 1000).toFixed(0)}K</span>
                      <span style={{ color: '#3b82f6' }}>點擊建立計畫 +</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'portfolio' && (
          <div style={{ animation: 'fadeIn 0.5s' }}>
            <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', color: '#3b82f6' }}>
              <Target /> SMC 波段控盤計畫
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
              {portfolio.map(p => {
                const tp = (p.avgCost * 1.1).toFixed(2);
                const sl = (p.avgCost * 0.93).toFixed(2);
                const unrealized = Math.round((marketData.find(m => m.stock_id === p.symbol)?.close || p.avgCost - p.avgCost) * p.qty);

                return (
                  <div key={p.id} style={{ ...styles.card, borderTop: '5px solid #3b82f6', cursor: 'default' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <b style={{ fontSize: '22px' }}>{p.symbol} <small style={{ fontWeight: 'normal', color: '#555', fontSize: '12px' }}>LONG STRATEGY</small></b>
                      <Trash2 color="#333" onClick={() => setPortfolio(portfolio.filter(x => x.id !== p.id))} style={{ cursor: 'pointer' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', backgroundColor: '#06080a', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
                      <div><small style={{ color: '#848e9c' }}>持股數</small><br /><b>{p.qty}</b></div>
                      <div><small style={{ color: '#848e9c' }}>均價</small><br /><b>{p.avgCost.toFixed(2)}</b></div>
                      <div style={{ color: '#f6465d' }}><small style={{ color: '#848e9c' }}>停利目標</small><br /><b>{tp}</b></div>
                      <div style={{ color: '#0ecb81' }}><small style={{ color: '#848e9c' }}>止損防線</small><br /><b>{sl}</b></div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button style={styles.btnTrade('#f6465d')} onClick={() => handleTrade(p.id, 'SELL')}>賣出結利</button>
                      <button style={styles.btnTrade('#3b82f6')} onClick={() => handleTrade(p.id, 'BUY')}>拉回回補</button>
                    </div>

                    <div style={{ marginTop: '15px', textAlign: 'center', borderTop: '1px solid #1a1e23', paddingTop: '10px' }}>
                      <small style={{ color: '#848e9c' }}>已實現總損益：</small>
                      <b style={{ color: p.realizedProfit >= 0 ? '#f6465d' : '#0ecb81' }}>${Math.round(p.realizedProfit)}</b>
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
