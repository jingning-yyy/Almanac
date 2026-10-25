/* ============================================================
 * 磁盘数据同步（可选增强）：配合 server.py 使用
 * 用 server.py 打开页面时，各账号数据自动镜像为磁盘上的真实文件：
 *   data/default/nav_timers.json   ← 默认身份的计时器
 *   data/用户名.json         ← 该账号的全部数据
 * 资源管理器里可直接查看/拷贝整个 data 文件夹给别人，方便迁移。
 * 双击 index.html（file://）或部署线上时自动停用，数据仍保存在浏览器。
 * 注意：本文件应在 account.js 之后、app.js 之前加载
 * ============================================================ */
"use strict";

(() => {
  if (!/^https?:/.test(location.protocol)) return;   // file:// 不启用
  const DIR = "data/";
  const KEYS = window.NAV_ACCOUNT_KEYS || [];
  if (!KEYS.length) return;
  /* 调试钩子（控制台可查 window.__SYNC） */
  window.__SYNC = { enabled: false, lastFp: "", errs: [], pushes: 0, push: null };

  let enabled = false;
  let lastFp = "";

  const stdSnapshot = () => {
    const b = {};
    for (const k of KEYS) {
      const v = localStorage.getItem(k);
      if (v !== null) b[k] = v;
    }
    return b;
  };
  const folderRead = (u) => {
    const p = DIR + (u || "default") + "/", b = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(p)) b[k.slice(p.length)] = localStorage.getItem(k);
    }
    return b;
  };
  const getJSON = (k, fallback) => {
    try {
      const v = localStorage.getItem(k);
      return v === null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  };

  /* current 兼容两种写法：裸字符串（account.js）与带引号 JSON（旧版拉取） */
  function readCurrent() {
    let cur = localStorage.getItem(DIR + "current") || "";
    if (/^".*"$/.test(cur)) { try { cur = JSON.parse(cur); } catch { /* 保留原值 */ } }
    return typeof cur === "string" ? cur : String(cur ?? "");
  }

  /* 浏览器存储 → 磁盘树：每个用户一个整包 { 用户名: 全部数据 } */
  function treeFromBrowser() {
    const acc = getJSON(DIR + "accounts", {});
    const cur = readCurrent();
    const tree = { "accounts": acc, "current": cur };
    const users = new Set(["default", ...Object.keys(acc)]);
    if (cur) users.add(cur);
    for (const u of users) {
      const b = Object.assign(folderRead(u), u === cur ? stdSnapshot() : {});
      tree[u || "default"] = b;
    }
    return tree;
  }

  /* 磁盘树 → 浏览器存储（全新浏览器首次打开时拉取） */
  function applyTree(tree) {
    const cur = String(tree["current"] ?? "");
    for (const [name, bundle] of Object.entries(tree)) {
      if (name === "accounts" || name === "current") continue;
      if (!bundle || typeof bundle !== "object") continue;
      for (const [k, v] of Object.entries(bundle)) {
        /* 磁盘上的值本来就是字符串，必须原样写入；JSON.stringify 会造成双重编码 */
        const sv = typeof v === "string" ? v : JSON.stringify(v);
        localStorage.setItem(DIR + name + "/" + k, sv);
        if (KEYS.includes(k) && (name === cur || (name === "default" && !cur))) {
          localStorage.setItem(k, sv);   // 当前身份/默认：同步到标准键
        }
      }
    }
    localStorage.setItem(DIR + "accounts", JSON.stringify(tree["accounts"] ?? {}));
    localStorage.setItem(DIR + "current", String(tree["current"] ?? ""));
  }

  async function push(force = false) {
    if (!enabled) return;
    let tree = null;
    try {
      tree = treeFromBrowser();
    } catch (e) {
      window.__SYNC.errs.push("tree: " + e.message);
      return;
    }
    /* 空浏览器不镜像，防误清磁盘（v73）：
     * 没有任何账号、不在任何登录身份、除 default 外无数据、且 default
     * 也没有实际内容（default 有内容说明默认身份在正常使用，放行） */
    const hasAccounts = tree["accounts"] && Object.keys(tree["accounts"]).length > 0;
    const hasCurrent = String(tree["current"] ?? "") !== "";
    const hasUserData = Object.entries(tree).some(([k, v]) =>
      k !== "accounts" && k !== "current" && k !== "default"
      && v && typeof v === "object" && Object.keys(v).length > 0);
    const defActive = !hasCurrent && tree["default"]
      && Object.keys(tree["default"]).length > 0;
    if (!hasAccounts && !hasCurrent && !hasUserData && !defActive) {
      window.__SYNC.errs.push("skip empty tree");
      return;
    }
    const fp = JSON.stringify(tree);
    if (!force && fp === lastFp) return;
    lastFp = fp;
    try {
      const r = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tree: tree })
      });
      if (!r.ok) window.__SYNC.errs.push("http " + r.status);
      else window.__SYNC.pushes++;
    } catch (e) {
      window.__SYNC.errs.push("net: " + e.message);
    }
  }

  async function startup() {
    try {
      const ping = await fetch("/api/ping");
      if (!ping.ok) return;
      enabled = true;
      window.__SYNC.enabled = true;
      document.documentElement.dataset.disksync = "1";
      const s = await fetch("/api/sync");
      const { tree = {} } = await s.json();
      const diskHas = Object.keys(tree).length > 0;
      /* 全新浏览器判定：不能用"localStorage 是否有数据键"判断——页面模块
       * 初始化会先写入内置数据（如自动节日），与本异步检查存在竞态，
       * 曾导致新浏览器跳过拉取、反手把空状态推上磁盘清空数据。
       * 改用可靠标记：从未拉取过 且 本机没有账号表。 */
      const PULLED_FLAG = "data/sync_pulled";
      const freshBrowser =
        localStorage.getItem(DIR + "accounts") === null &&
        !localStorage.getItem(PULLED_FLAG);
      if (diskHas && freshBrowser) {
        applyTree(tree);
        try { localStorage.setItem(PULLED_FLAG, "1"); } catch { /* 忽略 */ }
        location.reload();
        return;
      }
      try { localStorage.setItem(PULLED_FLAG, "1"); } catch { /* 忽略 */ }
      /* 一次性账号合并（js/merge-once.js）：在首推镜像前执行，合并结果随本次推送落盘 */
      let mergedNow = false;
      if (window.__MERGE_ONCE) {
        try { mergedNow = window.__MERGE_ONCE(tree) === true; }
        catch (e) { window.__SYNC.errs.push("merge: " + e.message); }
      }
      await push(true);                          // 启动时强制初始镜像（磁盘缺失自动重建）
      if (mergedNow) {                           // 合并改写了身份/数据：刷新一次以正确渲染
        location.reload();
        return;
      }
      setInterval(push, 5000);                   // 每 5 秒检查变化
      window.addEventListener("beforeunload", () => {
        try {
          navigator.sendBeacon("/api/sync",
            new Blob([JSON.stringify(treeFromBrowser())], { type: "application/json" }));
        } catch { /* 忽略 */ }
      });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) push();
      });
    } catch (e) {
      window.__SYNC.errs.push("startup: " + e.message);
    }
  }

  startup();
})();
