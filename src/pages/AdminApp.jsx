import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

// API ঠিকানা আসে .env এর REACT_APP_API_BASE_URL থেকে
const API_BASE = (process.env.REACT_APP_API_BASE_URL || "http://localhost:8080")
  .trim()
  .replace(/\/+$/, "");

// LoginForm এ টোকেন এই নামেই সেভ হয়
const TOKEN_KEY = "authToken";

const MAX_MB = 200;

function formatSize(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// 1.0.1 -> 1.0.2
function suggestNextName(name) {
  if (!name) return "1.0.0";
  const parts = String(name).split(".");
  const last = parseInt(parts[parts.length - 1], 10);
  if (Number.isNaN(last)) return "";
  parts[parts.length - 1] = String(last + 1);
  return parts.join(".");
}

function readServerError(xhr) {
  if (xhr.status === 413) return "ফাইলটি সার্ভারের সীমার চেয়ে বড়।";
  if (xhr.status === 401) return "সেশন শেষ হয়েছে। আবার লগইন করুন।";
  if (xhr.status === 403) return "অনুমতি নেই। শুধু অ্যাডমিন APK আপলোড করতে পারে।";
  const raw = xhr.responseText || "";
  try {
    const json = JSON.parse(raw);
    return json.message || json.error || raw;
  } catch {
    return raw || `আপলোড ব্যর্থ (HTTP ${xhr.status})`;
  }
}

export default function AdminApp() {
  const navigate = useNavigate();
  const token = localStorage.getItem(TOKEN_KEY);

  const [current, setCurrent] = useState(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);

  const [versionName, setVersionName] = useState("");
  const [versionCode, setVersionCode] = useState("");
  const [force, setForce] = useState(false);
  const [changelog, setChangelog] = useState("");
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ pct: 0, loaded: 0, total: 0 });
  const [message, setMessage] = useState(null); // { type: "ok" | "err", text }

  const xhrRef = useRef(null);
  const inputRef = useRef(null);

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
        setVersionCode(String(Number(data.versionCode) + 1));
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      setMessage({ type: "err", text: `বর্তমান ভার্সন আনা যায়নি (${e.message})` });
    } finally {
      setLoadingCurrent(false);
    }
  }, []);

  useEffect(() => {
    loadCurrent();
    return () => xhrRef.current?.abort();
  }, [loadCurrent]);

  function pickFile(f) {
    setMessage(null);
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".apk")) {
      setFile(null);
      setMessage({ type: "err", text: "শুধু .apk ফাইল দেওয়া যাবে।" });
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setFile(null);
      setMessage({ type: "err", text: `ফাইল ${MAX_MB} MB এর বেশি হতে পারবে না।` });
      return;
    }
    setFile(f);
  }

  function validate() {
    if (!file) return "APK ফাইল বেছে নিন।";
    if (!versionName.trim()) return "ভার্সন নাম লিখুন (যেমন 1.0.1)।";
    const code = Number(versionCode);
    if (!Number.isInteger(code) || code < 1) return "ভার্সন কোড একটা পূর্ণ সংখ্যা হতে হবে।";
    if (current && code <= Number(current.versionCode))
      return `ভার্সন কোড ${current.versionCode} এর চেয়ে বড় হতে হবে।`;
    return null;
  }

  function submit(e) {
    e.preventDefault();
    setMessage(null);

    if (!token) {
      setMessage({ type: "err", text: "লগইন টোকেন নেই। আবার লগইন করুন।" });
      return;
    }

    const problem = validate();
    if (problem) {
      setMessage({ type: "err", text: problem });
      return;
    }

    if (
      force &&
      !window.confirm(
        "বাধ্যতামূলক আপডেট চালু করলে আপডেট না করা পর্যন্ত কেউ অ্যাপ চালাতে পারবে না। চালিয়ে যাবেন?"
      )
    ) {
      return;
    }

    const body = new FormData();
    body.append("apk", file);
    body.append("versionName", versionName.trim());
    body.append("versionCode", String(Number(versionCode)));
    body.append("force", String(force));
    if (changelog.trim()) body.append("changelog", changelog.trim());

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", `${API_BASE}/api/admin/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        setProgress({
          pct: Math.round((ev.loaded / ev.total) * 100),
          loaded: ev.loaded,
          total: ev.total,
        });
      }
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        setMessage({ type: "ok", text: `ভার্সন ${versionName.trim()} প্রকাশ হয়েছে।` });
        setFile(null);
        setVersionName("");
        setForce(false);
        setChangelog("");
        setProgress({ pct: 0, loaded: 0, total: 0 });
        loadCurrent();
      } else {
        setMessage({ type: "err", text: readServerError(xhr) });
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setMessage({
        type: "err",
        text: "সার্ভারে সংযোগ হয়নি। ইন্টারনেট, সার্ভার চালু আছে কিনা ও CORS দেখুন।",
      });
    };

    xhr.onabort = () => {
      setUploading(false);
      setProgress({ pct: 0, loaded: 0, total: 0 });
      setMessage({ type: "err", text: "আপলোড বাতিল করা হয়েছে।" });
    };

    xhr.ontimeout = () => {
      setUploading(false);
      setMessage({ type: "err", text: "সময় শেষ হয়ে গেছে। আবার চেষ্টা করুন।" });
    };

    xhr.timeout = 10 * 60 * 1000;
    setUploading(true);
    setProgress({ pct: 0, loaded: 0, total: file.size });
    xhr.send(body);
  }

  const nextName = suggestNextName(current?.versionName);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      {/* Top bar */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm text-gray-400 hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
          >
            ← ড্যাশবোর্ড
          </button>
          <div className="text-sm font-semibold tracking-wide text-gray-300">Win BD · অ্যাডমিন</div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">অ্যাপ আপডেট সেন্টার</h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            নতুন APK আপলোড করলে ব্যবহারকারীর ফোনে আপডেটের বার্তা চলে যাবে।
          </p>
        </div>

        {!token && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 px-4 py-3 text-sm">
            লগইন টোকেন পাওয়া যায়নি। আগে অ্যাডমিন হিসেবে লগইন করুন।
          </div>
        )}

        {/* Live version */}
        <section
          aria-live="polite"
          className="rounded-2xl overflow-hidden border border-emerald-500/30 bg-gradient-to-br from-emerald-700 via-emerald-800 to-gray-900 p-6 shadow-xl"
        >
          <div className="flex items-center gap-2 text-emerald-100/90 text-sm font-medium">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            এখন লাইভ ভার্সন
          </div>

          {loadingCurrent ? (
            <div className="mt-4 h-14 w-40 rounded-lg bg-white/10 animate-pulse" />
          ) : current ? (
            <>
              <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
                <div className="text-5xl font-extrabold tracking-tight">v{current.versionName}</div>
                <div className="pb-1.5 text-emerald-100/80 text-sm">বিল্ড {current.versionCode}</div>
                <span
                  className={`mb-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    current.forceUpdate
                      ? "bg-red-500/20 text-red-200 border border-red-400/40"
                      : "bg-white/10 text-emerald-100 border border-white/20"
                  }`}
                >
                  {current.forceUpdate ? "বাধ্যতামূলক" : "ঐচ্ছিক"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-emerald-100/80">
                {current.createdAt && (
                  <span>প্রকাশ: {new Date(current.createdAt).toLocaleString("bn-BD")}</span>
                )}
                {current.apkUrl && (
                  <a
                    href={current.apkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto inline-flex items-center rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 font-medium text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    APK ডাউনলোড
                  </a>
                )}
              </div>
            </>
          ) : (
            <p className="mt-3 text-emerald-100/80">এখনো কোনো ভার্সন আপলোড হয়নি।</p>
          )}
        </section>

        {/* Upload form */}
        <form
          onSubmit={submit}
          className="rounded-2xl border border-gray-700 bg-gray-800/60 p-5 sm:p-6 space-y-6"
        >
          <h2 className="text-lg font-semibold">নতুন ভার্সন প্রকাশ</h2>

          {/* Dropzone */}
          <div>
            <div className="text-sm font-medium text-gray-300 mb-2">APK ফাইল</div>
            <div
              role="button"
              tabIndex={0}
              aria-disabled={uploading}
              onClick={() => !uploading && inputRef.current?.click()}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !uploading) {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (!uploading) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (!uploading) pickFile(e.dataTransfer.files?.[0]);
              }}
              className={`rounded-xl border-2 border-dashed px-4 py-8 text-center cursor-pointer transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                dragging
                  ? "border-emerald-400 bg-emerald-500/10"
                  : file
                  ? "border-emerald-500/60 bg-emerald-500/5"
                  : "border-gray-600 hover:border-gray-500 bg-gray-900/40"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".apk,application/vnd.android.package-archive"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  pickFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              {file ? (
                <div>
                  <div className="font-semibold text-emerald-300 break-all">{file.name}</div>
                  <div className="text-sm text-gray-400 mt-1">
                    {formatSize(file.size)} · বদলাতে আবার ট্যাপ করুন
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-medium">APK ফাইল এখানে ছেড়ে দিন</div>
                  <div className="text-sm text-gray-400 mt-1">
                    অথবা ট্যাপ করে বেছে নিন · সর্বোচ্চ {MAX_MB} MB
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Version fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="vname" className="block text-sm font-medium text-gray-300 mb-2">
                ভার্সন নাম
              </label>
              <input
                id="vname"
                type="text"
                inputMode="decimal"
                placeholder={nextName || "1.0.1"}
                value={versionName}
                disabled={uploading}
                onChange={(e) => setVersionName(e.target.value)}
                className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-60"
              />
              {nextName && !versionName && (
                <button
                  type="button"
                  onClick={() => setVersionName(nextName)}
                  disabled={uploading}
                  className="mt-1.5 text-xs text-emerald-400 hover:text-emerald-300"
                >
                  {nextName} ব্যবহার করুন
                </button>
              )}
            </div>

            <div>
              <label htmlFor="vcode" className="block text-sm font-medium text-gray-300 mb-2">
                ভার্সন কোড
              </label>
              <input
                id="vcode"
                type="number"
                min="1"
                value={versionCode}
                disabled={uploading}
                onChange={(e) => setVersionCode(e.target.value)}
                className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-60"
              />
              <p className="mt-1.5 text-xs text-gray-500">
                pubspec.yaml এর <code className="text-gray-400">1.0.1+2</code> এর "+" এর পরের সংখ্যা
              </p>
            </div>
          </div>

          {/* Update type */}
          <fieldset disabled={uploading}>
            <legend className="text-sm font-medium text-gray-300 mb-2">আপডেটের ধরন</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { value: false, title: "ঐচ্ছিক", desc: "ব্যবহারকারী চাইলে পরে আপডেট করতে পারবে" },
                { value: true, title: "বাধ্যতামূলক", desc: "আপডেট না করলে অ্যাপ চালু হবে না" },
              ].map((opt) => {
                const active = force === opt.value;
                const tone = opt.value
                  ? active
                    ? "border-red-500 bg-red-500/10"
                    : "border-gray-600 hover:border-gray-500"
                  : active
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-gray-600 hover:border-gray-500";
                return (
                  <label
                    key={opt.title}
                    className={`block rounded-xl border px-4 py-3 cursor-pointer transition focus-within:ring-2 focus-within:ring-emerald-500 ${tone}`}
                  >
                    <input
                      type="radio"
                      name="update-type"
                      className="sr-only"
                      checked={active}
                      onChange={() => setForce(opt.value)}
                    />
                    <div className="font-semibold">{opt.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* What's new */}
          <div>
            <label htmlFor="changelog" className="block text-sm font-medium text-gray-300 mb-2">
              What's new (অ্যাপের আপডেট স্ক্রিনে দেখাবে)
            </label>
            <textarea
              id="changelog"
              rows={3}
              maxLength={300}
              value={changelog}
              disabled={uploading}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder="We've added some cool new features and fixed a few bugs."
              className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-60 resize-none"
            />
            <div className="text-right text-xs text-gray-500 mt-1">{changelog.length}/300</div>
          </div>

          {/* Progress */}
          {uploading && (
            <div role="progressbar" aria-valuenow={progress.pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="flex justify-between text-sm text-gray-300 mb-2">
                <span>
                  {formatSize(progress.loaded)} / {formatSize(progress.total)}
                </span>
                <span className="font-semibold text-emerald-400">{progress.pct}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200"
                  style={{ width: `${progress.pct}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                আপলোড শেষ না হওয়া পর্যন্ত পেজ বন্ধ করবেন না।
              </p>
            </div>
          )}

          {/* Message */}
          {message && (
            <div
              role="status"
              className={`rounded-xl px-4 py-3 text-sm break-words border ${
                message.type === "ok"
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-200"
                  : "bg-red-500/10 border-red-500/40 text-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={uploading || !token}
              className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold py-3 shadow-lg shadow-emerald-900/40 transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              {uploading ? `আপলোড হচ্ছে… ${progress.pct}%` : "আপলোড ও প্রকাশ করুন"}
            </button>
            {uploading && (
              <button
                type="button"
                onClick={() => xhrRef.current?.abort()}
                className="rounded-xl border border-gray-600 hover:border-red-400 hover:text-red-300 px-5 py-3 font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                বাতিল
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
