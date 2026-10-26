/* ============================================================
 * 磁盘数据同步（v2.1）：磁盘是账号数据的唯一权威
 *   默认身份（未登录）：数据只存浏览器，本文件不做任何磁盘读写
 *   登录账号：localStorage 是运行缓存；页面加载时从磁盘对齐一次，
 *            之后每次修改防抖写回 data/<用户名>.json（带 savedAt 时间戳，
 *            磁盘与缓存冲突时时间戳新的赢，任何一方都不会静默覆盖对方）
 *   file:// 双击打开：离线模式，只跑浏览器缓存（account.js 会提示）
 *   v2.1 修复：
 *   - /api 请求带超时（4s）与重试（3 次）：服务器假死不再让页面
 *     永远停在"默认身份、无数据"的半初始化状态
 *   - 连接失败不再是静默的：账号按钮显示 ⚠，账号弹窗给出原因和重试
 *   - 身份切换写入 sync_epoch 代际号：其他标签页发现代际变了立即
 *     重新对齐磁盘，而不是把切换中途的数据推上磁盘覆盖账号
 *     （多标签互相覆盖、"登录后数据消失"的根源）
 *   - 数据比较改用键序无关的稳定序列化：同内容不再被误判为不同，
 *     消除因此产生的无意义写盘和连锁刷新
 * 接口（server.py v2）：
 *   GET  /api/state  → {dataDir, accounts, current, user:{savedAt,data}|null}
 *   POST /api/user   → {name, bundle:{savedAt, data}}        保存账号数据包
 *   POST /api/auth   → {accounts, current, remove?}          账号表/身份/删号
 *   POST /api/config → {dataDir}                             修改数据目录
 * 注意：本文件在 account.js 之后、app.js 之前加载
 * ============================================================ */
"use strict";

(() => {
  const DIR = "data/";
  const SAVED = "__savedAt";
  const EPOCH = DIR + "sync_epoch";   // 身份代际：任何标签页切换身份都会更新
  const KEYS = window.NAV_ACCOUNT_KEYS || [];
  if (!KEYS.length) return;
  const HTTP = /^https?:/.test(location.protocol);

  /* account.js 通过这些方法联动磁盘；离线时全部为安全空操作 */
  let readyResolve = null;
  const readyPromise = new Promise((r) => { readyResolve = r; });
  window.NAV_DISK = {
    /* status: connecting 连接中 / on 已连接 / error 连接失败 / offline 离线模式 */
    enabled: false, offline: !HTTP, status: HTTP ? "connecting" : "offline",
    dataDir: "", errs: [],
    pushUser: async () => {}, auth: async () => ({}), getState: async () => ({}),
    setDir: async () => ({}), markSuppress: () => {}, bumpEpoch: () => {},
    /* 登录/切换前等启动完成（最多 ms 毫秒），防止在服务器状态未知时动手脚 */
    waitReady: (ms) => Promise.race([readyPromise, new Promise((r) => setTimeout(r, ms))])
  };
  if (!HTTP) { readyResolve(); return; }   // file://：离线模式

  const readCurrent = () => {
    let cur = localStorage.getItem(DIR + "current") || "";
    if (/^".*"$/s.test(cur)) { try { cur = JSON.parse(cur); } catch { /* 保留原值 */ } }
    return typeof cur === "string" ? cur : "";
  };
  const snapshot = () => {
    const b = {};
    for (const k of KEYS) {
      const v = localStorage.getItem(k);
      if (v !== null) b[k] = v;
    }
    return b;
  };
  /* 键序无关的稳定序列化：同内容不同键序不被误判为"变了" */
  const stable = (o) => {
    if (o === null || typeof o !== "object") return JSON.stringify(o) ?? "null";
    if (Array.isArray(o)) return "[" + o.map(stable).join(",") + "]";
    return "{" + Object.keys(o).sort().map((k) => JSON.stringify(k) + ":" + stable(o[k])).join(",") + "}";
  };
  const getSaved = (name) => Number(localStorage.getItem(DIR + name + "/" + SAVED) || 0);
  const setSaved = (name, t) => {
    try { localStorage.setItem(DIR + name + "/" + SAVED, String(t)); } catch { /* 忽略 */ }
  };
  const getEpoch = () => { try { return localStorage.getItem(EPOCH) || "0"; } catch { return "0"; } };
  const setEpoch = () => {
    try { localStorage.setItem(EPOCH, Date.now() + Math.random().toString(36).slice(2, 6)); } catch { /* 忽略 */ }
  };

  /* 数据包 → localStorage：先清空该账号文件夹缓存与标准键，再整体写入 */
  function applyBundle(name, data) {
    for (const k of KEYS) {
      localStorage.removeItem(DIR + name + "/" + k);
      localStorage.removeItem(k);
    }
    for (const [k, v] of Object.entries(data || {})) {
      const sv = typeof v === "string" ? v : JSON.stringify(v);
      localStorage.setItem(DIR + name + "/" + k, sv);
      if (KEYS.includes(k)) localStorage.setItem(k, sv);
    }
  }

  /* 回到默认身份：清空标准键，恢复本浏览器给默认身份留的数据 */
  function restoreDefault() {
    for (const k of KEYS) localStorage.removeItem(k);
    const p = DIR + "default/", keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(p)) keys.push(k);
    }
    for (const k of keys) {
      const sk = k.slice(p.length);
      if (KEYS.includes(sk)) {
        const v = localStorage.getItem(k);
        if (v !== null) localStorage.setItem(sk, v);
      }
    }
  }

  async function fetchT(url, ms) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    try { return await fetch(url, { signal: c.signal }); }
    finally { clearTimeout(t); }
  }

  async function postJSON(url, obj) {
    const r = await fetchT2(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(obj)
    }, 8000);
    if (!r.ok) throw new Error("http " + r.status);
    return r.json();
  }
  async function fetchT2(url, opts, ms) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    try { return await fetch(url, Object.assign({ signal: c.signal }, opts)); }
    finally { clearTimeout(t); }
  }

  async function pushUser(name, bundle) {
    if (!name) return;
    const savedAt = Date.now();
    await postJSON("/api/user", { name, bundle: { savedAt, data: bundle || {} } });
    setSaved(name, savedAt);
  }

  let lastFp = null, myEpoch = "0", pushTimer = null;
  const fp = () => stable(snapshot());

  async function startup() {
    const D = window.NAV_DISK;
    let s = null, why = "";
    for (let i = 0; i < 3; i++) {
      try {
        const ping = await fetchT("/api/ping", 4000);
        if (!ping.ok) { why = "ping http " + ping.status; break; }
        s = await (await fetchT("/api/state", 4000)).json();
        break;
      } catch (e) {
        why = e && e.name === "AbortError" ? "请求超时" : String(e && e.message || e);
      }
    }
    if (!s) {
      /* 连不上/假死：明确亮出失败状态，页面按浏览器缓存继续跑，
         绝不能默默当"默认身份"用——那正是"登录了却没数据"的假象来源 */
      D.status = "error";
      D.errs.push("startup: " + why);
      readyResolve();
      return;
    }
    D.enabled = true;
    D.status = "on";
    D.dataDir = s.dataDir || "";
    /* 真实方法立即挂载并放行等待者：状态已就绪，交互随时可能发生 */
    D.pushUser = pushUser;
    D.auth = async (obj) => await postJSON("/api/auth", obj);
    D.getState = async () => await (await fetchT("/api/state", 4000)).json();
    D.setDir = async (p) => {
      const r = await postJSON("/api/config", { dataDir: p });
      if (r && r.dataDir) D.dataDir = r.dataDir;
      return r;
    };
    D.markSuppress = () => {
      try { localStorage.setItem(DIR + "sync_suppress", "1"); } catch { /* 忽略 */ }
    };
    D.bumpEpoch = setEpoch;
    readyResolve();
    localStorage.setItem(DIR + "sync_suppress", "0");

    const diskCur = String(s.current ?? "");
    const localCur = readCurrent();
    try { localStorage.setItem(DIR + "accounts", JSON.stringify(s.accounts || {})); } catch { /* 忽略 */ }

    if (diskCur !== localCur) {
      /* 身份以磁盘为准（换了浏览器/别处登录过）。先把本地当前数据安置好 */
      if (localCur) {
        const std = snapshot();
        applyBundle(localCur, std);                    // 写回其文件夹缓存
        try { await pushUser(localCur, std); }         // 磁盘兜底保存
        catch (e) { D.errs.push("save: " + e.message); }
      } else {
        for (const [k, v] of Object.entries(snapshot())) {
          localStorage.setItem(DIR + "default/" + k, v);   // 默认身份的数据留本浏览器
        }
      }
      localStorage.setItem(DIR + "current", diskCur);
      if (diskCur) {
        const data = s.user && typeof s.user.data === "object" ? s.user.data : {};
        applyBundle(diskCur, data);
        setSaved(diskCur, (s.user && s.user.savedAt) || Date.now());
      } else {
        restoreDefault();
      }
      D.markSuppress();
      location.reload();
      return;
    }

    if (diskCur) {
      const diskSaved = s.user ? (s.user.savedAt || 0) : -1;
      const data = s.user && typeof s.user.data === "object" ? s.user.data : null;
      const snap = snapshot();
      if (data && diskSaved > getSaved(diskCur) && stable(data) !== stable(snap)) {
        applyBundle(diskCur, data);              // 磁盘较新（他处保存过）：以磁盘为准
        setSaved(diskCur, diskSaved);
        D.markSuppress();
        location.reload();
        return;
      }
      if (!data || stable(data) !== stable(snap)) {
        try { await pushUser(diskCur, snap); }   // 本地较新或磁盘缺失：对齐到磁盘
        catch (e) { D.errs.push("reconcile: " + e.message); }
      }
    }
    lastFp = fp();
    myEpoch = getEpoch();

    /* 监听修改：仅登录状态。默认身份的一切改动都只留在浏览器 */
    setInterval(() => {
      if (!readCurrent()) return;
      if (getEpoch() !== myEpoch) { location.reload(); return; }   // 别的标签页切换了身份：重新对齐
      if (fp() === lastFp) return;
      clearTimeout(pushTimer);
      pushTimer = setTimeout(async () => {
        const cur = readCurrent();
        if (!cur || getEpoch() !== myEpoch) return;
        const snap = snapshot();
        try {
          await pushUser(cur, snap);
          lastFp = stable(snap);
        } catch (e) { D.errs.push("push: " + e.message); }
      }, 800);
    }, 4000);

    window.addEventListener("beforeunload", () => {
      if (localStorage.getItem(DIR + "sync_suppress") === "1") return;
      if (getEpoch() !== myEpoch) return;        // 身份切换中：不推，防止把中途状态写上磁盘
      const cur = readCurrent();
      if (!cur || fp() === lastFp) return;
      try {
        navigator.sendBeacon("/api/user", new Blob(
          [JSON.stringify({ name: cur, bundle: { savedAt: Date.now(), data: snapshot() } })],
          { type: "application/json" }));
      } catch { /* 忽略 */ }
    });

    /* 后台标签页的定时器会被浏览器节流/冻结：回到前台时立即对齐一次，
       保证切回标签页就能看到自己的修改已落盘 */
    const syncNow = () => {
      const cur = readCurrent();
      if (!cur || getEpoch() !== myEpoch || fp() === lastFp) return;
      clearTimeout(pushTimer);
      const snap = snapshot();
      pushUser(cur, snap)
        .then(() => { lastFp = stable(snap); })
        .catch((e) => D.errs.push("push: " + e.message));
    };
    document.addEventListener("visibilitychange", () => { if (!document.hidden) syncNow(); });
    window.addEventListener("focus", syncNow);
  }

  startup();
})();
