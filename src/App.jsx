import React, { useState, useEffect, useCallback } from 'react';
import * as Lucide from 'lucide-react';

// ==========================================
// 1. 全域內嵌樣式 (徹底解決 Tailwind 跑版問題)
// ==========================================
const st = {
  app: { backgroundColor: '#06080a', color: '#eaecef', minHeight: '100vh', fontFamily: 'sans-serif', margin: 0, paddingBottom: '40px' },
  nav: { height: '64px', backgroundColor: '#0b0e14', borderBottom: '1px solid #1a1e23', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 },
  side: { position: 'fixed', top: 0, left: 0, height: '100%', width: '280px', backgroundColor: '#0b0e14', borderRight: '1px solid #1a1e23', zIndex: 200, padding: '24px', display: 'flex', flexDirection: 'column' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 150 },
  main: { maxWidth: '1200px', margin: '0 auto', padding: '24px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
  card: { backgroundColor: '#0f1216', border: '1px solid #1a1e23', borderRadius: '16px', padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column' },
  badge: (up) => ({ backgroundColor: up ? 'rgba(246, 70, 93, 0.1)' : 'rgba(14, 203, 129, 0.1)', color: up ? '#f6465d' : '#0ecb81', padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }),
  price: (up) => ({ fontSize: '36px', fontWeight: 'bold', color: up ? '#f6465d' : '#0ecb81', margin: '16px 0', fontFamily: 'monospace' }),
  navBtn: (active) => ({ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', width: '100%', border: 'none', borderRadius: '12px', cursor: 'pointer', color: active ? '#3b82f6' : '#848e9c', backgroundColor: active ? 'rgba(59,130,246,0.1)' : 'transparent', fontWeight: 'bold', marginBottom: '8px', textAlign: 'left' }),
  actionBtn: (color) => ({ flex: 1, padding: '12px', backgroundColor: color, border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer' })
};

// ==========================================
// 2. K線圖表元件 (復刻自你的 GitHub 原始碼)
// ==========================================
const KLineChart = ({ data }) => {
  if (!data || data.length === 0) return <div style={{ color: '#555', textAlign: 'center', padding: '100px 0' }}>載入圖表數據中...</div>;
  
  const width = 800; const height = 300; const padding = 20;
  const visibleData = data.slice(-60); // 顯示最近 60 根 K 線
  const minPrice = Math.min(...visibleData.map(d => d.low));
  const maxPrice = Math.max(...visibleData.map(d => d.high));
  const range = maxPrice - minPrice || 1;
  const xStep = (width - padding * 2) / visibleData.length;
  
  const getY = (p) => height - padding - ((p - minPrice) / range) * (height - padding * 2);

  return (
    <div style={{ width: '100%', overflowX: 'auto', backgroundColor: '#06080a', borderRadius: '12px', border: '1px solid #1a1e23' }}>
      <svg width={width} height={height} style={{ display: 'block', margin: '0 auto' }}>
        {visibleData.map((k, i) => {
          const x = padding + i * xStep;
          const isUp = k.close >= k.open;
          const color = isUp ? '#f6465d' : '#0ecb81';
          return (
            <g key={i}>
              <line x1={x + xStep/2} y1={getY(k.high)} x2={x + xStep/2} y2={getY(k.low)} stroke={color} strokeWidth="1.5" />
              <rect x={x + 2} y={Math.min(getY(k.open), getY(k.close))} width={Math.max(xStep - 4, 1)} height={Math.max(Math.abs(getY(k.open) - getY(k.close)), 1)} fill={color} />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ==========================================
// 3. 主程式應用
// ==========================================
export default function App() {
  const [view, setView] = useState('home'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [marketData, setMarketData] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);

  // 庫存帳簿資料
  const [portfolio, setPortfolio] = useState(() => {
    try {
      const saved = localStorage.getItem('smc_v27_portfolio');
      return saved ? JSON.parse(saved) : [];
    } catch(e) { return []; }
  });

  useEffect(() => localStorage.setItem('smc_v27_portfolio', JSON.stringify(portfolio)), [portfolio]);

  // --- 透過 Proxy 抓取 Yahoo Finance 真實數據 ---
  const fetchYahooData = async (symbol) => {
    try {
      const targetUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.TW?range=3mo&interval=1d`);
      const res = await fetch(`https://api.allorigins.win/get?url=${targetUrl}`);
      const json = await res.json();
      const data = JSON.parse(json.contents);
      
      const result = data.chart.result[0];
      const quote = result.indicators.quote[0];
      const price = result.meta.regularMarketPrice;
      const prevClose = result.meta.previousClose;
      const change = (((price - prevClose) / prevClose) * 100).toFixed(2);
      
      const history = result.timestamp.map((t, i) => ({
        time: t * 1000, open: quote.open[i], high: quote.high[i], low: quote.low[i], close: quote.close[i], volume: quote.volume[i]
      })).filter(k => k.close != null);

      return { stock_id: symbol, price, change, volume: quote.volume[quote.volume.length-1], history };
    } catch (e) { console.error(`[${symbol}] 抓取失敗`); return null; }
  };

  // 初始載入熱門台股
  useEffect(() => {
    const initSymbols = ['2313', '2330', '0050', '3481', '2887'];
    const loadInitData = async () => {
      const results = await Promise.all(initSymbols.map(s => fetchYahooData(s)));
      setMarketData(results.filter(r => r !== null));
    };
    loadInitData();
  }, []);

  // 搜尋功能
  const handleSearch = async (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (val.length >= 4 && !marketData.find(m => m.stock_id === val)) {
      const newData = await fetchYahooData(val);
      if (newData) setMarketData(prev => [newData, ...prev]);
    }
  };

  // --- 交易邏輯 (庫存頁面) ---
  const handleTrade = (id, type) => {
    const s = portfolio.find(x => x.id === id);
    const p = parseFloat(window.prompt(`請輸入 ${type==='SELL'?'賣出':'回補'} 成交價格?`));
    const q = parseInt(window.prompt(`請輸入成交股數?`));
    
    if (isNaN(p) || isNaN(q)) return;

    setPortfolio(portfolio.map(item => {
      if (item.id === id) {
        if (type === 'SELL') {
          if (q > item.qty) { alert('庫存不足!'); return item; }
          const profit = (p - item.avgCost) * q;
          return { ...item, qty: item.qty - q, realized: item.realized + profit };
        } else {
          // 均價攤平計算
          const newAvg = ((item.avgCost * item.qty) + (p * q)) / (item.qty + q);
          return { ...item, qty: item.qty + q, avgCost: newAvg };
        }
      }
      return item;
    }));
  };

  return (
    <div style={st.app}>
      {/* 導航列 */}
      <header style={st.nav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Lucide.Menu onClick={() => setIsMenuOpen(true)} style={{ cursor: 'pointer', color: '#3b82f6' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Lucide.LineChart color="#3b82f6" />
            <b style={{ fontSize: '20px', letterSpacing: '1px' }}>SMC 戰情室</b>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <Lucide.Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#555' }} />
          <input 
            style={{ backgroundColor: '#06080a', border: '1px solid #1a1e23', color: 'white', padding: '10px 15px 10px 36px', borderRadius: '8px', width: '280px', outline: 'none' }} 
            placeholder="輸入台股代碼自動搜尋..." 
            onChange={handleSearch} value={searchTerm}
          />
        </div>
      </header>

      {/* 側邊選單 */}
      {isMenuOpen && (
        <>
          <div style={st.overlay} onClick={() => setIsMenuOpen(false)} />
          <div style={st.side}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
              <b style={{ color: '#3b82f6', fontSize: '22px' }}>系統目錄</b>
              <Lucide.X onClick={() => setIsMenuOpen(false)} style={{ cursor: 'pointer' }} />
            </div>
            <button style={st.navBtn(view === 'home')} onClick={() => { setView('home'); setIsMenuOpen(false); }}>
              <Lucide.LayoutDashboard size={20}/> 市場即時行情
            </button>
            <button style={st.navBtn(view === 'portfolio')} onClick={() => { setView('portfolio'); setIsMenuOpen(false); }}>
              <Lucide.Briefcase size={20}/> 我的庫存帳簿
            </button>
          </div>
        </>
      )}

      {/* 內容區 */}
      <main style={st.main}>
        
        {/* 視圖一：首頁行情 */}
        {view === 'home' && (
          <div style={st.grid}>
            {marketData.filter(t => t.stock_id.includes(searchTerm)).map(t => {
              const isUp = parseFloat(t.change) >= 0;
              return (
                <div key={t.stock_id} style={st.card} onClick={() => { setSelectedStock(t); setView('detail'); }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <b style={{ fontSize: '20px' }}>台股 {t.stock_id}</b>
                    <div style={st.badge(isUp)}>{isUp ? '+' : ''}{t.change}%</div>
                  </div>
                  <div style={st.price(isUp)}>{t.price.toFixed(2)}</div>
                  <div style={{ fontSize: '13px', color: '#848e9c', display: 'flex', justifyContent: 'space-between' }}>
                    <span>成交量: {(t.volume / 1000).toFixed(0)}K</span>
                    <span style={{ color: '#3b82f6' }}>進入分析 ❯</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 視圖二：個股分析工作區 */}
        {view === 'detail' && selectedStock && (
          <div style={{ animation: 'fadeIn 0.5s' }}>
            <button onClick={() => setView('home')} style={{ background: 'transparent', border: '1px solid #1a1e23', color: '#848e9c', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' }}>← 返回市場總覽</button>
            <div style={{ ...st.card, cursor: 'default' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ color: '#3b82f6', margin: '0 0 8px 0' }}>{selectedStock.stock_id} 深度分析</h2>
                  <span style={{ color: '#848e9c', fontSize: '14px' }}>即時報價: <b style={{ color: 'white' }}>{selectedStock.price}</b></span>
                </div>
                <button onClick={() => {
                   const p = parseFloat(window.prompt(`準備買入 [${selectedStock.stock_id}]，請輸入成交價?`, selectedStock.price));
                   const q = parseInt(window.prompt(`請輸入買入股數?`, 1000));
                   if (p && q) {
                     setPortfolio([{ id: Date.now(), symbol: selectedStock.stock_id, avgCost: p, qty: q, realized: 0 }, ...portfolio]);
                     alert("已成功加入我的庫存帳簿！");
                   }
                }} style={{ backgroundColor: '#f0b90b', color: 'black', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  + 登記買入庫存
                </button>
              </div>
              
              {/* 這裡調用上方復刻的 K 線元件 */}
              <KLineChart data={selectedStock.history} />
            </div>
          </div>
        )}

        {/* 視圖三：庫存波段帳簿 */}
        {view === 'portfolio' && (
          <div>
            <h2 style={{ color: '#3b82f6', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Lucide.Target /> 波段庫存管理 (4萬資金專用)
            </h2>
            {portfolio.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', border: '1px dashed #1a1e23', borderRadius: '16px', color: '#555' }}>
                目前庫存為空，請前往「市場行情」選擇標的並登記買入。
              </div>
            ) : (
              <div style={st.grid}>
                {portfolio.map(p => {
                  const tp = (p.avgCost * 1.1).toFixed(2);
                  const sl = (p.avgCost * 0.93).toFixed(2);
                  return (
                    <div key={p.id} style={{ ...st.card, cursor: 'default', borderTop: '5px solid #3b82f6' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <b style={{ fontSize: '24px' }}>{p.symbol}</b>
                        <Lucide.Trash2 size={20} color="#444" onClick={() => setPortfolio(portfolio.filter(x => x.id !== p.id))} style={{ cursor: 'pointer' }} />
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: '#06080a', padding: '16px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center' }}>
                        <div><span style={{ fontSize: '12px', color: '#848e9c' }}>持有股數</span><br/><b style={{ fontSize: '18px' }}>{p.qty}</b></div>
                        <div><span style={{ fontSize: '12px', color: '#848e9c' }}>平均成本</span><br/><b style={{ fontSize: '18px' }}>{p.avgCost.toFixed(2)}</b></div>
                        <div><span style={{ fontSize: '12px', color: '#848e9c' }}>停利 (+10%)</span><br/><b style={{ color: '#f6465d', fontSize: '16px' }}>{tp}</b></div>
                        <div><span style={{ fontSize: '12px', color: '#848e9c' }}>停損 (-7%)</span><br/><b style={{ color: '#0ecb81', fontSize: '16px' }}>{sl}</b></div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                        <button style={st.actionBtn('#f6465d')} onClick={() => handleTrade(p.id, 'SELL')}>賣出結利</button>
                        <button style={st.actionBtn('#3b82f6')} onClick={() => handleTrade(p.id, 'BUY')}>拉回回補</button>
                      </div>

                      <div style={{ textAlign: 'center', borderTop: '1px solid #1a1e23', paddingTop: '12px' }}>
                        <span style={{ fontSize: '12px', color: '#848e9c' }}>已實現總利潤：</span>
                        <b style={{ color: p.realized >= 0 ? '#f6465d' : '#0ecb81', fontSize: '18px' }}>${Math.round(p.realized)}</b>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
