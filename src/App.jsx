import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  TrendingUp, RefreshCw, Search, Wallet, 
  BarChart2, LineChart, Globe, 
  ArrowUpRight, ArrowDownRight, Trash2,
  LayoutDashboard, briefcase, Menu, X, ChevronRight, Target
} from 'lucide-react';

const App = () => {
  // --- 1. 狀態管理 ---
  const [view, setView] = useState('home'); // 'home' 或 'portfolio'
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [marketTickers, setMarketTickers] = useState([]); // 首頁行情
  
  // 庫存帳戶資料 (LocalStorage)
  const [portfolio, setPortfolio] = useState(() => {
    const saved = localStorage.getItem('smc_portfolio_v18');
    return saved ? JSON.parse(saved) : [];
  });

  const TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkYXRlIjoiMjAyNi0wNC0wNiAxODoyOToxNSIsInVzZXJfaWQiOiJ0aW5nMDkwMiIsImVtYWlsIjoiYTA5MTA2NzE5OTVAZ21haWwuY29tIiwiaXAiOiIxMjMuMjA0LjE5OC4xMDgifQ._aQwOaw9SopLidA7fEgZzAY02nyPX6jLudW6_TwODMA";

  // --- 2. 自動儲存與資料抓取 ---
  useEffect(() => {
    localStorage.setItem('smc_portfolio_v18', JSON.stringify(portfolio));
  }, [portfolio]);

  // 抓取全市場即時行情 (模仿你 GitHub 的 overview 邏輯)
  const fetchMarketData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&token=${TOKEN}`);
      const json = await res.json();
      if (json.data) {
        // 取最新的前 100 筆熱門股做展示
        setMarketTickers(json.data.slice(-100).reverse());
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchMarketData();
    const timer = setInterval(fetchMarketData, 30000); // 30秒更新一次
    return () => clearInterval(timer);
  }, [fetchMarketData]);

  // --- 3. 核心邏輯：庫存操作 ---
  const addToPortfolio = (symbol, price) => {
    const cost = parseFloat(prompt(`[${symbol}] 買入均價?`, price));
    const qty = parseInt(prompt(`[${symbol}] 買入股數?`, 1000));
    if (isNaN(cost) || isNaN(qty)) return;

    const newItem = {
      id: Date.now(),
      symbol,
      avgCost: cost,
      qty: qty,
      realizedProfit: 0,
      lastLivePrice: price
    };
    setPortfolio([...portfolio, newItem]);
    alert("已加入庫存監控");
  };

  const handleTrade = (id, type) => {
    const item = portfolio.find(p => p.id === id);
    const p = parseFloat(prompt(`${type === 'SELL' ? '賣出' : '回補'}成交價?`, item.lastLivePrice));
    const q = parseInt(prompt(`${type === 'SELL' ? '賣出' : '回補'}股數?`, item.qty));
    if (isNaN(p) || isNaN(q)) return;

    setPortfolio(portfolio.map(s => {
      if (s.id === id) {
        if (type === 'SELL') {
          const profit = (p - s.avgCost) * q;
          return { ...s, qty: s.qty - q, realizedProfit: s.realizedProfit + profit };
        } else {
          const newAvg = ((s.avgCost * s.qty) + (p * q)) / (s.qty + q);
          return { ...s, qty: s.qty + q, avgCost: newAvg };
        }
      }
      return s;
    }));
  };

  // --- 4. 樣式組件 (完全寫入 JSX) ---
  const theme = {
    bg: "bg-[#0b0e14]",
    card: "bg-[#121620] border border-[#2a2f3a]",
    input: "bg-[#0b0e14] border border-[#2a2f3a] text-white focus:border-blue-500",
    primary: "text-[#f0b90b]",
    red: "text-[#f6465d]",
    green: "text-[#0ecb81]"
  };

  return (
    <div className={`min-h-screen ${theme.bg} text-slate-100 font-sans`}>
      {/* 導航欄 */}
      <header className="sticky top-0 z-50 bg-[#121620]/95 backdrop-blur border-b border-[#2a2f3a] px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 hover:bg-[#2a2f3a] rounded-lg">
            <Menu className="w-6 h-6 text-slate-300" />
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <Globe className="w-6 h-6 text-blue-400" />
            <span className="text-xl font-black tracking-tighter hidden sm:block">SMC MAX</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-[#1a1e27] px-4 py-2 rounded-xl border border-[#2a2f3a]">
          <Wallet className="w-4 h-4 text-blue-400" />
          <span className="font-mono text-sm font-bold">
            ${portfolio.reduce((acc, s) => acc + (s.avgCost * s.qty), 0).toLocaleString()}
          </span>
        </div>
      </header>

      {/* 左側側邊欄選單 */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="w-64 bg-[#121620] border-r border-[#2a2f3a] p-6 animate-in slide-in-from-left duration-200">
            <div className="flex justify-between items-center mb-8">
              <span className="font-bold text-blue-400">系統導航</span>
              <X className="cursor-pointer" onClick={() => setIsMenuOpen(false)} />
            </div>
            <nav className="space-y-4">
              <button onClick={() => { setView('home'); setIsMenuOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded-xl transition ${view === 'home' ? 'bg-blue-600 text-white' : 'hover:bg-[#2a2f3a]'}`}>
                <LayoutDashboard className="w-5 h-5" /> 市場行情
              </button>
              <button onClick={() => { setView('portfolio'); setIsMenuOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded-xl transition ${view === 'portfolio' ? 'bg-blue-600 text-white' : 'hover:bg-[#2a2f3a]'}`}>
                <BarChart2 className="w-5 h-5" /> 庫存管理
              </button>
            </nav>
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setIsMenuOpen(false)} />
        </div>
      )}

      {/* 主內容區 */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* 視圖 1: 首頁行情 (跟 GitHub 的樣式一致) */}
        {view === 'home' && (
          <div className="
