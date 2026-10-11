import { useCallback, useEffect, useRef, useState } from "react";

// API ঠিকানা আসে .env ফাইলের REACT_APP_API_BASE_URL থেকে
const API_BASE = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
// লগইনের পর JWT যে key তে localStorage এ রাখেন
const TOKEN_KEY = "token";

const styles = `
.wb-admin{--green:#0b6b4f;--green-dark:#084f3b;--red:#c8323c;--ink:#1c2420;--muted:#5e6b64;--line:#d9e0dc;--bg:#f3f6f4;--card:#fff;
  min-height:100vh;background:var(--bg);color:var(--ink);font-family:"Noto Sans Bengali","Hind Siliguri",system-ui,sans-serif;
  padding:24px 16px 48px;box-sizing:border-box}
.wb-admin *{box-sizing:border-box}
.wb-wrap{max-width:560px;margin:0 auto}
.wb-title{font-size:1.5rem;font-weight:700;margin:0 0 4px}
.wb-sub{color:var(--muted);margin:0 0 20px;font-size:.95rem}
.wb-card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px;margin-bottom:16px}
.wb-card h2{font-size:1rem;margin:0 0 12px;font-weight:700}
.wb-current{display:flex;gap:20px;flex-wrap:wrap}
.wb-current dt{font-size:.8rem;color:var(--muted);margin:0}
.wb-current dd{margin:2px 0 0;font-size:1.15rem;font-weight:700}
.wb-badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:.8rem;font-weight:600}
.wb-badge.force{background:#fbe3e5;color:var(--red)}
.wb-badge.soft{background:#e1f1ea;color:var(--green)}
.wb-field{margin-bottom:14px}
.wb-field label{display:block;font-weight:600;margin-bottom:6px;font-size:.92rem}
.wb-field input[type=text],.wb-field input[type=number]{width:100%;padding:11px 12px;border:1px solid var(--line);border-radius:8px;font:inherit;background:#fff}
.wb-field input:focus-visible,.wb-btn:focus-visible,.wb-drop:focus-within{outline:3px solid #7fc3a8;outline-offset:1px}
.wb-hint{color:var(--muted);font-size:.82rem;margin-top:4px}
.wb-drop{display:block;border:2px dashed var(--line);border-radius:10px;padding:18px;text-align:center;cursor:pointer;background:#fafcfb}
.wb-drop.has{border-style:solid;border-color:var(--green);background:#eef7f2}
.wb-drop input{position:absolute;opacity:0;width:1px;height:1px}
.wb-check{display:flex;gap:10px;align-items:flex-start;cursor:pointer}
.wb-check input{margin-top:4px;width:18px;height:18px;accent-color:var(--red)}
.wb-btn{width:100%;padding:13px;border:0;border-radius:10px;background:var(--green);color:#fff;font:inherit;font-weight:700;cursor:pointer}
.wb-btn:hover:not(:disabled){background:var(--green-dark)}
.wb-btn:disabled{opacity:.55;cursor:not-allowed}
.wb-bar{height:10px;background:var(--line);border-radius:6px;overflow:hidden;margin-top:12px}
.wb-bar>div{height:100%;background:var(--green);transition:width .15s}
.wb-msg{padding:12px 14px;border-radius:8px;margin-top:14px;font-size:.93rem;word-break:break-word}
.wb-msg.ok{background:#e1f1ea;color:#0a4d38}
.wb-msg.err{background:#fbe3e5;color:#8f1f28}
.wb-warn{background:#fff6dd;border:1px solid #ecd48a;color:#6b5200;padding:12px 14px;border-radius:8px;margin-bottom:16px;font-size:.92rem}
@media (prefers-reduced-motion:reduce){.wb-bar>div{transition:none}}
`;

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AdminApp() {
  const [current, setCurrent] = useState(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);

  const [versionName, setVersionName] = useState("");
  const [versionCode, setVersionCode] = useState("");
  const [force, setForce] = useState(false);
  const [file, setFile] = useState(null);

  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'ok' | 'err', text }

  const xhrRef = useRef(null);
  const token = localStorage.getItem(TOKEN_KEY);

  const loadCurrent = useCallback(async () => {
    setLoadingCurrent(true);
    try {
      const res = await fetch(`${API_BASE}/api/version`);
      if (res.status === 404) {
        setCurrent(null);
        setVersionCode("1");
      } else if (res.ok) {
        const data = await res.json();
        setCurrent(data);
        setVersionCode(String(data.versionCode + 1));
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      setMessage({ type: "err", text: `বর্তমান ভার্সন আনা যায়নি: ${e.message}` });
    } finally {
      setLoadingCurrent(false);
    }
  }, []);

  useEffect(() => {
    loadCurrent();
    return () => xhrRef.current?.abort();
  }, [loadCurrent]);

  function validate() {
    if (!file) return "APK ফাইল বেছে নিন।";
    if (!file.name.toLowerCase().endsWith(".apk")) return "শুধু .apk ফাইল দেওয়া যাবে।";
    if (!versionName.trim()) return "ভার্সন নাম লিখুন (যেমন 1.0.1)।";
    const code = Number(versionCode);
    if (!Number.isInteger(code) || code < 1) return "ভার্সন কোড একটা পূর্ণ সংখ্যা হতে হবে।";
    if (current && code <= current.versionCode)
      return `ভার্সন কোড ${current.versionCode} এর চেয়ে বড় হতে হবে।`;
    return null;
  }

  function submit(e) {
    e.preventDefault();
    setMessage(null);

    const problem = validate();
    if (problem) {
      setMessage({ type: "err", text: problem });
      return;
    }

    const body = new FormData();
    body.append("apk", file);
    body.append("versionName", versionName.trim());
    body.append("versionCode", versionCode);
    body.append("force", String(force));

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", `${API_BASE}/api/admin/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        setMessage({ type: "ok", text: `ভার্সন ${versionName} প্রকাশ হয়েছে।` });
        setFile(null);
        setVersionName("");
        setForce(false);
        setProgress(0);
        loadCurrent();
      } else if (xhr.status === 401 || xhr.status === 403) {
        setMessage({
          type: "err",
          text: "অনুমতি নেই। অ্যাডমিন অ্যাকাউন্ট দিয়ে আবার লগইন করুন।",
        });
      } else {
        setMessage({
          type: "err",
          text: xhr.responseText || `আপলোড ব্যর্থ (HTTP ${xhr.status})`,
        });
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setMessage({ type: "err", text: "সার্ভারে সংযোগ হয়নি। ইন্টারনেট ও API ঠিকানা দেখুন।" });
    };

    setUploading(true);
    setProgress(0);
    xhr.send(body);
  }

  return (
    <div className="wb-admin">
      <style>{styles}</style>
      <div className="wb-wrap">
        <h1 className="wb-title">Win BD অ্যাপ আপডেট</h1>
        <p className="wb-sub">নতুন APK আপলোড করলে ব্যবহারকারীর অ্যাপে আপডেটের বার্তা আসবে।</p>

        {!token && (
          <div className="wb-warn">
            লগইন টোকেন পাওয়া যায়নি। আগে অ্যাডমিন হিসেবে লগইন করুন।
          </div>
        )}

        <section className="wb-card" aria-live="polite">
          <h2>এখন চালু ভার্সন</h2>
          {loadingCurrent ? (
            <p className="wb-hint">লোড হচ্ছে…</p>
          ) : current ? (
            <dl className="wb-current">
              <div>
                <dt>ভার্সন</dt>
                <dd>{current.versionName}</dd>
              </div>
              <div>
                <dt>কোড</dt>
                <dd>{current.versionCode}</dd>
              </div>
              <div>
                <dt>ধরন</dt>
                <dd>
                  <span className={`wb-badge ${current.forceUpdate ? "force" : "soft"}`}>
                    {current.forceUpdate ? "বাধ্যতামূলক" : "ঐচ্ছিক"}
                  </span>
                </dd>
              </div>
              {current.createdAt && (
                <div>
                  <dt>আপলোড</dt>
                  <dd style={{ fontSize: ".95rem" }}>
                    {new Date(current.createdAt).toLocaleString("bn-BD")}
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="wb-hint">এখনো কোনো ভার্সন আপলোড হয়নি।</p>
          )}
        </section>

        <form className="wb-card" onSubmit={submit}>
          <h2>নতুন ভার্সন আপলোড</h2>

          <div className="wb-field">
            <label htmlFor="apk">APK ফাইল</label>
            <label className={`wb-drop ${file ? "has" : ""}`} htmlFor="apk">
              <input
                id="apk"
                type="file"
                accept=".apk,application/vnd.android.package-archive"
                disabled={uploading}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file ? `${file.name} (${formatSize(file.size)})` : "ফাইল বেছে নিতে ট্যাপ করুন"}
            </label>
          </div>

          <div className="wb-field">
            <label htmlFor="vname">ভার্সন নাম</label>
            <input
              id="vname"
              type="text"
              placeholder="1.0.1"
              value={versionName}
              disabled={uploading}
              onChange={(e) => setVersionName(e.target.value)}
            />
          </div>

          <div className="wb-field">
            <label htmlFor="vcode">ভার্সন কোড</label>
            <input
              id="vcode"
              type="number"
              min="1"
              value={versionCode}
              disabled={uploading}
              onChange={(e) => setVersionCode(e.target.value)}
            />
            <div className="wb-hint">
              pubspec.yaml এর <code>version: 1.0.1+2</code> এর "+" এর পরের সংখ্যার সাথে মিলতে হবে।
            </div>
          </div>

          <div className="wb-field">
            <label className="wb-check">
              <input
                type="checkbox"
                checked={force}
                disabled={uploading}
                onChange={(e) => setForce(e.target.checked)}
              />
              <span>
                বাধ্যতামূলক আপডেট
                <span className="wb-hint" style={{ display: "block" }}>
                  চালু করলে আপডেট না করা পর্যন্ত ব্যবহারকারী অ্যাপ চালাতে পারবে না।
                </span>
              </span>
            </label>
          </div>

          <button className="wb-btn" type="submit" disabled={uploading || !token}>
            {uploading ? `আপলোড হচ্ছে… ${progress}%` : "আপলোড ও প্রকাশ করুন"}
          </button>

          {uploading && (
            <div
              className="wb-bar"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div style={{ width: `${progress}%` }} />
            </div>
          )}

          {message && (
            <div className={`wb-msg ${message.type}`} role="status">
              {message.text}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

