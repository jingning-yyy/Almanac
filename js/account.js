/* ============================================================
 * 本机多账号（data 目录版）：每个账号一个"数据文件夹"
 *   data/<用户名>/<数据键>   —— localStorage 键即文件夹里的文件
 *   data/accounts            —— 账号表（用户名 → 密码哈希）
 *   data/current             —— 当前身份（空 = 默认）
 *   data/default/*           —— 默认身份基线（仅内置推荐，不含导入数据）
 * 行为：
 *  - 不输入账号 = 默认身份：只显示内置推荐（不加载 iTab/书签/生日管家导入）
 *  - 首次升级迁移（仅一次）：把升级前的现有数据整体放入「我的数据」（密码 1234）
 *  - 删除某用户文件夹 = 该用户数据清零；重建时以默认基线初始化
 *  - 切换账号：打包/还原各自文件夹后刷新页面，所有模块无需改造
 * 说明：密码仅本机分区与简单遮挡（哈希存储），并非加密安全
 * 注意：本文件必须最先加载（早于一切读取 localStorage 的脚本）
 * ============================================================ */
"use strict";

(() => {
  const DIR = "data/";
  const CUR = DIR + "current";
  const ACCOUNTS = DIR + "accounts";
  const MIG = DIR + "migrated";
  const KEYS = [
    "nav_timers", "nav_timer_style", "nav_timer_cat", "nav_timer_compact", "nav_timer_order",
    "nav_records", "nav_auto_done", "nav_mood", "nav_diary", "nav_holiday_off",
    "nav_custom_sites", "nav_hidden_sites", "nav_site_moves", "nav_cat_renames",
    "nav_removed_cats", "nav_cat_order", "nav_site_order"
  ];
  window.NAV_ACCOUNT_KEYS = KEYS;   // 供 data-sync.js 磁盘镜像使用
  const hash = (s) => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  };
  const getUser = () => localStorage.getItem(CUR) || "";
  const folderPrefix = (u) => DIR + (u || "default") + "/";
  const folderKeys = (u) => {
    const p = folderPrefix(u), out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(p)) out.push(k);
    }
    return out;
  };
  const snapshotStd = () => {
    const b = {};
    for (const k of KEYS) {
      const v = localStorage.getItem(k);
      if (v !== null) b[k] = v;
    }
    return b;
  };
  const writeFolder = (u, bundle) => {
    const p = folderPrefix(u);
    for (const k of KEYS) {
      if (k in bundle) localStorage.setItem(p + k, bundle[k]);
      else localStorage.removeItem(p + k);
    }
  };
  const readFolder = (u) => {
    const p = folderPrefix(u), b = {};
    for (const k of folderKeys(u)) b[k.slice(p.length)] = localStorage.getItem(k);
    return b;
  };
  const deleteFolder = (u) => { for (const k of folderKeys(u)) localStorage.removeItem(k); };
  const clearStd = () => { for (const k of KEYS) localStorage.removeItem(k); };
  const accounts = () => {
    try { return JSON.parse(localStorage.getItem(ACCOUNTS)) || {}; } catch { return {}; }
  };

  /* 当前身份数据写回其文件夹 */
  function stash() { writeFolder(getUser(), snapshotStd()); }
  /* 目标文件夹还原到标准键（文件夹不存在 = 清空标准键，按基线重建） */
  function restore(u) {
    clearStd();
    for (const [k, v] of Object.entries(readFolder(u))) localStorage.setItem(k, v);
  }
  function switchTo(name) {
    stash();
    if (name && !folderKeys(name).length) {
      writeFolder(name, readFolder("default"));   // 新建/重建：内容与默认一致
      /* 新账号与默认保持一致：不触发生日管家自动导入 */
      if (window.__AUTO_IMPORT?.length) {
        const akey = (r) => `${r.name}|${r.cal}|${r.m}|${r.d}|${r.leap ? "L" : ""}`;
        localStorage.setItem(folderPrefix(name) + "nav_auto_done", JSON.stringify(window.__AUTO_IMPORT.map(akey)));
      }
      localStorage.setItem(folderPrefix(name) + "nav_builtin_only", "1");
    }
    restore(name);
    localStorage.setItem(CUR, name);
    location.reload();
  }

  /* ---------- 一次性迁移：现有数据 →「我的数据」（密码 1234） ---------- */
  function migrateIfNeeded() {
    if (localStorage.getItem(MIG)) return;
    localStorage.setItem(MIG, "1");             // 先落标记，避免任何情况下循环
    const base = snapshotStd();
    if (!KEYS.some((k) => k in base)) return;   // 全新设备：无可迁移数据
    writeFolder("我的数据", base);              // 现有数据整体放入该账号名下
    const acc = accounts();
    acc["我的数据"] = hash("1234");
    localStorage.setItem(ACCOUNTS, JSON.stringify(acc));
    writeFolder("default", {});                 // 默认基线 = 纯内置推荐（空个人数据）
    localStorage.setItem(CUR, "我的数据");        // 自动以该身份进入
  }
  migrateIfNeeded();

  /* 默认基线缺失时补建：已登录其他身份时基线为空（纯内置推荐），未登录时快照当前 */
  function ensureDefaultFolder() {
    if (folderKeys("default").length) return;
    const b = getUser() ? {} : snapshotStd();
    writeFolder("default", b);
  }
  ensureDefaultFolder();

  /* 暴露当前身份：万年历附件前缀 + 默认身份只显示内置推荐 */
  window.NAV_USER = getUser();
  window.NAV_USER_PREFIX = window.NAV_USER ? `u:${window.NAV_USER}:` : "";
  /* 内置推荐视图判定：默认身份 = 是；建号时标记了 nav_builtin_only 的账号 = 是；
     迁移进来的账号= 否（保留完整导入数据） */
  let builtinOnly;
  if (!window.NAV_USER) {
    builtinOnly = true;
  } else {
    let flag = null;
    try { flag = localStorage.getItem(folderPrefix(window.NAV_USER) + "nav_builtin_only"); } catch { /* 忽略 */ }
    builtinOnly = flag === "1";
  }
  window.NAV_BUILTIN_ONLY = builtinOnly;

  /* ---------- 登录界面 ---------- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  /* ---------- 数据文件夹可视化与管理 ---------- */
  /* 当前用户读实时标准键（修改即时可见），其他用户读文件夹存档 */
  const dataOf = (u) => (u === getUser() ? snapshotStd() : readFolder(u));
  function exportUser(u) {
    const b = dataOf(u);
    const blob = new Blob([JSON.stringify(b, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `data_${u || "default"}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  let impInput = null, impTarget = null;
  function pickImport(u) {
    if (!impInput) {
      impInput = document.createElement("input");
      impInput.type = "file";
      impInput.accept = ".json,application/json";
      impInput.style.display = "none";
      document.body.appendChild(impInput);
      impInput.onchange = async () => {
        const f = impInput.files[0];
        impInput.value = "";
        if (!f || !impTarget) return;
        try {
          const obj = JSON.parse(await f.text());
          if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw new Error("格式不对");
          writeFolder(impTarget, obj);
          if (getUser() === impTarget) restore(impTarget);   // 导入给自己：立即生效
          location.reload();
        } catch (e) {
          alert("导入失败：" + String(e && e.message || e));
        }
      };
    }
    impTarget = u;
    impInput.click();
  }

  function renderManage() {
    const box = document.getElementById("accManage");
    if (!box) return;
    const cur = getUser();
    const acc = accounts();
    const rows = [{ u: "", label: "data/default/（默认身份）", canClear: false, canRm: false }];
    for (const n of Object.keys(acc)) rows.push({ u: n, label: `data/${n}/`, canClear: true, canRm: true });
    box.innerHTML = rows.map((r) => {
      const curMark = r.u === cur ? `<span class="acc-cur-mark">当前</span>` : "";
      const ops =
        `<button type="button" class="acc-exp" data-act="exp" data-u="${esc(r.u)}" title="导出为磁盘上的 JSON 文件（方便迁移备份）">导出</button>` +
        `<button type="button" class="acc-imp" data-act="imp" data-u="${esc(r.u)}" title="从磁盘 JSON 文件导入（覆盖该用户数据）">导入</button>` +
        (r.canClear ? `<button type="button" class="acc-del" data-act="clear" data-u="${esc(r.u)}" title="文件夹数据清零（账号保留，重建与默认一致）">清零</button>` : "") +
        (r.canRm ? `<button type="button" class="acc-rm" data-act="rm" data-u="${esc(r.u)}" title="删除账号及其全部数据">删除账号</button>` : "");
      return `<div class="acc-folder">
        <div class="acc-folder-head"><b>📁 ${esc(r.label)}</b>${curMark}<span class="acc-ops">${ops}</span></div>
      </div>`;
    }).join("");

    box.querySelectorAll("button[data-act]").forEach((b) => {
      const u = b.dataset.u;
      if (b.dataset.act === "exp") b.onclick = () => exportUser(u);
      if (b.dataset.act === "imp") b.onclick = () => pickImport(u);
      if (b.dataset.act === "clear") b.onclick = () => {
        if (!confirm(`清空「${u || "默认"}」的文件夹？数据将全部清零（账号保留，重建与默认一致）。`)) return;
        deleteFolder(u);
        if (u === getUser()) clearStd();
        location.reload();
      };
      if (b.dataset.act === "rm") b.onclick = () => {
        if (!confirm(`删除账号「${u}」？\n\n该账号、密码和全部数据都会被删除，无法恢复。`)) return;
        deleteFolder(u);
        const acc2 = accounts();
        delete acc2[u];
        localStorage.setItem(ACCOUNTS, JSON.stringify(acc2));
        if (u === getUser()) { clearStd(); localStorage.setItem(CUR, ""); }
        location.reload();
      };
    });
  }

  function openModal() {
    const mask = document.getElementById("accountMask");
    if (!mask) return;
    const u = getUser();
    mask.querySelector("#accCur").textContent = u || "默认";
    mask.querySelector("#accLogout").hidden = !u;
    mask.querySelector("#accUser").value = "";
    mask.querySelector("#accPass").value = "";
    const acc = accounts();
    const names = Object.keys(acc);
    mask.querySelector("#accList").textContent = names.length
      ? "本机已有账号：" + names.join("、")
      : "本机还没有账号，输入用户名和密码即可创建";
    renderManage();
    mask.hidden = false;
    mask.querySelector("#accUser").focus();
  }

  function doLogin() {
    const name = document.getElementById("accUser").value.trim();
    const pass = document.getElementById("accPass").value;
    const u = getUser();
    if (!name) {
      if (u) switchTo("");                    // 留空 → 回到默认身份
      else alert("你已经是默认身份");
      return;
    }
    if (/[:<>\/\\|"?*]/.test(name)) { alert("用户名不能包含 : < > / \\ | ? * 字符"); return; }
    const acc = accounts();
    if (acc[name]) {
      if (acc[name] !== hash(pass || "")) { alert("密码不对，请重新输入"); return; }
    } else {
      if (!pass) { alert("新账号请设置一个密码"); return; }
      acc[name] = hash(pass);
      localStorage.setItem(ACCOUNTS, JSON.stringify(acc));
    }
    if (name === u) { document.getElementById("accountMask").hidden = true; return; }
    switchTo(name);                           // 页面将自动刷新进入该账号
  }

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("accountBtn");
    if (!btn) return;
    const sync = () => { btn.textContent = `👤 ${getUser() || "默认"}`; };
    sync();
    btn.onclick = openModal;
    document.getElementById("accLogin").onclick = doLogin;
    document.getElementById("accLogout").onclick = () => switchTo("");
    document.getElementById("accCancel").onclick = () => {
      document.getElementById("accountMask").hidden = true;
    };
    const mask = document.getElementById("accountMask");
    mask.addEventListener("click", (e) => { if (e.target === mask) mask.hidden = true; });
    mask.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doLogin();
      if (e.key === "Escape") mask.hidden = true;
    });
  });
})();
