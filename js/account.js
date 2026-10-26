/* ============================================================
 * 本机多账号（v2：账号数据以磁盘为唯一权威）
 *   默认身份（未登录）：数据只存浏览器 localStorage，不落盘
 *   登录账号：磁盘 data/<用户名>.json 为权威，浏览器做运行缓存
 *   data/accounts.json 账号表 · data/current.json 当前身份
 *   数据目录位置在"账号 → 数据位置"里修改（写应用根下 config.json）
 * 行为：
 *  - 新建账号：初始与默认身份一致（内置推荐 + 空白个人数据）
 *  - 登录/切换：先保存当前身份（含推盘），再从磁盘载入目标账号，刷新生效
 *  - 导入/导出照旧；导入完成后明确提示
 *  - file:// 打开 = 离线模式：一切只存浏览器缓存
 * 说明：密码仅本机分区与简单遮挡（哈希存储），并非加密安全
 * 注意：本文件必须最先加载（早于一切读取 localStorage 的脚本）
 * ============================================================ */
"use strict";

(() => {
  const DIR = "data/";
  const CUR = DIR + "current";
  const ACCOUNTS = DIR + "accounts";
  const SAVED = "__savedAt";
  const KEYS = [
    "nav_timers", "nav_timer_style", "nav_timer_cat", "nav_timer_compact", "nav_timer_order",
    "nav_timer_size", "nav_timer_cat_order", "nav_remind", "nav_remind_done",
    "nav_records", "nav_mood", "nav_diary", "nav_holiday_off",
    "nav_custom_sites", "nav_hidden_sites", "nav_site_moves", "nav_cat_renames",
    "nav_removed_cats", "nav_cat_order", "nav_site_order", "nav_auto_done"
  ];
  window.NAV_ACCOUNT_KEYS = KEYS;   // 供 data-sync.js 使用
  const hash = (s) => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  };
  const getUser = () => {
    let u = localStorage.getItem(CUR) || "";
    if (/^".*"$/s.test(u)) { try { u = JSON.parse(u); } catch { /* 保留原值 */ } }
    return typeof u === "string" ? u : "";
  };
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
  /* 某账号文件夹里的账号数据（只取 KEYS，滤掉 __savedAt 等标记） */
  const bundleOf = (u) => {
    const p = folderPrefix(u), b = {};
    for (const k of KEYS) {
      const v = localStorage.getItem(p + k);
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
  const disk = () => (window.NAV_DISK && window.NAV_DISK.enabled ? window.NAV_DISK : null);

  /* 当前身份数据写回其文件夹 */
  function stash() { writeFolder(getUser(), snapshotStd()); }

  /* 目标文件夹还原到标准键（只搬 KEYS，__savedAt 等标记留在文件夹里） */
  function restore(u) {
    clearStd();
    const b = readFolder(u);
    for (const k of KEYS) {
      if (k in b) localStorage.setItem(k, b[k]);
    }
  }

  /* 登录/切换/登出：先安置当前身份（含推盘），再写磁盘身份，最后本地载入刷新。
     全程异步但都在点击处理里完成，刷新后直接就是目标身份的完整数据。
     v2.1：动手前等磁盘状态就绪——服务器没连上就明确报错中止，
     绝不在状态未知时切身份（那会造成"登录了却没数据"）；目标账号
     磁盘上有数据就以磁盘为准，磁盘没有才用默认基线建号 */
  async function switchTo(name) {
    const old = getUser();
    const std = snapshotStd();
    if (old) writeFolder(old, std);
    else writeFolder("default", std);            // 默认身份的数据留本浏览器
    /* 服务器在线时必须等状态就绪再动身份；file:// 离线则按本地缓存走 */
    let d = null;
    const nd = window.NAV_DISK;
    if (nd && !nd.offline) {
      if (nd.status !== "on") await nd.waitReady(6000);   // 最多等启动 6 秒
      if (nd.status !== "on") {
        alert("数据服务器还没连上（" + (nd.errs[nd.errs.length - 1] || "连接中") + "）。\n" +
              "现在切换身份会丢同步，请稍等几秒再操作。");
        return;
      }
      d = nd;
    }
    if (d) {
      try {
        d.bumpEpoch();                           // 让其他标签页的待推送立即失效
        if (old) await d.pushUser(old, std);     // 旧账号的数据包先落盘
        await d.auth({ accounts: accounts(), current: name });
        if (name) {
          const st = await d.getState();         // 目标账号以磁盘上的最新为准
          const p = folderPrefix(name);
          const localSaved = Number(localStorage.getItem(p + SAVED) || 0);
          const diskData = st && st.user && st.user.data &&
            Object.keys(st.user.data).length ? st.user.data : null;
          const diskSaved = st && st.user ? (st.user.savedAt || 0) : 0;
          if (diskData && (diskSaved > localSaved || !folderKeys(name).length)) {
            writeFolder(name, diskData);         // 磁盘较新/本地无缓存：磁盘为准
            localStorage.setItem(p + SAVED, String(diskSaved));
          } else if (!folderKeys(name).length) {
            writeFolder(name, readFolder("default"));  // 磁盘没有该账号：内容与默认一致
          }
        }
      } catch (e) {
        alert("数据服务器暂时不可用（" + String(e && e.message || e) + "），本次切换未完成。\n" +
              "刷新页面后再试；你的数据都在磁盘上，不会丢。");
        return;
      }
    }
    if (name && !folderKeys(name).length) {
      writeFolder(name, readFolder("default"));  // 离线兜底：新建与默认一致
    }
    localStorage.setItem(CUR, name);
    restore(name);
    if (d) {
      d.markSuppress();
      try { if (name) await d.pushUser(name, bundleOf(name)); } catch { /* 忽略 */ }
    }
    location.reload();
  }

  /* 默认身份的浏览器基线缺失时补建：已登录其他身份时基线为空，未登录时快照当前 */
  function ensureDefaultFolder() {
    if (folderKeys("default").length) return;
    writeFolder("default", getUser() ? {} : snapshotStd());
  }
  ensureDefaultFolder();

  /* 暴露当前身份：万年历/日记附件按账号前缀隔离（IndexedDB） */
  window.NAV_USER = getUser();
  window.NAV_USER_PREFIX = window.NAV_USER ? `u:${window.NAV_USER}:` : "";

  /* ---------- 登录界面 ---------- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  /* ---------- 数据文件夹可视化与管理 ---------- */
  /* 当前用户读实时标准键（修改即时可见），其他用户读文件夹存档 */
  const dataOf = (u) => (u === getUser() ? snapshotStd() : bundleOf(u));
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
          const n = KEYS.filter((k) => k in obj).length;
          if (impTarget) {
            const d = disk();
            if (d) await d.pushUser(impTarget, bundleOf(impTarget));   // 立即落盘
          }
          if (getUser() === impTarget) restore(impTarget);   // 导入给自己：立即生效
          alert(`已导入到「${impTarget || "默认身份"}」：${n} 项数据` +
            (impTarget
              ? (getUser() === impTarget ? "，已生效。" : "，登录该账号后生效。")
              : "（默认身份只保存在本浏览器）"));
          location.reload();
        } catch (e) {
          alert("导入失败：" + String(e && e.message || e));
        }
      };
    }
    impTarget = u;
    impInput.click();
  }

  /* 数据位置行：显示当前磁盘目录；连接失败/离线（file://）时给出提示 */
  function renderStorage() {
    const d = window.NAV_DISK;
    let ops;
    if (!d || d.status === "connecting") {
      ops = `<span class="acc-path">正在连接服务器…</span>`;
    } else if (d.status === "error") {
      const why = esc(d.errs[d.errs.length - 1] || "原因未知");
      ops = `<span class="acc-path" title="${esc(d.errs.join("；"))}">⚠ 数据服务器连接失败（${why}），改动不会保存到磁盘</span>` +
        `<button type="button" class="acc-dir" data-act="retry" title="重新连接数据服务器">重试</button>`;
    } else if (d.offline || !d.enabled) {
      ops = `<span class="acc-path" title="当前是双击 index.html 的离线方式，数据只存本浏览器。用「启动星历.bat」打开即可同步到磁盘">浏览器缓存（离线模式，未同步磁盘）</span>`;
    } else {
      ops = `<span class="acc-path" title="${esc(d.dataDir)}">${esc(d.dataDir)}</span>` +
        `<button type="button" class="acc-dir" data-act="dir" title="把账号数据保存到其他文件夹（自动迁移现有数据；留空恢复默认）">修改</button>`;
    }
    return `<div class="acc-folder"><div class="acc-folder-head"><b>💾 数据位置</b><span class="acc-ops">${ops}</span></div></div>`;
  }

  function renderManage() {
    const box = document.getElementById("accManage");
    if (!box) return;
    const cur = getUser();
    const acc = accounts();
    const rows = [{ u: "", label: "默认身份（数据只存本浏览器）", canClear: false, canRm: false }];
    for (const n of Object.keys(acc)) rows.push({ u: n, label: `data/${n}.json`, canClear: true, canRm: true });
    box.innerHTML = renderStorage() + rows.map((r) => {
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
      if (b.dataset.act === "retry") b.onclick = () => location.reload();
      if (b.dataset.act === "dir") b.onclick = async () => {
        const p = prompt(
          "输入新的数据文件夹完整路径（账号数据将保存到那里）。\n留空并确定 = 恢复默认（应用目录下的 data）",
          (window.NAV_DISK && window.NAV_DISK.dataDir) || "");
        if (p === null) return;
        try {
          const r = await window.NAV_DISK.setDir(p.trim());
          alert(`数据位置已${p.trim() ? "切换" : "恢复默认"}：\n${r.dataDir}` +
            (r.copied ? `\n已迁移 ${r.copied} 个数据文件（原目录保留作备份）` : ""));
          renderManage();
        } catch (e) {
          alert("修改失败：" + String(e && e.message || e));
        }
      };
      if (b.dataset.act === "clear") b.onclick = async () => {
        if (!confirm(`清空「${u || "默认"}」的数据？将全部清零（账号保留，重建与默认一致）。`)) return;
        deleteFolder(u);
        if (u === getUser()) clearStd();
        const d = disk();
        if (d && u) { try { await d.pushUser(u, {}); } catch { /* 忽略 */ } }
        location.reload();
      };
      if (b.dataset.act === "rm") b.onclick = async () => {
        if (!confirm(`删除账号「${u}」？\n\n该账号、密码和全部数据（磁盘 ${u}.json）都会被删除，无法恢复。`)) return;
        deleteFolder(u);
        const acc2 = accounts();
        delete acc2[u];
        localStorage.setItem(ACCOUNTS, JSON.stringify(acc2));
        if (u === getUser()) { clearStd(); localStorage.setItem(CUR, ""); }
        const d = disk();
        if (d) {
          try {
            d.bumpEpoch();   // 身份可能随之变化：让其他标签页立即重新对齐
            await d.auth({ accounts: acc2, current: getUser(), remove: [u] });
          }
          catch { /* 忽略：下次登录时会再对齐 */ }
        }
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
    /* 用户名下拉候选：已有账号（仍可自由输入新用户名） */
    const dl = mask.querySelector("#accUserList");
    if (dl) dl.innerHTML = names.map((n) => `<option value="${esc(n)}"></option>`).join("");
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
    /* 用户名规则与 server.py 白名单（^\w+$）对齐：仅中英文、数字、下划线。
       保留名会覆盖 data/ 顶层键，一并禁止。 */
    if (!/^[\p{L}\p{N}_]+$/u.test(name)) {
      alert("用户名只能包含中文、英文、数字、下划线"); return;
    }
    if (["default", "accounts", "current", "deleted"].includes(name)) {
      alert(`「${name}」是系统保留名，请换一个用户名`); return;
    }
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
    /* 同步连接状态上按钮：失败亮 ⚠（startup 异步，最多轮询到它出结果） */
    const updBtn = () => {
      const d = window.NAV_DISK;
      if (d && d.status === "error") {
        btn.textContent = "⚠ 同步失败";
        btn.title = "数据服务器连接失败：改动不会保存到磁盘。点击查看详情";
      } else {
        btn.title = "";
      }
    };
    updBtn();
    const poll = setInterval(() => {
      const st = window.NAV_DISK && window.NAV_DISK.status;
      if (st !== "connecting") { clearInterval(poll); sync(); updBtn(); }
    }, 500);
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
