export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { action, symbol } = req.query;

  try {
    if (action === 'tw-stocks') {
      const response = await fetch('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL');
      const data = await response.json();
      return res.status(200).json(data);
    }
    if (action === 'tw-otc-stocks') {
      const response = await fetch('https://www.tpex.org.tw/openapi/v1/t1820');
      const data = await response.json();
      return res.status(200).json(data);
    }
    if (action === 'tw-history') {
      const fetchYahoo = async (ticker) => {
        const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=6mo&interval=1d`);
        return await response.json();
      };
      let data = await fetchYahoo(`${symbol}.TW`);
      if (data.chart && data.chart.error) data = await fetchYahoo(`${symbol}.TWO`);
      return res.status(200).json(data);
    }
    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
