import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as Lucide from 'lucide-react';

// ==========================================
// 1. 樣式定義 (Inline CSS 確保 100% 不跑版)
// ==========================================
const s = {
  body: { backgroundColor: '#06080a', color: '#eaecef', minHeight: '100vh', fontFamily: 'sans-serif', margin: 0 },
  nav: { height: '64px', backgroundColor: '#0b0e14', borderBottom: '1px solid #1a1e23', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 },
  card: { backgroundColor: '#0f1216', border: '1px solid #1a1e23', borderRadius: '16px', padding: '20px', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', padding: '24px' },
  side: { position: 'fixed', top: 0, left: 0, height: '100%', width: '280px', backgroundColor: '#0b0e14', borderRight: '1px solid #1a1e23', zIndex: 200, padding: '24px' },
  price: (up) => ({ fontSize: '32px', fontWeight: 'bold', color: up ? '#f6465d' : '#0ecb81', margin: '12px 0', fontFamily: 'monospace' }),
  navBtn: (active) => ({ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', width: '100%', border: 'none', borderRadius: '12px', cursor: 'pointer', color: active ? '#3b82f6' : '#848e9c', backgroundColor: active ? 'rgba(59,130,246,0.1)' : 'transparent', fontWeight: 'bold', marginBottom: '8px', textAlign: 'left' })
};

export default function App() {
  const [view, setView] = useState('home'); 
  const [selectedStock, setSelectedStock] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [marketData, setMarketData] = useState([]);
  const [klines, setKlines] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [portfolio, setPortfolio] = useState(() => {
    const saved = localStorage.getItem('smc_v26_db');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => localStorage.setItem('smc_v26_db', JSON.stringify(portfolio)), [portfolio]);

  // ==========================================
  // 2. 核心：Yahoo Finance API 抓取邏輯
  // ==========================================
  const fetchYahooPrice = async (symbol) => {
    try {
      // 使用與你原始碼類似的代理邏輯，或直接請求 (在開發環境)
      const proxy = "https://api.allorigins.win/get?url=";
      const target = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.TW`);
      const res = await fetch(`${proxy}${target}`);
      const json = await res.json();
      const data = JSON.parse(json.contents);
      
      const result = data.chart.result[0];
      const quote = result.indicators.quote[0];
      const price = result.meta.regularMarketPrice;
      const prevClose = result.meta.previousClose;
      const change = (((price - prevClose) / prevClose) * 100).toFixed(2);
      
      // 整理成 K 線格式
      const history = result.timestamp.map((t, i) => ({
        time: t * 1000,
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: quote.close[i]
      })).filter(k => k.close != null);

      return { price, change, history, volume: quote.volume[quote.volume.length-1] };
    } catch (e) { return null; }
  };

  // 初始化首頁熱門股 (如 2313, 2330, 0050, 2409 等)
  useEffect(() => {
    const symbols = ['2313', '2330', '0050', '2409', '3481', '2303'];
    const loadMarket = async () => {
      const results = await Promise.all(symbols.map(async s => {
        const d = await fetchYahooPrice(s);
        return d ? { stock_id: s, ...d } : null;
      }));
      setMarketData(results.filter(r => r !== null));
    };
    loadMarket();
  }, []);

  // ==========================================
  // 3. 庫存交易邏輯 (回補、賣出、均價)
  // ==========================================
  const tradeAction = (id, type) => {
    const s = portfolio.find(x => x.id === id);
    const p = parseFloat(window.prompt(`${type==='SELL'?'賣出':'回補'}價格?`));
    const q = parseInt(window.prompt(`${type==='SELL'?'賣出':'回補'}股數?`));
    if (isNaN(p) || isNaN(q)) return;

    setPortfolio(portfolio.map(item => {
      if (item.id === id) {
        if (type === 'SELL') {
          return { ...item, qty: item.qty - q, realized: item.realized + (p - item.avgCost) * q };
        } else {
          const newAvg = ((item.avgCost * item.qty) + (p * q)) / (item.qty + q);
          return { ...item, qty: item.qty + q, avgCost: newAvg };
        }
      }
      return item;
    }));
  };

  return (
    <div style={s.body}>
      {/* 導航 */}
      <header style={s.nav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Lucide.Menu onClick={() => setIsMenuOpen(true)} style={{ cursor: 'pointer', color: '#3b82f6' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lucide.LineChart color="#3b82f6" />
            <b style={{ fontSize: '18px' }}>SMC MAX 戰情室</b>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <Lucide.Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#555' }} />
          <input 
            style={{ backgroundColor: '#0b0e14', border: '1px solid #1a1e23', color: 'white', padding: '10px 40px', borderRadius: '10px', width: '260px' }} 
            placeholder="搜尋代號 (如: 2313)..." onChange={async (e) => {
              const val = e.target.value;
              setSearchTerm(val);
              if(val.length === 4) {
                 const d = await fetchYahooPrice(val);
                 if(d) setMarketData([{stock_id: val, ...d}, ...marketData]);
              }
            }}
          />
        </div>
      </header>

      {/* 側邊選單 */}
      {isMenuOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 150 }} onClick={() => setIsMenuOpen(false)} />
          <div style={s.side}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}><b style={{ color: '#3b82f6', fontSize: '22px' }}>功能導航</b><Lucide.X onClick={() => setIsMenuOpen(false)} style={{ cursor: 'pointer' }} /></div>
            <button style={s.navBtn(view === 'home')} onClick={() => { setView('home'); setIsMenuOpen(false); }}><Lucide.LayoutDashboard /> 市場行情</button>
            <button style={s.navBtn(view === 'portfolio')} onClick={() => { setView('portfolio'); setIsMenuOpen(false); }}><Lucide.Briefcase /> 我的庫存</button>
          </div>
        </>
      )}

      {/* 內容區域 */}
      <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {view === 'home' && (
          <div style={s.grid}>
            {marketData.map(t => {
              const isUp = parseFloat(t.change) >= 0;
              return (
                <div key={t.stock_id} style={s.card} onClick={async () => {
                  const d = await fetchYahooPrice(t.stock_id);
                  setSelectedStock({...t, history: d.history});
                  setView('detail');
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <b style={{ fontSize: '18px' }}>台股 {t.stock_id}</b>
                    <div style={{ color: isUp ? '#f6465d' : '#0ecb81', fontWeight: 'bold' }}>{isUp ? '+' : ''}{t.change}%</div>
                  </div>
                  <div style={s.price(isUp)}>{t.price.toFixed(2)}</div>
                  <div style={{ fontSize: '11px', color: '#555' }}>成交量: {(t.volume/1000).toFixed(0)}K ❯</div>
                </div>
              );
            })}
          </div>
        )}

        {view === 'detail' && selectedStock && (
          <div style={{ padding: '24px' }}>
            <button onClick={() => setView('home')} style={{ background: 'none', border: '1px solid #2a2f3a', color: '#848e9c', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' }}>← 返回市場</button>
            <div style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ color: '#3b82f6' }}>{selectedStock.stock_id} 即時分析</h2>
                <button onClick={() => {
                   const p = parseFloat(window.prompt(`登記 [${selectedStock.stock_id}] 買入價?`));
                   const q = parseInt(window.prompt(`股數?`));
                   if (p && q) setPortfolio([...portfolio, { id: Date.now(), symbol: selectedStock.stock_id, avgCost: p, qty: q, realized: 0, live: selectedStock.price }]);
                }} style={{ backgroundColor: '#f0b90b', color: 'black', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>+ 登記買入</button>
              </div>
              <div style={{ height: '400px', backgroundColor: '#06080a', marginTop: '20px', borderRadius: '16px', border: '1px solid #2a2f3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 {/* 此處可繪製 K 線，目前以占位顯示 Yahoo 資料連線成功 */}
                 <div style={{ textAlign: 'center' }}>
                   <Lucide.TrendingUp size={48} color="#f6465d" />
                   <p style={{ color: '#eaecef' }}>Yahoo 即時 K 線數據已讀取 (最新: {selectedStock.price})</p>
                   <small style={{ color: '#444' }}>[ 已獲取 {selectedStock.history?.length} 根蠟燭圖數據 ]</small>
                 </div>
              </div>
            </div>
          </div>
        )}

        {view === 'portfolio' && (
          <div style={{ padding: '24px' }}>
            <h2 style={{ color: '#3b82f6', marginBottom: '30px' }}>波段滾動帳簿 (4萬本金)</h2>
            <div style={s.grid}>
              {portfolio.map(p => (
                <div key={p.id} style={{ ...s.card, borderTop: '5px solid #3b82f6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <b style={{ fontSize: '22px' }}>{p.symbol}</b>
                    <Lucide.Trash2 size={18} color="#333" onClick={() => setPortfolio(portfolio.filter(x => x.id !== p.id))} style={{ cursor: 'pointer' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', backgroundColor: '#06080a', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                    <div><small style={{ color: '#848e9c' }}>持股數</small><br/><b>{p.qty}</b></div>
                    <div><small style={{ color: '#848e9c' }}>均價</small><br/><b>{p.avgCost.toFixed(2)}</b></div>
                    <div style={{ color: '#f6465d' }}><small style={{ color: '#848e9c' }}>停利 10%</small><br/><b>{(p.avgCost * 1.1).toFixed(2)}</b></div>
                    <div style={{ color: p.realized >= 0 ? '#f6465d' : '#0ecb81' }}><small style={{ color: '#848e9c' }}>已實現</small><br/><b>{Math.round(p.realized)}</b></div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => tradeAction(p.id, 'SELL')} style={{ flex: 1, padding: '12px', backgroundColor: '#f6465d', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold' }}>賣出</button>
                    <button onClick={() => tradeAction(p.id, 'BUY')} style={{ flex: 1, padding: '12px', backgroundColor: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold' }}>回補</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
