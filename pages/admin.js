import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Admin() {
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [purpose, setPurpose] = useState('簽證申請');
  const [applyDate, setApplyDate] = useState(new Date().toISOString().split('T')[0]);

  // 新增：系統設定狀態
  const [wmEnabled, setWmEnabled] = useState(true);
  const [wmText, setWmText] = useState('僅供 XX 旅遊辦理簽證使用');
  const [saveLoading, setSaveLoading] = useState(false);

  // MVP: 簡單密碼 (正式環境請改用 Auth)
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'Big68952';

  // 1. 登入處理
  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
      fetchData();
      fetchSettings(); // 登入後讀取設定
    } else {
      alert('❌ 密碼錯誤');
    }
  };

  // 2. 讀取 Google Sheet 資料
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/list', {
        headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_SECRET_KEY || 'default-secret-key' }
      });
      const json = await res.json();
      if (json.success) {
        // 為每筆資料加上唯一 ID (row index)
        setData(json.data.map((item, index) => ({ ...item, id: index })));
      } else {
        alert('讀取失敗: ' + json.error);
      }
    } catch (err) {
      console.error(err);
      alert('連線錯誤');
    }
    setLoading(false);
  };

  // 2.1 讀取系統設定
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_SECRET_KEY || 'default-secret-key' }
      });
      const json = await res.json();
      if (json.success) {
        setWmEnabled(json.settings.watermark_enabled === 'true');
        setWmText(json.settings.watermark_text);
      }
    } catch (err) {
      console.error('Fetch settings error:', err);
    }
  };

  // 2.2 儲存系統設定
  const handleSaveSettings = async () => {
    setSaveLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_SECRET_KEY || 'default-secret-key'
        },
        body: JSON.stringify({
          watermark_enabled: wmEnabled,
          watermark_text: wmText
        }),
      });
      const json = await res.json();
      if (json.success) {
        alert('✅ 設定儲存成功！');
      } else {
        alert('❌ 儲存失敗: ' + json.error);
      }
    } catch (err) {
      alert('連線錯誤');
    }
    setSaveLoading(false);
  };

  // 3. 勾選邏輯
  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === data.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(data.map(d => d.id)));
  };

  // 4. 批次更新 (用途/日期)
  const handleBatchUpdate = async () => {
    if (selectedIds.size === 0) return alert('請先勾選資料！');
    if (!confirm(`確定要更新 ${selectedIds.size} 筆資料為「${purpose} / ${applyDate}」嗎？`)) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_SECRET_KEY || 'default-secret-key'
        },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          purpose,
          applyDate,
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert('✅ 更新成功！');
        fetchData(); // 重新整理列表
        setSelectedIds(new Set()); // 清空勾選
      } else {
        alert('❌ 更新失敗: ' + json.error);
      }
    } catch (err) {
      alert('連線錯誤');
    }
    setLoading(false);
  };

  // 5. 下載 CSV (含圖片連結)
  const handleDownloadCSV = () => {
    if (selectedIds.size === 0) return alert('請先勾選資料！');

    const selectedData = data.filter(d => selectedIds.has(d.id));
    const csvContent = [
      ['團號', '姓名', '電話', 'LINE', '檔案連結', '用途', '申請日期'].join(','), // Header
      ...selectedData.map(d => [
        d.groupId, d.name, d.phone, d.lineUserId || '', d.fileLink, purpose, applyDate
      ].map(field => `"${field}"`).join(',')) // CSV Format
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `travel_docs_${applyDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 未登入畫面
  if (!isLoggedIn) {
    return (
      <div style={styles.container}>
        <div style={styles.loginBox}>
          <h2>🔒 大鷹旅遊後台登入</h2>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="請輸入管理員密碼"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
            <button type="submit" style={styles.button}>登入</button>
          </form>
        </div>
      </div>
    );
  }

  // 已登入畫面 (管理後台)
  return (
    <div style={styles.adminContainer}>
      <Head><title>大鷹旅遊 - 證件管理後台</title></Head>

      <header style={styles.header}>
        <h1>📋 證件上傳管理系統</h1>
        <button onClick={() => setIsLoggedIn(false)} style={styles.logoutBtn}>登出</button>
      </header>

      {/* 系統設定區 */}
      <div style={styles.settingsPanel}>
        <h3>⚙️ 系統設定</h3>
        <div style={styles.settingsRow}>
          <label style={styles.label}>
            <input 
              type="checkbox" 
              checked={wmEnabled} 
              onChange={e => setWmEnabled(e.target.checked)} 
            /> 啟用浮水印
          </label>
          <div style={styles.inputGroup}>
            <span>浮水印文字：</span>
            <input 
              value={wmText} 
              onChange={e => setWmText(e.target.value)} 
              style={styles.longInput} 
              placeholder="例如: 僅供 XX 旅遊辦理簽證使用"
            />
          </div>
          <button 
            onClick={handleSaveSettings} 
            style={saveLoading ? styles.disabledBtn : styles.saveBtn}
            disabled={saveLoading}
          >
            {saveLoading ? '儲存中...' : '💾 儲存設定'}
          </button>
        </div>
        <p style={styles.note}>註：浮水印文字後方會自動加上「當前日期 (YYYY-MM-DD)」</p>
      </div>

      {/* 操作區 */}
      <div style={styles.toolbar}>
        <div style={styles.filters}>
          <label>用途：<input value={purpose} onChange={e => setPurpose(e.target.value)} style={styles.smallInput} /></label>
          <label>日期：<input type="date" value={applyDate} onChange={e => setApplyDate(e.target.value)} style={styles.smallInput} /></label>
        </div>
        <div style={styles.actions}>
          <span>已選：{selectedIds.size} 筆</span>
          <button onClick={handleBatchUpdate} style={styles.actionBtn}>✍️ 批次更新用途</button>
          <button onClick={handleDownloadCSV} style={{ ...styles.actionBtn, background: '#28a745' }}>⬇️ 下載清單</button>
          <button onClick={fetchData} style={styles.refreshBtn}>🔄 重新整理</button>
        </div>
      </div>

      {/* 資料列表 */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th><input type="checkbox" onChange={toggleAll} checked={selectedIds.size === data.length && data.length > 0} /></th>
              <th>狀態</th>
              <th>團號</th>
              <th>姓名</th>
              <th>電話</th>
              <th>上傳時間</th>
              <th>用途</th>
              <th>申請日期</th>
              <th>證件預覽</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>載入中...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>目前無資料</td></tr>
            ) : (
              data.map((row) => (
                <tr key={row.id} style={{ background: selectedIds.has(row.id) ? '#e6f7ff' : 'white' }}>
                  <td><input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelect(row.id)} /></td>
                  <td>{row.status || '待處理'}</td>
                  <td>{row.groupId}</td>
                  <td>{row.name} {row.lineUserId ? '✅' : ''}</td>
                  <td>{row.phone}</td>
                  <td>{row.time}</td>
                  <td>{row.purpose}</td>
                  <td>{row.applyDate}</td>
                  <td>
                    <a href={row.fileLink} target="_blank" rel="noopener noreferrer" style={styles.link}>
                      查看圖片
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' },
  loginBox: { background: 'white', padding: '40px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center' },
  input: { padding: '10px', fontSize: '16px', border: '1px solid #ddd', borderRadius: '5px', width: '200px', marginBottom: '10px', display: 'block' },
  button: { padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', width: '100%' },

  adminContainer: { padding: '20px', fontFamily: 'Arial, sans-serif', background: '#f9f9f9', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' },
  logoutBtn: { background: '#dc3545', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' },

  toolbar: { display: 'flex', justifyContent: 'space-between', background: 'white', padding: '15px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
  filters: { display: 'flex', gap: '15px', alignItems: 'center' },
  smallInput: { padding: '5px', border: '1px solid #ddd', borderRadius: '4px' },
  actions: { display: 'flex', gap: '10px', alignItems: 'center' },
  actionBtn: { padding: '8px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
  refreshBtn: { padding: '8px 15px', background: 'transparent', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer' },

  tableWrapper: { background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  link: { color: '#007bff', textDecoration: 'none' },

  // 新增樣式
  settingsPanel: { background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
  settingsRow: { display: 'flex', alignItems: 'center', gap: '20px', marginTop: '10px', flexWrap: 'wrap' },
  label: { display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: 'bold' },
  inputGroup: { display: 'flex', alignItems: 'center', gap: '10px', flex: 1 },
  longInput: { padding: '8px', border: '1px solid #ddd', borderRadius: '4px', flex: 1, minWidth: '200px' },
  saveBtn: { padding: '8px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
  disabledBtn: { padding: '8px 20px', background: '#ccc', color: 'white', border: 'none', borderRadius: '5px', cursor: 'not-allowed' },
  note: { fontSize: '12px', color: '#666', marginTop: '10px' },
};
