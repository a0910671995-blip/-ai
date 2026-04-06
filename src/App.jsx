import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TrendingUp, RefreshCw, Search, Target, Wallet, 
  BarChart2, LineChart, ChevronRight, Globe, 
  ArrowUpRight, ArrowDownRight, Trash2
} from 'lucide-react';

// ==========================================
// 1. 核心引擎：技術指標計算 (移植自你的 Github)
// ==========================================
const calculateIndicators = (klines) => {
  if (!klines || klines.length === 0) return [];
  const closePrices = klines.map(k => k.close);
  const result = [];
  
  for (let i = 0; i < klines.length; i++) {
    let ma5 = i >= 4 ? closePrices.slice(i-4, i+1).reduce((a,b)=>a+b)/5 : null;
    let ma20 = i >= 19 ? closePrices.slice(i-19, i+1).reduce((a,b)=>a+b)/20 : null;
    result.push({ ...klines[i], ma5, ma20 });
  }
  return result;
};

// ==========================================
// 2. 輔助函數
// ==========================================
const formatPrice = (p) => parseFloat(p).toFixed(2);

// ==========================================
// 3. 主程式入口
// ==========================================
export default function App() {
  const [stocks, setStocks] = useState(() => {
    const saved = localStorage.getItem('smc_v17_account');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [marketData, setMarketData] = useState({}); // 存放即時股價
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // 持久化儲存
  useEffect(() => {
    localStorage.setItem('smc_v17_account', JSON.stringify(stocks));
  }, [stocks]);

  // --- 核心功能：抓取即時股價 (FinMind API) ---
  const fetchLivePrice = useCallback(async (symbol) => {
    const TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkYXRlIjoiMjAyNi0wNC0wNiAxODoyOToxNSIsInVzZXJfaWQiOiJ0aW5nMDkwMiIsImVtYWlsIjoiYTA5MTA2NzE5OTVAZ21haWwuY29tIiwiaXAiOiIxMjMuMjA0LjE5OC4xMDgifQ._aQwOaw9SopLidA7fEgZzAY02nyPX6jLudW6_TwODMA";
    try {
      const res = await fetch(`https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${symbol}&token=${TOKEN}`);
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        return json.data[json.data.length - 1].close;
      }
      return null;
    } catch (e) { return null; }
  }, []);

  // 背景自動更新行情 (每 15 秒)
  useEffect(() => {
    const updateMarket = async () => {
      const symbols = [...new Set(stocks.map(s => s.symbol))];
      const newPrices = { ...marketData };
      for (let sym of symbols) {
        const p = await fetchLivePrice(sym);
        if (p) newPrices[sym] = p;
      }
      setMarketData(newPrices);
    };
    if (stocks.length > 0) updateMarket();
    const timer = setInterval(updateMarket, 15000);
    return () => clearInterval(timer);
  }, [stocks, fetchLivePrice]);

  // --- 功能：建立標的 ---
  const addNewStock = async () => {
    const sym = searchTerm.toUpperCase();
    const price = prompt(`${sym} 買入價格?`);
    const qty = prompt(`${sym} 買入股數?`);
    
    if (!price || !qty) return;

    setLoading(true);
    const liveP = await fetchLivePrice(sym);
    
    const newStock = {
      id: Date.now(),
      symbol: sym,
      avgCost: parseFloat(price),
      qty: parseInt(qty),
      realizedProfit: 0,
      live: liveP || parseFloat(price)
    };

    setStocks([...stocks, newStock]);
    setMarketData({ ...marketData, [sym]: liveP || price });
    setLoading(false);
    setSearchTerm('');
  };

  // --- 功能：賣出 (實現損益) ---
  const handleSell = (id, p, q) => {
    setStocks(stocks.map(s => {
      if (s.id === id) {
        const profit = (p - s.avgCost) * q * 0.995;
        return { ...s, qty: s.qty - q, realizedProfit: s.realizedProfit + profit };
      }
      return s;
    }));
  };

  // --- 功能：回補 (重新計成本) ---
  const handleBuyMore = (id, p, q) => {
    setStocks(stocks.map(s => {
      if (s.id === id) {
        const totalCost = (s.avgCost * s.qty) + (p * q);
        const newQty = s.qty + q;
        return { ...s, qty: newQty, avgCost: totalCost / newQty };
      }
      return s;
    }));
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 font-sans p-4">
      {/* Header */}
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-8 border-b border-[#2a2f3a] pb-4">
        <div className="flex items-center gap-2">
          <Globe className="w-8 h-8 text-blue-400" />
          <h1 className="text-2xl font-black tracking-tighter">SMC STOCK PRO</h1>
        </div>
        <div className="bg-[#121620] px-4 py-2 rounded-xl border border-[#2a2f3a] flex items-center gap-3">
          <Wallet className="w-5 h-5 text-blue-400" />
          <span className="font-mono font-bold">${stocks.reduce((a, b) => a + (marketData[b.symbol] || b.live) * b.qty, 0).toLocaleString()}</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* Search Panel */}
        <div className="bg-[#121620] p-6 rounded-2xl border border-[#2a2f3a] shadow-xl mb-8 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-500" />
            <input 
              type="text" 
              placeholder="搜尋或輸入台股代號 (如: 2313)" 
              className="w-full pl-10 pr-4 py-3 bg-[#0b0e14] border border-[#2a2f3a] rounded-xl outline-none focus:border-blue-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={addNewStock}
            disabled={loading || !searchTerm}
            className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {loading ? '分析中...' : '建立計畫'}
          </button>
        </div>

        {/* Stock List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stocks.map(s => {
            const currentP = marketData[s.symbol] || s.live;
            const unrealized = Math.round((currentP - s.avgCost) * s.qty);
            const isProfit = unrealized >= 0;
            const tp = (s.avgCost * 1.1).toFixed(2);
            const sl = (s.avgCost * 0.93).toFixed(2);

            return (
              <div key={s.id} className="bg-[#121620] border border-[#2a2f3a] rounded-2xl p-6 shadow-lg relative overflow-hidden group">
                <div className={`absolute top-0 left-0 w-1 h-full ${isProfit ? 'bg-[#f6465d]' : 'bg-[#0ecb81]'}`} />
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-white">{s.symbol}</h3>
                    <span className="text-xs text-slate-500">SMC 波段自動監控中</span>
                  </div>
                  <div className="text-right">
                    <div className={`text-3xl font-mono font-bold ${isProfit ? 'text-[#f6465d]' : 'text-[#0ecb81]'}`}>
                      {currentP}
                    </div>
                    <div className="text-xs text-slate-500">即時報價 (Yahoo/FinMind)</div>
                  </div>
                </div>

                {/* 紀律區 */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-[#0b0e14] p-3 rounded-xl border border-[#1e2330] text-center">
                    <span className="text-[10px] text-slate-500 block mb-1">停利目標 (+10%)</span>
                    <span className="text-lg font-bold text-red-400">{tp}</span>
                  </div>
                  <div className="bg-[#0b0e14] p-3 rounded-xl border border-[#1e2330] text-center">
                    <span className="text-[10px] text-slate-500 block mb-1">低位回補參考</span>
                    <span className="text-lg font-bold text-blue-400">{(tp * 0.95).toFixed(2)}</span>
                  </div>
                  <div className="bg-[#0b0e14] p-3 rounded-xl border border-[#1e2330] text-center">
                    <span className="text-[10px] text-slate-500 block mb-1">止損防線 (-7%)</span>
                    <span className="text-lg font-bold text-emerald-400">{sl}</span>
                  </div>
                </div>

                {/* 數據網格 */}
                <div className="grid grid-cols-4 gap-2 bg-[#0b0e14] p-4 rounded-xl mb-6 text-center">
                  <div><span className="text-[10px] text-slate-500">持股</span><div className="font-bold">{s.qty}</div></div>
                  <div><span className="text-[10px] text-slate-500">均價</span><div className="font-bold">{s.avgCost.toFixed(1)}</div></div>
                  <div><span className="text-[10px] text-slate-500">未實現</span><div className={`font-bold ${isProfit ? 'text-red-400' : 'text-green-400'}`}>{unrealized}</div></div>
                  <div><span className="text-[10px] text-slate-500">已落袋</span><div className="font-bold text-red-400">{Math.round(s.realizedProfit)}</div></div>
                </div>

                {/* 操作按鈕 */}
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      const p = prompt("賣出單價?", currentP);
                      const q = prompt(`賣出股數? (持股 ${s.qty})`);
                      if(p && q) handleSell(s.id, parseFloat(p), parseInt(q));
                    }}
                    className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 py-3 rounded-xl font-bold border border-red-600/30 transition-all"
                  >
                    賣出結利
                  </button>
                  <button 
                    onClick={() => {
                      const p = prompt("回補單價?", currentP);
                      const q = prompt(`回補股數?`);
                      if(p && q) handleBuyMore(s.id, parseFloat(p), parseInt(q));
                    }}
                    className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 py-3 rounded-xl font-bold border border-blue-600/30 transition-all"
                  >
                    低位回補
                  </button>
                  <button onClick={() => setStocks(stocks.filter(x => x.id !== s.id))} className="p-3 text-slate-600 hover:text-red-400"><Trash2 className="w-5 h-5"/></button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
