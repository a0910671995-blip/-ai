export default async function handler(req, res) {
  // 設定 CORS 允許前端存取
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, symbol } = req.query;

  try {
    // 1. 抓取上市股票清單
    if (action === 'tw-stocks') {
      const response = await fetch('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL');
      const data = await response.json();
      return res.status(200).json(data);
    }

    // 2. 抓取上櫃股票清單
    if (action === 'tw-otc-stocks') {
      const response = await fetch('https://www.tpex.org.tw/openapi/v1/t1820');
      const data = await response.json();
      return res.status(200).json(data);
    }

    // 3. 抓取 Yahoo Finance 真實個股歷史與即時報價
    if (action === 'tw-history') {
      if (!symbol) return res.status(400).json({ error: 'Missing symbol' });
      
      const fetchYahoo = async (ticker) => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=6mo&interval=1d`;
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        return await response.json();
      };

      // 先嘗試抓取上市 (.TW)
      let data = await fetchYahoo(`${symbol}.TW`);
      
      // 如果抓不到 (可能是上櫃股票)，改抓上櫃 (.TWO)
      if (data.chart && data.chart.error) {
        data = await fetchYahoo(`${symbol}.TWO`);
      }

      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
