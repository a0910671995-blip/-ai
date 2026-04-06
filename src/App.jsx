import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, RefreshCw, Search, Wallet, 
  BarChart2, Globe, Trash2, LayoutDashboard, 
  Menu, X, Target, Briefcase
} from 'lucide-react';

const App = () => {
  // --- 1. 狀態管理 ---
  const [view, setView] = useState('home'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [marketTickers, setMarketTickers] = useState([]); 
  
  const [portfolio, setPortfolio] = useState(() => {
    const saved = localStorage.getItem('smc_portfolio_v19');
    return saved ? JSON.parse(saved) : [];
  });

  const TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkYXRlIjoiMjAyNi0wNC0wNiAxODoyOToxNSIsInVzZXJfaWQiOiJ0aW5nMDkwMiIsImVtYWlsIjoiYTA5MTA2NzE5OTVAZ21haWwuY29tIiwiaXAiOiIxMjMuMjA0LjE5OC4xMDgifQ._aQwOaw9SopLidA7fEgZzAY02nyPX6jLudW6_TwODMA";

  // --- 2. 資料處理 ---
  useEffect(() => {
    localStorage.setItem('smc_portfolio_v19', JSON.stringify(portfolio));
  }, [portfolio]);

  const fetchMarketData = useCallback(async () => {
    try {
      setLoading(true);
      // 串接 FinMind 台股即時行情
      const res = await fetch(`https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&token=${TOKEN}`);
      const json = await res.json();
      if (json.data) {
        // 過濾掉異常數據，取最新成交資訊
        const latest = json.data.slice(-100).reverse();
        setMarketTickers(latest);
      }
    } catch (e) { 
      console.error("行情抓取失敗:", e); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => {
    fetchMarketData();
    const timer = setInterval(fetchMarketData, 30000); 
    return () => clearInterval(timer);
  }, [fetchMarketData]);

  // --- 3. 交易邏輯 ---
  const addToPortfolio = (symbol, price) => {
    const cost = parseFloat(window.prompt(`[${symbol}] 請輸入買入均價`, price));
    const qty = parseInt(window.prompt(`[${symbol}] 請輸入初始股數`, 1000));
    if (isNaN(cost) || isNaN(qty)) return;

    setPortfolio([...portfolio, {
      id: Date.now(),
      symbol,
      avgCost: cost,
      qty: qty,
      realizedProfit: 0,
      lastLivePrice: price
    }]);
    alert("已成功加入庫存");
  };

  const handleTrade = (id, type) => {
    const item = portfolio.find(p => p.id === id);
    const p = parseFloat(window.prompt(`${type === 'SELL' ? '賣出' : '回補'}單價?`, item.lastLivePrice));
    const q = parseInt(window.prompt(`${type === 'SELL' ? '賣出' : '回補'}股數?`, item.qty));
    if (isNaN(p) || isNaN(q)) return;

    setPortfolio(portfolio.map(s => {
      if (s.id === id) {
        if (type === 'SELL') {
          const profit = (p - s.avgCost) * q;
          return { ...s, qty: s.qty - q, realizedProfit: s.realizedProfit + profit };
        } else {
          const totalCost = (s.avgCost * s.qty) + (p * q);
          const newQty = s.qty + q;
          return { ...s, qty: newQty, avgCost: totalCost / newQty };
        }
      }
      return s;
    }));
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 font-sans">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-[#121620]/95 backdrop-blur border-b border-[#2a2f3a] px-4 h-16 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsMenuOpen(true)} className="p-2 hover:bg-[#2a2f3a] rounded-lg transition-colors">
            <Menu className="w-6 h-6 text-slate-300" />
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <Globe className="w-6 h-6 text-blue-400" />
            <span className="text-xl font-black tracking-tighter">SMC MAX</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-[#1a1e27] px-4 py-2 rounded-xl border border-[#2a2f3a]">
          <Wallet className="w-4 h-4 text-blue-400" />
          <span className="font-mono text-sm font-bold">
            ${portfolio.reduce((acc, s) => acc + (s.avgCost * s.qty), 0).toLocaleString(undefined, {maximumFractionDigits:0})}
          </span>
        </div>
      </header>

      {/* Sidebar Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="w-72 bg-[#121620] border-r border-[#2a2f3a] p-6 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-2 text-blue-400 font-bold">
                <LayoutDashboard className="w-5 h-5" /> 控制面板
              </div>
              <X className="cursor-pointer text-slate-500 hover:text-white" onClick={() => setIsMenuOpen(false)} />
            </div>
            <nav className="space-y-3">
              <button onClick={() => { setView('home'); setIsMenuOpen(false); }} className={`flex items-center gap-4 w-full p-4 rounded-xl font-bold transition ${view === 'home' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-[#2a2f3a]'}`}>
                <TrendingUp className="w-5 h-5" /> 全球市場行情
              </button>
              <button onClick={() => { setView('portfolio'); setIsMenuOpen(false); }} className={`flex items-center gap-4 w-full p-4 rounded-xl font-bold transition ${view === 'portfolio' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-[#2a2f3a]'}`}>
                <Briefcase className="w-5 h-5" /> 庫存波段管理
              </button>
            </nav>
          </div>
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* VIEW: 市場行情 (首頁) */}
        {view === 'home' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-3xl font-black text-white">市場行情</h2>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="搜尋股票代號..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-[#161a1e] border border-[#2a2f3a] rounded-xl text-white focus:border-blue-500 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {marketTickers
                .filter(t => t.stock_id.includes(searchTerm))
                .map(ticker => (
                <div key={`${ticker.stock_id}-${ticker.date}`} className="bg-[#121620] border border-[#2a2f3a] p-6 rounded-2xl hover:border-blue-500/50 transition-all group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-bold text-xl text-white">{ticker.stock_id}</span>
                    <span className="text-[#f6465d] text-sm font-bold bg-[#f6465d]/10 px-2 py-0.5 rounded">LIVE</span>
                  </div>
                  <div className="text-3xl font-mono font-black mb-6 text-white">{ticker.close}</div>
                  <button 
                    onClick={() => addToPortfolio(ticker.stock_id, ticker.close)}
                    className="w-full py-3 bg-blue-600/10 text-blue-400 rounded-xl text-sm font-bold group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm"
                  >
                    建立監控
                  </button>
                </div>
              ))}
              {loading && <div className="col-span-full text-center py-20 text-slate-500 flex flex-col items-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" /> 正在抓取全市場數據...
              </div>}
            </div>
          </div>
        )}

        {/* VIEW: 庫存管理 */}
        {view === 'portfolio' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <h2 className="text-3xl font-black text-white">波段庫存監控</h2>
            
            {portfolio.length === 0 ? (
              <div className="text-center py-24 bg-[#121620] rounded-3xl border-2 border-dashed border-[#2a2f3a]">
                <p className="text-slate-500 text-lg">目前尚無庫存計畫，請前往「市場行情」加入標的</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {portfolio.map(s => {
                  const tp = (s.avgCost * 1.1).toFixed(2);
                  const sl = (s.avgCost * 0.93).toFixed(2);
                  return (
                    <div key={s.id} className="bg-[#121620] border border-[#2a2f3a] p-8 rounded-3xl relative overflow-hidden shadow-xl">
                      <div className="absolute top-0 left-0 w-2 h-full bg-blue-600" />
                      
                      <div className="flex justify-between items-center mb-8">
                        <div>
                          <h3 className="text-3xl font-black text-white mb-2">{s.symbol}</h3>
                          <span className="text-sm text-slate-500 font-mono bg-[#1a1e27] px-3 py-1 rounded-full border border-[#2a2f3a]">
                            平均成本: {s.avgCost.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-500 block mb-1 uppercase tracking-widest">SMC Target</span>
                          <span className="font-black text-red-500 text-xl">{tp}</span>
                          <span className="mx-2 text-slate-700">|</span>
                          <span className="font-black text-green-500 text-xl">{sl}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 bg-[#0b0e14] p-5 rounded-2xl mb-8 text-center border border-[#2a2f3a]">
                        <div><span className="text-xs text-slate-500 block mb-1">股數</span><div className="font-bold text-white">{s.qty}</div></div>
                        <div><span className="text-xs text-slate-500 block mb-1">已落袋</span><div className="text-red-500 font-bold">{Math.round(s.realizedProfit).toLocaleString()}</div></div>
                        <div><span className="text-xs text-slate-500 block mb-1">投入本金</span><div className="font-bold text-white">{Math.round(s.avgCost * s.qty).toLocaleString()}</div></div>
                        <div className="flex items-center justify-center">
                          <button onClick={() => setPortfolio(portfolio.filter(x => x.id !== s.id))} className="p-3 text-slate-700 hover:text-red-500 transition-colors">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <button onClick={() => handleTrade(s.id, 'SELL')} className="flex-1 bg-red-600/10 text-red-500 py-4 rounded-2xl font-black border border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-lg">賣出結利</button>
                        <button onClick={() => handleTrade(s.id, 'BUY')} className="flex-1 bg-blue-600/10 text-blue-500 py-4 rounded-2xl font-black border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all shadow-lg">低位回補</button>
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
};

export default App;
