import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

// 多語言翻譯
const translations = {
  'zh-TW': {
    title: '📸 旅遊證件上傳',
    subtitle: '請上傳您的護照或身分證件，系統將自動加密保護。',
    groupId: '團號 (Group ID)',
    groupIdPlaceholder: '例如：2026-JP-001',
    name: '姓名 *',
    namePlaceholder: '請輸入真實姓名',
    phone: '聯絡電話 *',
    phonePlaceholder: '例如：0912-345-678',
    selectFile: '📂 點此選擇檔案 / 手機拍照',
    fileSelected: '📄 已選取：',
    submit: '🚀 確認上傳',
    processing: '處理中...',
    privacy: '🔒 您的資料將被加密保護，僅供本次簽證申請使用。',
    successTitle: '上傳成功！',
    successText: '您好，我們已收到您的證件資料。',
    linePrompt: '📱 連結 LINE 接收即時通知',
    addLine: '加入官方 LINE',
    uploadAnother: '上傳另一份證件',
    fillAllFields: '請填寫所有欄位並選擇檔案！',
    uploadSuccess: '✅ 證件上傳成功！',
    uploadFailed: '❌ 上傳失敗：',
    error: '❌ 發生錯誤：',
  },
  'zh-CN': {
    title: '📸 旅游证件上传',
    subtitle: '请上传您的护照或身份证件，系统将自动加密保护。',
    groupId: '团号 (Group ID)',
    groupIdPlaceholder: '例如：2026-JP-001',
    name: '姓名 *',
    namePlaceholder: '请输入真实姓名',
    phone: '联系电话 *',
    phonePlaceholder: '例如：0912-345-678',
    selectFile: '📂 点此选择文件 / 手机拍照',
    fileSelected: '📄 已选取：',
    submit: '🚀 确认上传',
    processing: '处理中...',
    privacy: '🔒 您的资料将被加密保护，仅供本次签证申请使用。',
    successTitle: '上传成功！',
    successText: '您好，我们已收到您的证件资料。',
    linePrompt: '📱 连结 LINE 接收即时通知',
    addLine: '加入官方 LINE',
    uploadAnother: '上传另一份证件',
    fillAllFields: '请填写所有栏位并选择文件！',
    uploadSuccess: '✅ 证件上传成功！',
    uploadFailed: '❌ 上传失败：',
    error: '❌ 发生错误：',
  },
  'en': {
    title: '📸 Travel Document Upload',
    subtitle: 'Please upload your passport or ID.',
    groupId: 'Group ID',
    groupIdPlaceholder: 'e.g., 2026-JP-001',
    name: 'Full Name *',
    namePlaceholder: 'Enter your full name',
    phone: 'Phone Number *',
    phonePlaceholder: 'e.g., +886-912-345-678',
    selectFile: '📂 Click to select file / Take photo',
    fileSelected: '📄 Selected: ',
    submit: '🚀 Upload',
    processing: 'Processing...',
    privacy: '🔒 Your data is encrypted and used only for this visa application.',
    successTitle: 'Upload Successful!',
    successText: 'Hello, we have received your document.',
    linePrompt: '📱 Connect LINE for instant notifications',
    addLine: 'Add Official LINE',
    uploadAnother: 'Upload another document',
    fillAllFields: 'Please fill all fields and select a file!',
    uploadSuccess: '✅ Document uploaded successfully!',
    uploadFailed: '❌ Upload failed: ',
    error: '❌ Error: ',
  },
  'ja': {
    title: '📸 渡航書類アップロード',
    subtitle: 'パスポートまたは身分証明書をアップロードしてください。',
    groupId: 'グループID',
    groupIdPlaceholder: '例：2026-JP-001',
    name: '氏名 *',
    namePlaceholder: '本名を入力してください',
    phone: '電話番号 *',
    phonePlaceholder: '例：090-1234-5678',
    selectFile: '📂 ファイルを選択 / 写真を撮る',
    fileSelected: '📄 選択済み：',
    submit: '🚀 アップロード',
    processing: '処理中...',
    privacy: '🔒 お客様のデータは暗号化され、ビザ申請にのみ使用されます。',
    successTitle: 'アップロード成功！',
    successText: 'お客様の書類を受け取りました。',
    linePrompt: '📱 LINEを連携して通知を受け取る',
    addLine: '公式LINEを追加',
    uploadAnother: '別の書類をアップロード',
    fillAllFields: 'すべての項目を入力し、ファイルを選択してください！',
    uploadSuccess: '✅ 書類のアップロードに成功しました！',
    uploadFailed: '❌ アップロード失敗：',
    error: '❌ エラー：',
  },
  'ko': {
    title: '📸 여행 서류 업로드',
    subtitle: '여권 또는 신분증을 업로드해 주세요.',
    groupId: '그룹 ID',
    groupIdPlaceholder: '예: 2026-JP-001',
    name: '이름 *',
    namePlaceholder: '실명을 입력하세요',
    phone: '전화번호 *',
    phonePlaceholder: '예: 010-1234-5678',
    selectFile: '📂 파일 선택 / 사진 촬영',
    fileSelected: '📄 선택됨: ',
    submit: '🚀 업로드',
    processing: '처리 중...',
    privacy: '🔒 귀하의 데이터는 암호화되어 비자 신청에만 사용됩니다.',
    successTitle: '업로드 성공!',
    successText: '서류를 접수했습니다.',
    linePrompt: '📱 LINE 연결하여 알림 받기',
    addLine: '공식 LINE 추가',
    uploadAnother: '다른 서류 업로드',
    fillAllFields: '모든 항목을 입력하고 파일을 선택해 주세요!',
    uploadSuccess: '✅ 서류가 성공적으로 업로드되었습니다!',
    uploadFailed: '❌ 업로드 실패: ',
    error: '❌ 오류: ',
  },
};

const languages = [
  { code: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
  { code: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
];

export default function Home() {
  const router = useRouter();
  const [lang, setLang] = useState('zh-TW');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [mode, setMode] = useState('form'); // 預設直接進入表單 (最自然)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [groupId, setGroupId] = useState('2026-JP-001');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const t = translations[lang] || translations['zh-TW'];

  // 從 localStorage 讀取語言設定
  useEffect(() => {
    const savedLang = localStorage.getItem('lang');
    if (savedLang && translations[savedLang]) {
      setLang(savedLang);
    }
  }, []);

  // 切換語言
  const changeLang = (code) => {
    setLang(code);
    localStorage.setItem('lang', code);
    setShowLangMenu(false);
  };

  // LINE Login URL (重新加入)
  const lineLoginUrl = `https://access.line.me/oauth2/v2.1/authorize?` +
    `response_type=code` +
    `&client_id=${process.env.NEXT_PUBLIC_LINE_CHANNEL_ID || '2009075717'}` +
    `&redirect_uri=${encodeURIComponent((process.env.NEXT_PUBLIC_BASE_URL || 'https://travel-doc-upload.vercel.app') + '/api/line-callback')}` +
    `&state=upload` +
    `&scope=profile%20openid` +
    `&bot_prompt=aggressive`; // 自動加入好友

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !name || !phone) {
      alert(t.fillAllFields);
      return;
    }

    setLoading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('name', name);
    formData.append('phone', phone);
    formData.append('groupId', groupId);
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_API_SECRET_KEY || 'default-secret-key',
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMode('success');
        setMessage(t.uploadSuccess);
      } else {
        setMessage(t.uploadFailed + (data.error || ''));
      }
    } catch (err) {
      setMessage(t.error + err.message);
    }
    setLoading(false);
  };

  // 語言選擇器
  const LanguageSelector = () => (
    <div style={styles.langContainer}>
      <button 
        onClick={() => setShowLangMenu(!showLangMenu)}
        style={styles.langButton}
      >
        🌐 {languages.find(l => l.code === lang)?.flag}
      </button>
      {showLangMenu && (
        <div style={styles.langMenu}>
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => changeLang(l.code)}
              style={{
                ...styles.langOption,
                backgroundColor: lang === l.code ? '#f0f0f0' : 'white',
              }}
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // 成功畫面 (這裡引導加入 LINE)
  if (mode === 'success') {
    return (
      <div style={styles.container}>
        <div style={styles.successBox}>
          <LanguageSelector />
          <div style={styles.successIcon}>✅</div>
          <h1 style={styles.successTitle}>{t.successTitle}</h1>
          <p style={styles.successText}>
            {name} {t.successText}
          </p>
          
          <div style={styles.divider}></div>
          <p style={styles.linePrompt}>{t.linePrompt}</p>
          <a 
            href={lineLoginUrl}
            style={styles.lineButton}
          >
            {t.addLine}
          </a>
          
          <button 
            onClick={() => {
              setMode('form'); // 回到表單
              setName('');
              setPhone('');
              setFile(null);
            }}
            style={styles.resetButton}
          >
            {t.uploadAnother}
          </button>
        </div>
      </div>
    );
  }

  // 上傳表單 (預設畫面)
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <LanguageSelector />
        
        <h1 style={styles.title}>{t.title}</h1>
        <p style={styles.subtitle}>{t.subtitle}</p>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>{t.groupId}</label>
            <input 
              type="text" 
              value={groupId} 
              onChange={(e) => setGroupId(e.target.value)}
              style={styles.input}
              placeholder={t.groupIdPlaceholder}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>{t.name}</label>
            <input 
              type="text" 
              placeholder={t.namePlaceholder}
              value={name} 
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>{t.phone}</label>
            <input 
              type="tel" 
              placeholder={t.phonePlaceholder}
              value={phone} 
              onChange={(e) => setPhone(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.uploadBox}>
            <label style={styles.uploadLabel}>
              {file ? (
                <span>{t.fileSelected}{file.name}</span>
              ) : (
                <span>{t.selectFile}</span>
              )}
              <input 
                type="file" 
                accept="image/*,.pdf"
                onChange={(e) => setFile(e.target.files[0])}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              ...styles.submitButton,
              background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            {loading ? t.processing : t.submit}
          </button>

          {message && <p style={styles.message}>{message}</p>}
        </form>

        <p style={styles.privacy}>{t.privacy}</p>

        {/* 員工後台入口 */}
        <div style={{marginTop: '20px', textAlign: 'center'}}>
          <a href="/admin" style={{fontSize: '12px', color: '#bbb', textDecoration: 'none'}}>
            🔒 員工專區
          </a>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    padding: '40px 30px',
    maxWidth: '450px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    position: 'relative',
    textAlign: 'center',
  },
  langContainer: {
    position: 'absolute',
    top: '15px',
    right: '15px',
    zIndex: 10,
  },
  langButton: {
    background: 'white',
    border: '2px solid #eee',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '18px',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  langMenu: {
    position: 'absolute',
    top: '45px',
    right: '0',
    background: 'white',
    borderRadius: '10px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    overflow: 'hidden',
    zIndex: 100,
    minWidth: '140px',
  },
  langOption: {
    display: 'block',
    width: '100%',
    padding: '12px 15px',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '14px',
    borderBottom: '1px solid #f0f0f0',
  },
  title: {
    fontSize: '28px',
    marginBottom: '10px',
    textAlign: 'center',
    color: '#333',
    marginTop: '10px',
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
    marginBottom: '25px',
    fontSize: '14px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    textAlign: 'left',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#444',
  },
  input: {
    padding: '14px',
    fontSize: '16px',
    border: '2px solid #e0e0e0',
    borderRadius: '10px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  uploadBox: {
    border: '2px dashed #ccc',
    borderRadius: '10px',
    padding: '30px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  uploadLabel: {
    display: 'block',
    cursor: 'pointer',
    color: '#666',
  },
  submitButton: {
    padding: '16px',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  message: {
    textAlign: 'center',
    fontWeight: '600',
    padding: '10px',
  },
  privacy: {
    fontSize: '12px',
    color: '#999',
    textAlign: 'center',
    marginTop: '20px',
  },
  successBox: {
    background: 'white',
    borderRadius: '20px',
    padding: '50px 30px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    position: 'relative',
  },
  successIcon: {
    fontSize: '60px',
    marginBottom: '20px',
  },
  successTitle: {
    fontSize: '28px',
    color: '#333',
    marginBottom: '15px',
  },
  successText: {
    color: '#666',
    fontSize: '16px',
    lineHeight: '1.6',
  },
  divider: {
    height: '1px',
    background: '#eee',
    margin: '30px 0',
  },
  linePrompt: {
    color: '#666',
    marginBottom: '15px',
  },
  lineButton: {
    display: 'block',
    background: '#06C755',
    color: 'white',
    padding: '14px 30px',
    borderRadius: '10px',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '15px',
  },
  resetButton: {
    background: 'transparent',
    border: '2px solid #ddd',
    padding: '12px 25px',
    borderRadius: '10px',
    color: '#666',
    cursor: 'pointer',
    fontSize: '14px',
    marginTop: '20px',
  },
};
