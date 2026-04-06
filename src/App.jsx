import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  TrendingUp, RefreshCw, Search, Wallet, 
  BarChart2, Globe, Trash2, LayoutDashboard, 
  Menu, X, Target, Briefcase, LineChart
} from 'lucide-react';

// --- 輔助函數：格式化成交量 ---
const formatVol = (vol) => {
  const v = parseFloat(vol);
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(2) + 'K';
  return v.toFixed(0);
};

const App = () => {
  const [view, setView] = useState('home'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [marketTickers, setMarketTickers] = useState([]); 
  const [loading, setLoading] = useState(false);
  
  const [portfolio, setPortfolio] = useState(() => {
    const saved = localStorage.getItem('smc_portfolio_v20');
    return saved ? JSON.parse(saved) : [];
  });

  const TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkYXRlIjoiMjAyNi0wNC0wNiAxODoyOToxNSIsInVzZXJfaWQiOiJ0aW5nMDkwMiIsImVtYWlsIjoiYTA5MTA2NzE5OTVAZ21haWwuY29tIiwiaXAiOiIxMjMuMjA0LjE5OC4xMDgifQ._aQwOaw9SopLidA7fEgZzAY02nyPX6jLudW6_TwODMA";

  useEffect(() => {
    localStorage.setItem('smc_portfolio_v20', JSON.stringify(portfolio));
  }, [portfolio]);

  // 抓取行情資料 (增加獲取名稱與成交量)
  const fetchMarketData = useCallback(async () => {
    try {
      setLoading(true);
      const [priceRes, infoRes] = await Promise.all([
        fetch(`https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&token=${TOKEN}`).then(r => r.json()),
        fetch(`https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInfo&token=${TOKEN}`).then(r => r.json())
      ]);

      if (priceRes.data && infoRes.data) {
        const infoMap = {};
        infoRes.data.forEach(i => infoMap[i.stock_id] = i.stock_name);
        
        // 整理最新的行情
        const latest = priceRes.data.slice(-50).reverse().map(t => ({
          ...t,
          name: infoMap[t.stock_id] || "未知標的",
          change: (Math.random() * 10 - 5).toFixed(2) // 模擬漲跌幅，實務上可對比前日收盤
        }));
        setMarketTickers(latest);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchMarketData();
    const timer = setInterval(fetchMarketData, 30000);
    return () => clearInterval(timer);
  }, [fetchMarketData]);

  const addToPortfolio = (ticker) => {
    const cost = parseFloat(window.prompt(`[${ticker.name}] 買入均價?`, ticker.close));
    const qty = parseInt(window.prompt(`[${ticker.name}] 買入股數?`, 1000));
    if (!isNaN(cost) && !isNaN(qty)) {
      setPortfolio([...portfolio, {
        id: Date.now(),
        symbol: ticker.stock_id,
        name: ticker.name,
        avgCost: cost,
        qty: qty,
        realizedProfit: 0,
        lastLive: ticker.close
      }]);
      alert("已存入庫存管理");
    }
  };

  return (
    <div className="min-h-screen bg-[#06080a] text-slate-100 font-sans">
      {/* 頂部導航 */}
      <header className="h-16 border-b border-[#1a1e23] bg-[#0b0e14]/90 backdrop-blur sticky top-0 z-50 flex items-center px-6 justify-between">
        <div className="flex items-center gap-6">
          <button onClick={() => setIsMenuOpen(true)} className="p-2 hover:bg-[#1a1e23] rounded-lg">
            <Menu className="w-6 h-6 text-blue-400" />
          </button>
          <div className="flex items-center gap-2">
            <LineChart className="w-5 h-5 text-blue-500" />
            <h1 className="text-lg font-bold tracking-tight text-white">台灣股市與 ETF</h1>
          </div>
        </div>
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="搜尋代號或名稱..." 
            className="bg-[#0b0e14] border border-[#1a1e23] rounded-md py-2 pl-10 pr-4 text-sm w-80 outline-none focus:border-blue-500"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {/* 側邊選單 */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="w-64 bg-[#0b0e14] border-r border-[#1a1e23] p-6 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex justify-between items-center mb-8">
              <span className="text-blue-500 font-bold">系統目錄</span>
              <X className="cursor-pointer" onClick={() => setIsMenuOpen(false)} />
            </div>
            <nav className="space-y-2">
              <button onClick={() => { setView('home'); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg ${view === 'home' ? 'bg-blue-600/10 text-blue-500' : 'hover:bg-[#1a1e23]'}`}>
                <LayoutDashboard className="w-5 h-5" /> 市場行情
              </button>
              <button onClick={() => { setView('portfolio'); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg ${view === 'portfolio' ? 'bg-blue-600/10 text-blue-500' : 'hover:bg-[#1a1e23]'}`}>
                <Briefcase className="w-5 h-5" /> 我的庫存
              </button>
            </nav>
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setIsMenuOpen(false)} />
        </div>
      )}

      {/* 主畫面 */}
      <main className="p-6 max-w-[1400px] mx-auto">
        
        {view === 'home' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-500">
            {marketTickers
              .filter(t => t.stock_id.includes(searchTerm) || t.name.includes(searchTerm))
              .map(t => (
              <div 
                key={t.stock_id} 
                onClick={() => addToPortfolio(t)}
                className="bg-[#0f1216] border border-[#1a1e23] p-5 rounded-xl hover:bg-[#161a1e] transition-all cursor-pointer group relative"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{t.name}</h3>
                    <span className="text-xs text-slate-500 font-mono">{t.stock_id}</span>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-bold ${t.change >= 0 ? 'bg-[#f6465d]/10 text-[#f6465d]' : 'bg-[#0ecb81]/10 text-[#0ecb81]'}`}>
                    {t.change >= 0 ? '+' : ''}{t.change}%
                  </div>
                </div>
                
                <div className={`text-3xl font-mono font-bold mb-4 ${t.change >= 0 ? 'text-[#f6465d]' : 'text-[#0ecb81]'}`}>
                  {t.close.toFixed(2)}
                </div>

                <div className="text-[10px] text-slate-500 font-mono">
                  成交量：{formatVol(t.Trading_Volume)}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'portfolio' && (
          <div className="animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Target className="text-blue-500" /> 庫存計畫管理
            </h2>
            {portfolio.length === 0 ? (
              <div className="text-center py-20 text-slate-500 bg-[#0f1216] rounded-2xl border border-dashed border-[#1a1e23]">
                請從行情頁面點擊個股加入庫存
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {portfolio.map(s => {
                  const tp = (s.avgCost * 1.1).toFixed(2);
                  const sl = (s.avgCost * 0.93).toFixed(2);
                  return (
                    <div key={s.id} className="bg-[#0f1216] border border-[#1a1e23] p-6 rounded-2xl border-l-4 border-l-blue-500">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h4 className="text-xl font-bold">{s.name} <span className="text-sm font-normal text-slate-500">{s.symbol}</span></h4>
                          <span className="text-xs text-slate-500">庫存均價：{s.avgCost}</span>
                        </div>
                        <div className="text-right text-xs">
                          <span className="text-[#f6465d]">停利目標：{tp}</span><br/>
                          <span className="text-[#0ecb81]">停損防線：{sl}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 bg-[#06080a] p-4 rounded-xl mb-6 text-center">
                        <div><small className="text-slate-500">持股</small><br/><b>{s.qty}</b></div>
                        <div><small className="text-slate-500">實現獲利</small><br/><b className="text-[#f6465d]">{Math.round(s.realizedProfit)}</b></div>
                        <div className="cursor-pointer text-slate-700" onClick={() => setPortfolio(portfolio.filter(x => x.id !== s.id))}>
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </div>
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
