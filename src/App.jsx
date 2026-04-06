import React, { useState, useEffect } from 'react';

const App = () => {
  // 1. 狀態管理：從 LocalStorage 讀取紀錄
  const [stocks, setStocks] = useState(() => {
    const saved = localStorage.getItem('smc_gh_v14');
    return saved ? JSON.parse(saved) : [];
  });

  const [form, setForm] = useState({ symbol: '', name: '', price: '', qty: '' });

  // 2. 當 stocks 變動時存入 LocalStorage
  useEffect(() => {
    localStorage.setItem('smc_gh_v14', JSON.stringify(stocks));
  }, [stocks]);

  // 3. 處理輸入
  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addNewStock = () => {
    if (!form.symbol || !form.price || !form.qty) return alert("請填寫完整資訊");
    const newStock = {
      id: Date.now(),
      symbol: form.symbol,
      name: form.name || form.symbol,
      cost: parseFloat(form.price),
      qty: parseInt(form.qty),
      profit: 0
    };
    setStocks([...stocks, newStock]);
    setForm({ symbol: '', name: '', price: '', qty: '' });
  };

  const deleteStock = (id) => {
    if (window.confirm("確定刪除此標的紀錄？")) {
      setStocks(stocks.filter(s => s.id !== id));
    }
  };

  // 4. CSS 樣式物件 (CSS-in-JS)
  const styles = {
    container: {
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#0b0e11',
      color: '#eaecef',
      minHeight: '100vh',
      fontFamily: 'sans-serif'
    },
    header: {
      textAlign: 'center',
      color: '#f0b90b',
      borderBottom: '1px solid #2b3139',
      paddingBottom: '15px',
      marginBottom: '20px'
    },
    inputPanel: {
      backgroundColor: '#161a1e',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid #2b3139',
      marginBottom: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    },
    inputRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px'
    },
    input: {
      backgroundColor: '#2b3139',
      border: '1px solid #474d57',
      color: 'white',
      padding: '12px',
      borderRadius: '6px',
      outline: 'none'
    },
    btnAdd: {
      backgroundColor: '#f0b90b',
      color: '#1e2329',
      border: 'none',
      padding: '15px',
      borderRadius: '6px',
      fontWeight: 'bold',
      cursor: 'pointer',
      marginTop: '10px'
    },
    card: {
      backgroundColor: '#161a1e',
      border: '1px solid #2b3139',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px',
      borderTop: '4px solid #f0b90b'
    },
    ruleGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '10px',
      margin: '15px 0'
    },
    ruleBox: {
      backgroundColor: '#2b3139',
      padding: '10px',
      borderRadius: '8px',
      textAlign: 'center'
    },
    statBar: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '5px',
      backgroundColor: '#1e2329',
      padding: '12px',
      borderRadius: '8px',
      textAlign: 'center',
      fontSize: '0.85em'
    },
    btnK: {
      backgroundColor: '#4285f4',
      color: 'white',
      border: 'none',
      padding: '10px',
      borderRadius: '4px',
      width: '100%',
      marginTop: '15px',
      cursor: 'pointer'
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2>SMC MAX STRATEGY GH</h2>
      </header>

      {/* 輸入區 */}
      <div style={styles.inputPanel}>
        <div style={styles.inputRow}>
          <input name="symbol" placeholder="代碼 (2313)" style={styles.input} value={form.symbol} onChange={handleInputChange} />
          <input name="name" placeholder="名稱 (華通)" style={styles.input} value={form.name} onChange={handleInputChange} />
        </div>
        <div style={styles.inputRow}>
          <input name="price" type="number" placeholder="買入成交價" style={styles.input} value={form.price} onChange={handleInputChange} />
          <input name="qty" type="number" placeholder="持有股數" style={styles.input} value={form.qty} onChange={handleInputChange} />
        </div>
        <button style={styles.btnAdd} onClick={addNewStock}>建立波段紀律計畫</button>
      </div>

      {/* 列表區 */}
      {stocks.map(s => {
        const tp = (s.cost * 1.1).toFixed(2);
        const bb = (tp * 0.95).toFixed(2);
        const sl = (s.cost * 0.93).toFixed(2);
        
        return (
          <div key={s.id} style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{s.name} <small style={{ color: '#848e9c' }}>{s.symbol}</small></span>
              <span style={{ fontSize: '0.8em', color: '#f0b90b' }}>策略執行中</span>
            </div>

            <div style={styles.ruleGrid}>
              <div style={{ ...styles.ruleBox, borderBottom: '3px solid #f6465d' }}>
                <span style={{ fontSize: '0.7em', color: '#848e9c' }}>停利目標</span>
                <div style={{ fontWeight: 'bold' }}>{tp}</div>
              </div>
              <div style={{ ...styles.ruleBox, borderBottom: '3px solid #3498db' }}>
                <span style={{ fontSize: '0.7em', color: '#848e9c' }}>拉回回補</span>
                <div style={{ fontWeight: 'bold' }}>{bb}</div>
              </div>
              <div style={{ ...styles.ruleBox, borderBottom: '3px solid #0ecb81' }}>
                <span style={{ fontSize: '0.7em', color: '#848e9c' }}>停損防線</span>
                <div style={{ fontWeight: 'bold' }}>{sl}</div>
              </div>
            </div>

            <div style={styles.statBar}>
              <div><span style={{ color: '#848e9c' }}>股數</span><br/><b>{s.qty}</b></div>
              <div><span style={{ color: '#848e9c' }}>成本</span><br/><b>{s.cost}</b></div>
              <div><span style={{ color: '#848e9c' }}>本金</span><br/><b>{Math.round(s.cost * s.qty)}</b></div>
              <div onClick={() => deleteStock(s.id)} style={{ cursor: 'pointer', color: '#474d57' }}>結案</div>
            </div>

            <button style={styles.btnK} onClick={() => window.open(`https://www.google.com/finance/quote/${s.symbol}:TPE`)}>
              📊 查看即時 K 線與報價
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default App;
