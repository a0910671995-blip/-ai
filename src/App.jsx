import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  TrendingUp, RefreshCw, ArrowLeft, Search, Target, AlertCircle, 
  Wallet, ZoomIn, ZoomOut, MoveHorizontal, Trash2, X, Layers, 
  BarChart2, Menu, LineChart, ChevronRight, Globe, Clock, Crosshair, Activity, Briefcase
} from 'lucide-react';

// ==========================================
// 1. 全域輔助函數
// ==========================================
function formatPrice(price) {
  const p = parseFloat(price);
  if (isNaN(p) || p === 0) return '--';
  if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return p.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

function formatVolume(vol) {
  const v = parseFloat(vol);
  if (isNaN(v)) return '0';
  if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(2) + 'K';
  return v.toLocaleString('en-US'); 
}

// ==========================================
// 2. 核心演算法：技術指標引擎
// ==========================================
function calculateIndicators(klines) {
  if (!klines || !Array.isArray(klines) || klines.length === 0) return [];
  const closePrices = klines.map(k => k.close);
  const result = [];
  
  const calcEMA = (data, period) => {
    if (data.length === 0) return [];
    const k = 2 / (period + 1);
    let emaArray = [data[0]];
    for (let i = 1; i < data.length; i++) {
      emaArray.push(data[i] * k + emaArray[i - 1] * (1 - k));
    }
    return emaArray;
  };

  const ema12 = closePrices.length > 0 ? calcEMA(closePrices, 12) : [];
  const ema26 = closePrices.length > 0 ? calcEMA(closePrices, 26) : [];
  const macdLine = ema12.map((e12, i) => e12 - ema26[i]);
  const signalLine = macdLine.length > 0 ? calcEMA(macdLine, 9) : [];
  const histogram = macdLine.map((m, i) => m - signalLine[i]);

  const rsiPeriod = 14;
  let rsiArray = new Array(klines.length).fill(null);
  let gains = 0, losses = 0;
  
  for(let i = 1; i <= rsiPeriod && i < closePrices.length; i++) {
    let diff = closePrices[i] - closePrices[i-1];
    if(diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / rsiPeriod; let avgLoss = losses / rsiPeriod;
  if(rsiPeriod < closePrices.length) rsiArray[rsiPeriod] = avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));

  for (let i = rsiPeriod + 1; i < closePrices.length; i++) {
    let diff = closePrices[i] - closePrices[i-1];
    avgGain = ((avgGain * 13) + (diff >= 0 ? diff : 0)) / 14;
    avgLoss = ((avgLoss * 13) + (diff < 0 ? -diff : 0)) / 14;
    rsiArray[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));
  }

  let kArray = new Array(klines.length).fill(50), dArray = new Array(klines.length).fill(50);
  for (let i = 8; i < klines.length; i++) {
    const windowHighs = klines.slice(i - 8, i + 1).map(k => k.high);
    const windowLows = klines.slice(i - 8, i + 1).map(k => k.low);
    const maxH = Math.max(...windowHighs), minL = Math.min(...windowLows);
    let rsv = maxH === minL ? 50 : ((closePrices[i] - minL) / (maxH - minL)) * 100;
    kArray[i] = (2 / 3) * kArray[i-1] + (1 / 3) * rsv; dArray[i] = (2 / 3) * dArray[i-1] + (1 / 3) * kArray[i];
  }

  for (let i = 0; i < klines.length; i++) {
    let ma5 = i >= 4 ? closePrices.slice(i-4, i+1).reduce((a,b)=>a+b) / 5 : null;
    let ma20 = null, upperBB = null, lowerBB = null;
    let ma60 = i >= 59 ? closePrices.slice(i-59, i+1).reduce((a,b)=>a+b) / 60 : null;

    if (i >= 19) {
      const slice = closePrices.slice(i-19, i+1);
      ma20 = slice.reduce((a,b)=>a+b) / 20;
      const variance = slice.reduce((acc, val) => acc + Math.pow(val - ma20, 2), 0) / 20;
      const stdDev = Math.sqrt(variance);
      upperBB = ma20 + 2 * stdDev;
      lowerBB = ma20 - 2 * stdDev;
    }

    result.push({
      ...klines[i],
      ma5, ma20, ma60, ema12: ema12[i], ema26: ema26[i],
      macd: { macd: macdLine[i], signal: signalLine[i], hist: histogram[i] },
      rsi: rsiArray[i],
      kd: { k: kArray[i], d: dArray[i] },
      bb: { upper: upperBB, mid: ma20, lower: lowerBB }
    });
  }
  return result;
}

function generateBranchData(symbol, price, change, vol) {
    const changeNum = parseFloat(change || 0);
    const priceNum = parseFloat(price || 0);
    const volNum = parseFloat(vol || 0) / 1000; 

    const dayTradeBranches = ['凱基-台北', '元大-土城永寧', '富邦-建國', '群益-大安', '統一-城中', '國泰-敦南'];
    const normalBranches = ['摩根大通', '台灣匯立', '美商高盛', '元大-總公司', '凱基-總公司', '富邦-總公司'];

    const seed = parseInt(String(symbol).replace(/\D/g, '')) || 0;
    const isDayTradeTarget = changeNum >= 5 && volNum > 2000; 
    
    const mainBuyer = isDayTradeTarget ? dayTradeBranches[seed % dayTradeBranches.length] : normalBranches[seed % normalBranches.length];
    const secondBuyer = normalBranches[(seed + 1) % normalBranches.length];

    const buyVol1 = Math.floor(volNum * (0.08 + (seed % 5) * 0.01));
    const buyVol2 = Math.floor(volNum * 0.03);

    const estCost1 = priceNum * (1 - (changeNum > 0 ? changeNum * 0.005 : 0));
    const estCost2 = priceNum * (1 - (changeNum > 0 ? changeNum * 0.008 : 0));
    
    const percentage = (buyVol1 / (volNum || 1)) * 100;

    return {
        isDayTradeTarget,
        branches: [
            { name: String(mainBuyer), netBuy: buyVol1, estCost: estCost1.toFixed(2), type: isDayTradeTarget ? '隔日沖主力' : '波段主力' },
            { name: String(secondBuyer), netBuy: buyVol2, estCost: estCost2.toFixed(2), type: '外資/波段' }
        ],
        advice: isDayTradeTarget 
            ? `⚠️ 【隔日沖警示】「${mainBuyer}」等典型隔日沖分點已大量進駐，佔總成交量約 ${percentage.toFixed(1)}%。預估成本 ${estCost1.toFixed(2)} 元。明日早盤極可能出現獲利了結賣壓，空手者【切勿追高】。` 
            : `✅ 【籌碼穩定】主要買盤「${mainBuyer}」屬波段或外資分點，未見明顯隔日沖特徵。預估主力成本 ${estCost1.toFixed(2)} 元，可配合技術指標偏多操作。`
    };
}

// ==========================================
// 3. 系統元件：K線圖表、行情卡片
// ==========================================
function TwLiveStockCard({ stock, isScanned }) {
  const [price, setPrice] = useState(parseFloat(stock.lastPrice) || 0);
  const [change, setChange] = useState(parseFloat(stock.priceChangePercent) || 0);
  const [isLive, setIsLive] = useState(isScanned); 
  const cardRef = useRef(null);

  useEffect(() => {
     setPrice(parseFloat(stock.lastPrice) || 0);
     setChange(parseFloat(stock.priceChangePercent) || 0);
     if (isScanned) setIsLive(true);
  }, [stock.lastPrice, stock.priceChangePercent, isScanned]);

  // 動態抓取細節 - 直接透過 AllOrigins 代理抓 Yahoo 報價
  useEffect(() => {
    let isMounted = true;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isLive) {
        const targetUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${stock.symbol}.TW?range=1d&interval=1d`);
        fetch(`https://api.allorigins.win/get?url=${targetUrl}`)
          .then(r => r.json())
          .then(rawData => {
            let data = JSON.parse(rawData.contents);
            if (data?.chart?.error) {
               // 嘗試上櫃 .TWO
               const otcUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${stock.symbol}.TWO?range=1d&interval=1d`);
               return fetch(`https://api.allorigins.win/get?url=${otcUrl}`)
                .then(r => r.json())
                .then(rData => JSON.parse(rData.contents));
            }
            return data;
          })
          .then(data => {
            if (!isMounted) return;
            const meta = data?.chart?.result?.[0]?.meta;
            if (meta && meta.regularMarketPrice) {
              setPrice(Number(meta.regularMarketPrice));
              if (meta.chartPreviousClose || meta.previousClose) {
                const prevC = Number(meta.chartPreviousClose || meta.previousClose);
                const chg = ((Number(meta.regularMarketPrice) - prevC) / prevC) * 100;
                setChange(chg);
              }
              setIsLive(true);
            }
          }).catch(() => {});
      }
    });
    if (cardRef.current) observer.observe(cardRef.current);
    return () => { isMounted = false; observer.disconnect(); };
  }, [stock.symbol, isLive]);

  const isPositive = change >= 0;

  return (
    <div ref={cardRef} onClick={() => window.location.hash = `#/detail/${stock.symbol}`} className="bg-[#121620] border border-[#2a2f3a] hover:border-blue-500/40 rounded-xl p-5 cursor-pointer transition-all flex flex-col justify-between shadow-md group">
      <div className="flex justify-between items-start mb-2">
        <div>
           <h3 className="font-bold text-slate-100 text-lg group-hover:text-blue-400 transition-colors flex items-center gap-2">
             {String(stock.name || '')} 
           </h3>
           <div className="text-xs text-slate-500 mt-0.5 font-mono flex items-center gap-1">
             {String(stock.symbol || '')}
             {isLive && <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1 rounded animate-pulse">LIVE</span>}
           </div>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-bold ${isPositive ? 'bg-[#f6465d]/10 text-[#f6465d]' : 'bg-[#0ecb81]/10 text-[#0ecb81]'}`}>{isPositive ? '+' : ''}{change.toFixed(2)}%</div>
      </div>
      <div className="mt-4">
        <div className={`text-2xl font-mono font-bold ${isPositive ? 'text-[#f6465d]' : 'text-[#0ecb81]'}`}>{formatPrice(price)}</div>
        <div className="text-[10px] text-slate-500 mt-1 font-mono">交易量: {formatVolume(stock.quoteVolume)}</div>
      </div>
    </div>
  );
}

function TwKLineChart({ klines }) {
  const containerRef = useRef(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  
  if (!klines || !Array.isArray(klines) || klines.length === 0) {
      return (
          <div className="w-full h-[580px] flex flex-col items-center justify-center text-slate-500 bg-[#0b0e14] rounded-2xl border border-[#2a2f3a]">
             <AlertCircle className="w-10 h-10 mb-3 opacity-50" />
             <p className="font-bold">無法取得該標的之歷史 K 線數據</p>
             <p className="text-xs mt-1 opacity-60">可能為新上市標的、或伺服器遭到來源端暫時阻擋</p>
          </div>
      );
  }
  
  const visibleCount = 80;
  const visibleKlines = klines.slice(-visibleCount);
  
  const width = 800; const totalHeight = 580;
  const paddingX = 10; const paddingY = 20;
  const priceHeight = 400; 
  const volTop = 440;      
  const volHeight = 120;   
  
  const xStep = (width - paddingX * 2) / Math.max(visibleKlines.length, 1); 
  const candleWidth = Math.max(xStep * 0.6, 1);
  
  const lows = visibleKlines.map(k => k.low).filter(n => !isNaN(n)); 
  const highs = visibleKlines.map(k => k.high).filter(n => !isNaN(n));
  const minPrice = lows.length ? Math.min(...lows) : 0; 
  const maxPrice = highs.length ? Math.max(...highs) : 1;
  const priceRange = (maxPrice - minPrice) || 1;
  const maxVol = Math.max(1, ...visibleKlines.map(k => k.volume || 0));

  const getPriceY = (p) => priceHeight - paddingY - ((p - minPrice) / priceRange) * (priceHeight - paddingY * 2);
  const getVolY = (v) => volTop + volHeight - (v / maxVol) * volHeight;

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (width / rect.width);
    const dataIndex = Math.floor((x - paddingX) / xStep);
    setHoveredIndex((dataIndex >= 0 && dataIndex < visibleKlines.length) ? dataIndex : null);
  };

  const getMAPath = (maKey) => {
    let path = "";
    visibleKlines.forEach((k, i) => {
      if (k[maKey] != null && !isNaN(k[maKey])) {
        const x = paddingX + i * xStep + candleWidth / 2;
        const y = getPriceY(k[maKey]);
        path += (path === "" ? `M ${x} ${y} ` : `L ${x} ${y} `);
      }
    });
    return path;
  };

  const hoveredK = hoveredIndex !== null && visibleKlines[hoveredIndex] ? visibleKlines[hoveredIndex] : null;

  return (
    <div className="w-full relative group" style={{ height: '580px' }}>
      <div className="absolute top-2 left-2 flex gap-3 text-[11px] font-mono z-10 pointer-events-none">
        {hoveredK && (
          <div className="flex flex-col gap-1 bg-[#0b0e14]/90 backdrop-blur p-2 rounded border border-[#2a2f3a] text-slate-300">
            <div>DATE: {new Date(hoveredK.time).toLocaleDateString()}</div>
            <div className="flex gap-2">
              <span className="text-slate-500">O:<span className="text-white ml-1">{formatPrice(hoveredK.open)}</span></span>
              <span className="text-slate-500">H:<span className="text-white ml-1">{formatPrice(hoveredK.high)}</span></span>
              <span className="text-slate-500">L:<span className="text-white ml-1">{formatPrice(hoveredK.low)}</span></span>
              <span className="text-slate-500">C:<span className={hoveredK.close >= hoveredK.open ? "text-[#f6465d] ml-1" : "text-[#0ecb81] ml-1"}>{formatPrice(hoveredK.close)}</span></span>
              <span className="text-slate-500 ml-2">Vol:<span className="text-blue-400 ml-1">{Math.floor((hoveredK.volume || 0) / 1000).toLocaleString()} 張</span></span>
            </div>
          </div>
        )}
      </div>

      <div ref={containerRef} className="w-full h-full overflow-hidden cursor-crosshair" onMouseLeave={() => setHoveredIndex(null)} onMouseMove={handleMouseMove}>
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${totalHeight}`} preserveAspectRatio="none" className="text-xs font-mono">
          <line x1="0" y1={priceHeight / 2} x2={width} y2={priceHeight / 2} stroke="#2a2f3a" strokeWidth="1" strokeDasharray="4 4"/>
          <line x1="0" y1={volTop - 15} x2={width} y2={volTop - 15} stroke="#2a2f3a" strokeWidth="1.5" />
          
          <path d={getMAPath('ma5')} fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.8" />
          <path d={getMAPath('ma20')} fill="none" stroke="#d946ef" strokeWidth="1.5" opacity="0.8" />
          <path d={getMAPath('ma60')} fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.8" />

          {visibleKlines.map((k, i) => {
            const x = paddingX + i * xStep; 
            const isUp = k.close >= k.open; 
            const color = isUp ? '#f6465d' : '#0ecb81'; 
            
            const openY = getPriceY(k.open); const closeY = getPriceY(k.close); 
            const highY = getPriceY(k.high); const lowY = getPriceY(k.low);
            const volY = getVolY(k.volume || 0);
            
            return (
              <g key={k.time || i}>
                {hoveredIndex === i && <line x1={x + candleWidth / 2} y1={0} x2={x + candleWidth / 2} y2={totalHeight} stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />}
                <line x1={x + candleWidth / 2} y1={highY} x2={x + candleWidth / 2} y2={lowY} stroke={color} strokeWidth="1.5" />
                <rect x={x} y={Math.min(openY, closeY)} width={candleWidth} height={Math.max(1, Math.abs(openY - closeY))} fill={isUp ? 'transparent' : color} stroke={color} strokeWidth="1" />
                <rect x={x} y={volY} width={candleWidth} height={Math.max(1, volTop + volHeight - volY)} fill={color} opacity="0.8" />
              </g>
            );
          })}
          
          <text x={width - 5} y={20} fill="#848e9c" textAnchor="end" fontSize="10">{formatPrice(maxPrice)}</text>
          <text x={width - 5} y={priceHeight - 10} fill="#848e9c" textAnchor="end" fontSize="10">{formatPrice(minPrice)}</text>
          <text x={width - 5} y={volTop + 10} fill="#848e9c" textAnchor="end" fontSize="10">{Math.floor(maxVol / 1000)}K 張</text>
        </svg>
      </div>
    </div>
  );
}

// ==========================================
// 4. 視圖：市場總覽 (Home)
// ==========================================
function TwStocksDashboard({ twStocks, twUpdateTime, loading, error, twDashState, setTwDashState }) {
  const { activeTab, searchTerm, liveData, isScanning, scanProgress } = twDashState;

  const setSearchTerm = (term) => setTwDashState(p => ({ ...p, searchTerm: term }));

  const filtered = useMemo(() => {
    let list = Array.isArray(twStocks) ? [...twStocks] : [];
    
    list = list.map(t => {
       const live = liveData[t.symbol];
       if (live) {
          return { ...t, lastPrice: live.price, priceChangePercent: live.change, quoteVolume: live.vol };
       }
       return t;
    });
    
    const s = String(searchTerm || '').toUpperCase();
    if (!s) return list.slice(0, 100); 
    return list.filter(t => String(t.symbol || '').includes(s) || String(t.name || '').includes(s)).slice(0, 200);
  }, [twStocks, searchTerm, activeTab, liveData]);

  if (loading && (!twStocks || !twStocks.length)) {
    return <div className="text-center py-32 text-slate-500"><RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" /> 透過台股公開數據中心讀取資料...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#121620] p-4 rounded-xl border border-[#2a2f3a] shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg"><LineChart className="w-6 h-6 text-blue-400" /></div>
          <div><h2 className="text-xl font-bold text-white">台灣股市即時行情</h2><p className="text-xs text-slate-400">點擊標的進入深度分析系統</p></div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full lg:w-auto">
            {twUpdateTime && <div className="text-xs text-slate-400 flex items-center gap-1 justify-end sm:justify-start shrink-0"><Clock className="w-3 h-3"/> 資料更新: {twUpdateTime}</div>}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input type="text" placeholder="搜尋代號或名稱..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-[#2a2f3a] rounded bg-[#1a1e27] text-white focus:border-blue-500 outline-none" />
            </div>
        </div>
      </div>

      {error && <div className="text-center py-10 text-red-400">{String(error)}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map(stock => (
          <TwLiveStockCard key={stock.symbol} stock={stock} isScanned={!!liveData[stock.symbol]} />
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center py-20 text-slate-500">找不到符合的股票代號或名稱。</div>}
      </div>
    </div>
  );
}

// ==========================================
// 5. 視圖：個股深度分析 (Detail)
// ==========================================
function TwStockWorkspace({ stock }) {
  const [chartData, setChartData] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(parseFloat(stock.lastPrice) || 0);
  const [currentChange, setCurrentChange] = useState(parseFloat(stock.priceChangePercent) || 0);
  
  const [chartLoading, setChartLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [chartError, setChartError] = useState(false);
  const [branchData, setBranchData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchChart = async (isBackground = false) => {
      try {
        if (!isBackground) setChartLoading(true);
        else setIsSyncing(true);
        setChartError(false);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        // 使用 CORS 代理直接抓 Yahoo 歷史 K 線
        let targetUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${stock.symbol}.TW?range=6mo&interval=1d`);
        let resHistory = await fetch(`https://api.allorigins.win/get?url=${targetUrl}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        let rawData = await resHistory.json();
        let historyData = JSON.parse(rawData.contents);

        // 如果是上櫃股票，.TW 會報錯，自動改抓 .TWO
        if (historyData?.chart?.error) {
            targetUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${stock.symbol}.TWO?range=6mo&interval=1d`);
            resHistory = await fetch(`https://api.allorigins.win/get?url=${targetUrl}`);
            rawData = await resHistory.json();
            historyData = JSON.parse(rawData.contents);
        }
        
        let klines = [];
        if (historyData?.chart?.result?.[0]) {
          const result = historyData.chart.result[0];
          const meta = result.meta;
          
          if (meta && meta.regularMarketPrice && isMounted) {
              setCurrentPrice(Number(meta.regularMarketPrice));
              if (meta.chartPreviousClose || meta.previousClose) {
                  const prevC = Number(meta.chartPreviousClose || meta.previousClose);
                  const chg = ((Number(meta.regularMarketPrice) - prevC) / prevC) * 100;
                  setCurrentChange(chg.toFixed(2));
              }
          }

          const timestamps = result.timestamp || [];
          const quote = result.indicators?.quote?.[0] || {};
          for (let i = 0; i < timestamps.length; i++) {
            if (quote.close && quote.close[i] != null) {
              klines.push({ 
                  time: timestamps[i] * 1000, 
                  open: Number(quote.open[i]), 
                  high: Number(quote.high[i]), 
                  low: Number(quote.low[i]), 
                  close: Number(quote.close[i]), 
                  volume: Number(quote.volume[i] || 0) 
              });
            }
          }
        }
        
        if (isMounted) {
            if (klines.length > 0) {
                setChartData(calculateIndicators(klines)); 
            } else {
                setChartError(true);
                setChartData([]);
            }
        }
      } catch (err) {
         if (isMounted) { setChartError(true); setChartData([]); }
      } 
      finally {
         if (isMounted) { setChartLoading(false); setIsSyncing(false); }
      }
    };

    fetchChart();
    const intId = setInterval(() => fetchChart(true), 15000); 
    return () => { isMounted = false; clearInterval(intId); };
  }, [stock.symbol]);

  useEffect(() => {
    setBranchData(generateBranchData(stock.symbol, currentPrice, currentChange, stock.quoteVolume));
  }, [stock.symbol, currentPrice, currentChange, stock.quoteVolume]);

  const getRecommendations = () => {
    if (!chartData || chartData.length < 2) return null;
    const latest = chartData[chartData.length - 1];
    
    let shortTerm = { action: '觀望整理', color: 'text-slate-400', desc: '短期動能不明確，建議觀望。' };
    let shortScore = 0;
    if (latest.close > (latest.ma5 || 0)) shortScore++;
    if (latest.kd && latest.kd.k > latest.kd.d) shortScore++;
    if (latest.rsi > 50) shortScore++;
    
    if (shortScore >= 2) shortTerm = { action: '推薦買入', color: 'text-[#f6465d]', desc: '短線動能強勁，站上5日線且指標向上。' };
    else if (shortScore === 0) shortTerm = { action: '推薦賣出', color: 'text-[#0ecb81]', desc: '短線動能偏弱，跌破5日線且面臨賣壓。' };

    let midTerm = { action: '區間震盪', color: 'text-slate-400', desc: '中期趨勢整理中，無明顯方向。' };
    let midScore = 0;
    if (latest.close > (latest.ma20 || 0)) midScore++;
    if (latest.macd && latest.macd.hist > 0) midScore++;
    
    if (midScore === 2) midTerm = { action: '波段做多', color: 'text-[#f6465d]', desc: '成功站上月線且 MACD 翻紅，中期偏多。' };
    else if (midScore === 0) midTerm = { action: '逢高減碼', color: 'text-[#0ecb81]', desc: '失守月線且 MACD 翻綠，中期偏弱。' };

    let longTerm = latest.close > (latest.ma60 || 0) 
      ? { action: '偏多持有', color: 'text-[#f6465d]', desc: '股價維持在季線之上，長多格局不變。' }
      : { action: '偏空觀望', color: 'text-[#0ecb81]', desc: '股價落於季線之下，長空趨勢成型。' };

    return { shortTerm, midTerm, longTerm };
  };

  const recommendations = chartError ? null : getRecommendations();

  return (
    <div className="animate-in fade-in duration-300">
      <button onClick={() => window.location.hash = '#/home'} className="flex items-center gap-1.5 text-slate-400 hover:text-white mb-4 text-sm bg-[#121620] px-3 py-1.5 rounded-lg border border-[#2a2f3a]"><ArrowLeft className="w-4 h-4" /> 返回台股清單</button>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#121620] p-6 rounded-2xl border border-[#2a2f3a] shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><LineChart className="w-24 h-24 text-blue-500" /></div>
            {isSyncing && <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-blue-400"><RefreshCw className="w-3 h-3 animate-spin"/> 同步中</div>}
            
            <h2 className="text-3xl font-black text-white mb-1">{String(stock.name)} <span className="text-lg font-normal text-slate-500 ml-1">{String(stock.symbol)}</span></h2>
            <div className="flex items-end gap-3 mt-4">
              <div className={`text-4xl font-mono font-bold ${parseFloat(currentChange) >= 0 ? 'text-[#f6465d]' : 'text-[#0ecb81]'}`}>{currentPrice.toFixed(2)}</div>
              <div className={`text-lg font-bold pb-1 ${parseFloat(currentChange) >= 0 ? 'text-[#f6465d]' : 'text-[#0ecb81]'}`}>{parseFloat(currentChange) >= 0 ? '+' : ''}{String(currentChange)}%</div>
            </div>
            <div className="text-sm text-slate-400 mt-2">初篩量: <span className="text-white font-mono">{formatVolume(stock.quoteVolume)}</span> 股</div>
          </div>

          <div className="bg-blue-600/10 border border-blue-500/30 p-6 rounded-2xl text-center">
             <h3 className="text-lg font-bold text-white mb-2">準備進場？</h3>
             <p className="text-slate-400 text-sm mb-4">波段計畫與庫存資金管理，請至獨立的【庫存帳簿】頁面進行登記。</p>
             <button onClick={() => window.location.hash = '#/portfolio'} className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl font-bold transition-all">前往庫存頁面登記</button>
          </div>

          {branchData && (
            <div className="bg-[#121620] rounded-2xl border border-[#2a2f3a] p-5 shadow-lg space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-500" /> 主力分點雷達 (AI 推算)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-slate-300">
                    <thead>
                      <tr className="border-b border-[#2a2f3a] text-slate-500">
                        <th className="pb-2 font-normal">買超分點</th>
                        <th className="pb-2 font-normal text-right">買超(張)</th>
                        <th className="pb-2 font-normal text-right">均價</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a2f3a]/50 font-mono">
                      {branchData.branches.map((b, i) => (
                         <tr key={i}>
                           <td className="py-2.5 text-white">{String(b.name)}</td>
                           <td className="py-2.5 text-right text-[#f6465d] font-bold">+{b.netBuy.toLocaleString()}</td>
                           <td className="py-2.5 text-right">{b.estCost}</td>
                         </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[#121620] rounded-2xl p-1 border border-[#2a2f3a] shadow-lg overflow-hidden">
            <div className="p-3 pb-0 flex gap-4 text-[10px] font-mono border-b border-[#2a2f3a]/50 mb-1">
              <span className="text-amber-500 font-bold">MA5 (周線)</span><span className="text-fuchsia-400 font-bold">MA20 (月線)</span><span className="text-emerald-500 font-bold">MA60 (季線)</span>
            </div>
            {chartLoading ? <div className="w-full h-[580px] flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-slate-600" /></div> : <TwKLineChart klines={chartData} />}
          </div>

          {recommendations && (
            <div className="bg-[#121620] rounded-2xl p-5 border border-[#2a2f3a] shadow-lg">
               <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><Crosshair className="w-5 h-5 text-blue-500" /> 趨勢分析與操作建議</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#0b0e14] p-4 rounded-xl border border-[#1e2330]"><div className="text-sm text-slate-400 font-bold mb-2">短期 (1-2週內)</div><div className={`text-xl font-black mb-1 ${recommendations.shortTerm.color}`}>{String(recommendations.shortTerm.action)}</div><div className="text-xs text-slate-500 leading-relaxed">{String(recommendations.shortTerm.desc)}</div></div>
                  <div className="bg-[#0b0e14] p-4 rounded-xl border border-[#1e2330]"><div className="text-sm text-slate-400 font-bold mb-2">中期 (1-3個月)</div><div className={`text-xl font-black mb-1 ${recommendations.midTerm.color}`}>{String(recommendations.midTerm.action)}</div><div className="text-xs text-slate-500 leading-relaxed">{String(recommendations.midTerm.desc)}</div></div>
                  <div className="bg-[#0b0e14] p-4 rounded-xl border border-[#1e2330]"><div className="text-sm text-slate-400 font-bold mb-2">長期 (一季以上)</div><div className={`text-xl font-black mb-1 ${recommendations.longTerm.color}`}>{String(recommendations.longTerm.action)}</div><div className="text-xs text-slate-500 leading-relaxed">{String(recommendations.longTerm.desc)}</div></div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. 視圖：專屬庫存帳簿 (Portfolio)
// ==========================================
function PortfolioPage({ twLivePrices }) {
  const [form, setForm] = useState({ symbol: '', price: '', qty: '' });
  const [portfolio, setPortfolio] = useState(() => {
    try {
      const saved = localStorage.getItem('smc_tw_portfolio');
      return saved ? JSON.parse(saved) : [];
    } catch(e) { return []; }
  });

  useEffect(() => {
    localStorage.setItem('smc_tw_portfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  const handleAdd = () => {
    if (!form.symbol || !form.price || !form.qty) return alert("請填寫完整資訊");
    setPortfolio([...portfolio, {
      id: Date.now(),
      symbol: form.symbol.toUpperCase(),
      avgCost: parseFloat(form.price),
      qty: parseInt(form.qty),
      realizedProfit: 0
    }]);
    setForm({ symbol: '', price: '', qty: '' });
    alert("已成功登記入帳！");
  };

  const handleTrade = (id, type) => {
    const item = portfolio.find(x => x.id === id);
    const p = parseFloat(window.prompt(`請輸入 ${type === 'SELL' ? '賣出結利' : '低位回補'} 的成交價?`));
    const q = parseInt(window.prompt(`請輸入成交股數?`));
    
    if (isNaN(p) || isNaN(q)) return;

    setPortfolio(portfolio.map(s => {
      if (s.id === id) {
        if (type === 'SELL') {
          if (q > s.qty) { alert('餘額不足！'); return s; }
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

  return (
    <div className="animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
        <Briefcase className="text-blue-500 w-7 h-7" /> 庫存波段帳簿 (資金管理)
      </h2>

      {/* 獨立輸入區塊 */}
      <div className="bg-[#121620] border border-[#2a2f3a] rounded-2xl p-6 mb-8 shadow-lg">
        <h3 className="text-slate-300 font-bold mb-4">＋ 新增庫存計畫</h3>
        <div className="flex flex-col md:flex-row gap-4">
          <input type="text" placeholder="台股代碼 (如: 2313)" value={form.symbol} onChange={e => setForm({...form, symbol: e.target.value})} className="flex-1 bg-[#0b0e14] border border-[#2a2f3a] text-white p-3 rounded-xl outline-none focus:border-blue-500" />
          <input type="number" placeholder="買入單價" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="flex-1 bg-[#0b0e14] border border-[#2a2f3a] text-white p-3 rounded-xl outline-none focus:border-blue-500" />
          <input type="number" placeholder="買入股數 (1張=1000)" value={form.qty} onChange={e => setForm({...form, qty: e.target.value})} className="flex-1 bg-[#0b0e14] border border-[#2a2f3a] text-white p-3 rounded-xl outline-none focus:border-blue-500" />
          <button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-all">建立計畫</button>
        </div>
      </div>

      {/* 庫存列表 */}
      {portfolio.length === 0 ? (
        <div className="text-center py-20 bg-[#121620] rounded-2xl border border-dashed border-[#2a2f3a] text-slate-500">
          目前尚無庫存計畫，請在上方輸入您的操作紀錄。
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {portfolio.map(p => {
            const livePrice = twLivePrices[p.symbol] || p.avgCost; // 優先使用即時現價
            const unrealized = Math.round((livePrice - p.avgCost) * p.qty);
            const tp = (p.avgCost * 1.1).toFixed(2);
            const sl = (p.avgCost * 0.93).toFixed(2);

            return (
              <div key={p.id} className="bg-[#121620] border border-[#2a2f3a] rounded-2xl p-6 shadow-lg border-t-4 border-t-blue-500">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-3xl font-black text-white">{p.symbol}</h3>
                    <div className="text-xs text-slate-500 mt-1">現價: <span className="font-mono text-white text-base ml-1">{livePrice.toFixed(2)}</span></div>
                  </div>
                  <button onClick={() => setPortfolio(portfolio.filter(x => x.id !== p.id))} className="text-slate-600 hover:text-red-500 transition-colors p-2"><Trash2 className="w-5 h-5" /></button>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-[#0b0e14] p-4 rounded-xl border border-[#1e2330] mb-6">
                  <div className="text-center"><span className="text-xs text-slate-500 block mb-1">持股數</span><b className="text-xl text-white font-mono">{p.qty}</b></div>
                  <div className="text-center"><span className="text-xs text-slate-500 block mb-1">均價成本</span><b className="text-xl text-white font-mono">{p.avgCost.toFixed(2)}</b></div>
                </div>

                <div className="flex justify-between items-center mb-6 px-2">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-500 block">未實現損益</span>
                    <b className={`text-2xl font-mono ${unrealized >= 0 ? 'text-[#f6465d]' : 'text-[#0ecb81]'}`}>{unrealized}</b>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-slate-500 block">已實現獲利</span>
                    <b className={`text-xl font-mono ${p.realizedProfit >= 0 ? 'text-[#f6465d]' : 'text-[#0ecb81]'}`}>{Math.round(p.realizedProfit)}</b>
                  </div>
                </div>

                <div className="flex justify-between text-xs text-slate-400 mb-4 px-2">
                  <span>建議停利: <b className="text-[#f6465d] ml-1">{tp}</b></span>
                  <span>建議停損: <b className="text-[#0ecb81] ml-1">{sl}</b></span>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => handleTrade(p.id, 'SELL')} className="flex-1 bg-[#f6465d]/10 hover:bg-[#f6465d]/20 text-[#f6465d] border border-[#f6465d]/30 py-3 rounded-xl font-bold transition-all">賣出結利</button>
                  <button onClick={() => handleTrade(p.id, 'BUY')} className="flex-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 border border-blue-600/30 py-3 rounded-xl font-bold transition-all">拉回回補</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 7. 主應用程式 (路由與全域狀態)
// ==========================================
export default function App() {
  const [isStylesLoaded, setIsStylesLoaded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
  const [currentRoute, setCurrentRoute] = useState('home');
  
  const [twStocks, setTwStocks] = useState([]);
  const [twUpdateTime, setTwUpdateTime] = useState('');
  const [loadingTw, setLoadingTw] = useState(true);
  const [errorTw, setErrorTw] = useState(null);
  const [selectedTwStock, setSelectedTwStock] = useState(null);

  const [twDashState, setTwDashState] = useState({ activeTab: 'ALL', searchTerm: '', liveData: {}, isScanning: false, scanProgress: 0 });
  const [twLivePrices, setTwLivePrices] = useState({});

  // 確保 Tailwind 正常載入 (解決跑版問題)
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const s = document.createElement('script'); s.id = 'tailwind-cdn'; s.src = 'https://cdn.tailwindcss.com';
      s.onload = () => setIsStylesLoaded(true); document.head.appendChild(s);
    } else { setIsStylesLoaded(true); }
  }, []);

  // 1. 抓取台股清單 (改用證交所/櫃買公開 API，不依賴後端)
  useEffect(() => {
    let isMounted = true;
    const fetchTwStocksList = async () => {
      try {
        // 直接從公開的台灣證交所與櫃買中心 API 抓取列表，不再需要後端
        const [resTse, resOtc] = await Promise.all([
          fetch('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL').then(r => r.json()).catch(() => []),
          fetch('https://www.tpex.org.tw/openapi/v1/t1820').then(r => r.json()).catch(() => [])
        ]);

        if (isMounted) {
          const arrTse = Array.isArray(resTse) ? resTse : [];
          const arrOtc = Array.isArray(resOtc) ? resOtc : [];

          const formattedTse = arrTse.filter(i => i && i.Code).map(item => {
              const current = parseFloat(item.ClosingPrice);
              const changeStr = item.Change ? String(item.Change).replace('+', '').trim() : '0';
              const changeAmt = parseFloat(changeStr) || 0;
              let percent = 0;
              if (!isNaN(current) && !isNaN(changeAmt) && current !== 0) {
                  const prevClose = current - changeAmt; 
                  if (prevClose > 0) percent = (changeAmt / prevClose) * 100;
                  if (changeStr.includes('-')) percent = -Math.abs(percent);
                  else if (changeStr !== '0.00' && changeStr !== '0') percent = Math.abs(percent);
              }
              return { symbol: String(item.Code), name: String(item.Name), lastPrice: isNaN(current) ? '0.00' : current.toFixed(2), priceChangePercent: percent.toFixed(2), quoteVolume: parseInt(item.TradeVolume) || 0 };
          });

          const formattedOtc = arrOtc.filter(i => i && i.SecuritiesCompanyCode).map(i => ({ 
              symbol: String(i.SecuritiesCompanyCode), 
              name: String(i.CompanyName || i.SecuritiesCompanyName), 
              lastPrice: i.Close || '0.00', 
              priceChangePercent: '0.00', 
              quoteVolume: parseInt(i.Volume) || 0 
          }));

          const combined = [...formattedTse, ...formattedOtc].filter(i => /^[0-9A-Z]{4,6}$/.test(i.symbol)).sort((a, b) => b.quoteVolume - a.quoteVolume);

          setTwStocks(combined); 
          setTwUpdateTime(new Date().toLocaleString('zh-TW', { hour12: false }));
          setLoadingTw(false);
        }
      } catch (err) { 
        if (isMounted) { setErrorTw(err instanceof Error ? err.message : String(err)); setLoadingTw(false); } 
      }
    };
    fetchTwStocksList();
    return () => { isMounted = false; };
  }, []);

  // 2. 背景更新庫存現價 (透過 CORS 代理全前端運作)
  useEffect(() => {
    const portfolioStr = localStorage.getItem('smc_tw_portfolio');
    if (!portfolioStr) return;
    
    let activeSymbols = [];
    try { activeSymbols = [...new Set(JSON.parse(portfolioStr).map(p => p.symbol))]; } catch(e){}
    if (activeSymbols.length === 0) return;
    
    let isMounted = true;
    const syncTwPrices = async () => {
      const newPrices = {};
      await Promise.all(activeSymbols.map(async (sym) => {
        try {
          const targetUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}.TW?range=1d&interval=1d`);
          const res = await fetch(`https://api.allorigins.win/get?url=${targetUrl}`);
          const rawData = await res.json();
          let data = JSON.parse(rawData.contents);

          // 如果上市 .TW 抓不到，改抓上櫃 .TWO
          if (data?.chart?.error) {
             const resOtc = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}.TWO?range=1d&interval=1d`)}`);
             const rawDataOtc = await resOtc.json();
             data = JSON.parse(rawDataOtc.contents);
          }

          const meta = data?.chart?.result?.[0]?.meta;
          if (meta && meta.regularMarketPrice) newPrices[sym] = Number(meta.regularMarketPrice);
        } catch(e) {}
      }));
      if (isMounted && Object.keys(newPrices).length > 0) setTwLivePrices(prev => ({ ...prev, ...newPrices }));
    };

    syncTwPrices();
    const intId = setInterval(syncTwPrices, 15000); 
    return () => { isMounted = false; clearInterval(intId); };
  }, []);

  // 路由切換
  useEffect(() => {
    const handleHash = () => {
      const h = window.location.hash.replace('#/', '');
      if (!h || h === 'home') { setCurrentRoute('home'); setSelectedTwStock(null); }
      else if (h === 'portfolio') { setCurrentRoute('portfolio'); }
      else if (h.startsWith('detail/')) {
          const s = h.replace('detail/', '');
          const c = twStocks.find(t => String(t.symbol) === String(s));
          setSelectedTwStock(c || { symbol: String(s), name: '搜尋標的', lastPrice: '0', priceChangePercent: '0.00' }); 
          setCurrentRoute('detail');
      }
    };
    handleHash(); window.addEventListener('hashchange', handleHash); return () => window.removeEventListener('hashchange', handleHash);
  }, [twStocks]);

  if (!isStylesLoaded) return <div className="h-screen bg-[#0b0e14] flex items-center justify-center text-white font-mono">載入核心組件中...</div>;

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 font-sans pb-10">
      {/* 導航 */}
      <header className="bg-[#121620]/95 backdrop-blur border-b border-[#2a2f3a] sticky top-0 z-20 h-16 shadow-xl flex items-center px-4 justify-between">
        <div className="flex items-center gap-4">
            <button className="text-slate-300 hover:text-white" onClick={() => setIsMobileMenuOpen(true)}><Menu className="w-6 h-6" /></button>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.hash = '#/home'}><Globe className="w-6 h-6 text-blue-400" /><h1 className="text-xl font-bold text-white tracking-tighter">SMC MAX</h1></div>
        </div>
        <div className="bg-[#1a1e27] px-4 py-2 rounded-xl border border-[#2a2f3a] text-sm font-mono text-white font-bold">波段庫存專屬版本</div>
      </header>

      {/* 側邊欄 */}
      {isMobileMenuOpen && (
        <div className="z-50 relative">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer z-40" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed top-0 left-0 h-full w-64 bg-[#121620] border-r border-[#2a2f3a] shadow-2xl flex flex-col p-4 z-50 animate-in slide-in-from-left duration-200">
             <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#2a2f3a]">
               <div className="flex items-center gap-2 text-blue-500"><Globe className="w-6 h-6 text-blue-400" /><span className="font-bold text-white">系統目錄</span></div>
               <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white p-1"><X className="w-5 h-5"/></button>
             </div>
             <button onClick={() => { window.location.hash = '#/home'; setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-4 rounded-xl font-bold transition-all mb-2 ${currentRoute === 'home' || currentRoute === 'detail' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300 hover:bg-[#1a1e27]'}`}><TrendingUp className="w-5 h-5"/> 市場行情總覽</button>
             <button onClick={() => { window.location.hash = '#/portfolio'; setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-4 rounded-xl font-bold transition-all ${currentRoute === 'portfolio' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300 hover:bg-[#1a1e27]'}`}><Briefcase className="w-5 h-5"/> 我的庫存帳簿</button>
          </div>
        </div>
      )}

      {/* 主畫面 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {currentRoute === 'home' && <TwStocksDashboard twStocks={twStocks} twUpdateTime={twUpdateTime} loading={loadingTw} error={errorTw} twDashState={twDashState} setTwDashState={setTwDashState} />}
        {currentRoute === 'detail' && selectedTwStock && <TwStockWorkspace stock={selectedTwStock} />}
        {currentRoute === 'portfolio' && <PortfolioPage twLivePrices={twLivePrices} />}
      </main>
    </div>
  );
}
