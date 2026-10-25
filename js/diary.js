/* ============================================================
 * 每日日记/备注 + 「附件·日记·心情」勾选导出导入
 * 存储：nav_diary = { "y-m-d": "文本" }（列入 account.js KEYS，随账号走）
 * 附件（IndexedDB）与心情（nav_mood）由 calendar.js 提供：
 *   AttachDB 全局可访问（跨经典脚本共享顶层 const）
 * 导出文件为纯日期键（不带账号前缀），可导入到任意账号名下
 * ============================================================ */
"use strict";

window.Diary = (() => {
  const KEY = "nav_diary";
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
  const escAttr = esc;

  /* ---------- 存储 ---------- */
  const map = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
  };
  const saveMap = (m) => { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* 满：忽略 */ } };
  const moodMap = () => {
    try { return JSON.parse(localStorage.getItem("nav_mood") || "{}"); } catch { return {}; }
  };
  const text = (dateKey) => String(map()[dateKey] || "");

  /* ---------- 日记编辑弹窗（动态创建，一个就够） ---------- */
  let mask = null;
  function ensureMask() {
    if (mask) return mask;
    mask = document.createElement("div");
    mask.className = "modal-mask";
    mask.id = "diaryMask";
    mask.hidden = true;
    mask.innerHTML =
      `<div class="modal diary-modal">` +
      `<div class="diary-head"><b id="diaryTitle">📝 日记/备注</b>` +
      `<button type="button" class="lb-x" title="关闭">✕</button></div>` +
      `<textarea id="diaryText" placeholder="这一天想记点什么…（每人每天一条，随时可改）"></textarea>` +
      `<div class="diary-foot">` +
      `<span class="diary-hint">保存在本机浏览器，随当前账号走</span>` +
      `<button type="button" class="btn" data-act="clear">清空本天</button>` +
      `<button type="button" class="btn primary" data-act="save">保存</button>` +
      `</div></div>`;
    document.body.appendChild(mask);
    mask.addEventListener("click", (e) => { if (e.target === mask) mask.hidden = true; });
    mask.querySelector(".lb-x").onclick = () => { mask.hidden = true; };
    mask.querySelector('[data-act="save"]').onclick = () => {
      const k = mask.dataset.key;
      const m = map();
      const v = mask.querySelector("#diaryText").value;
      if (v.trim()) m[k] = v; else delete m[k];
      saveMap(m);
      mask.hidden = true;
      if (typeof calRender === "function") calRender();
    };
    mask.querySelector('[data-act="clear"]').onclick = () => {
      const m = map();
      delete m[mask.dataset.key];
      saveMap(m);
      mask.querySelector("#diaryText").value = "";
      if (typeof calRender === "function") calRender();
    };
    return mask;
  }
  function open(dateKey, label) {
    const m = ensureMask();
    m.dataset.key = dateKey;
    m.querySelector("#diaryTitle").textContent = `📝 ${label} · 日记/备注`;
    m.querySelector("#diaryText").value = text(dateKey);
    m.hidden = false;
    m.querySelector("#diaryText").focus();
  }

  /* ---------- 数据收集 / 应用（导出导入共用） ---------- */
  async function collectDays() {
    const days = {};
    for (const [k, v] of Object.entries(map())) {
      if (v && String(v).trim()) (days[k] = days[k] || {}).diary = String(v);
    }
    for (const [k, v] of Object.entries(moodMap())) {
      if (v) (days[k] = days[k] || {}).mood = String(v);
    }
    try {
      const prefix = window.NAV_USER_PREFIX || "";
      for (const rec of await AttachDB.entries(prefix)) {
        if (rec && Array.isArray(rec.urls) && rec.urls.length) {
          const k = rec.key.slice(prefix.length);
          days[k] = days[k] || {};
          days[k].attach = rec.urls;
        }
      }
    } catch (e) { /* IndexedDB 不可用：只导日记与心情 */ }
    return days;
  }
  async function applyPack(days) {
    const dm = map(), mm = moodMap();
    let diaries = 0, moods = 0, imgs = 0;
    for (const [k, v] of Object.entries(days || {})) {
      if (!v || typeof v !== "object") continue;
      if (typeof v.diary === "string" && v.diary.trim()) { dm[k] = v.diary; diaries++; }
      if (typeof v.mood === "string" && v.mood) { mm[k] = v.mood; moods++; }
      if (Array.isArray(v.attach) && v.attach.length) {
        try {
          const pk = (window.NAV_USER_PREFIX || "") + k;
          const old = await AttachDB.get(pk);
          const fresh = v.attach.filter((u) => typeof u === "string" && !old.includes(u));
          if (fresh.length) { await AttachDB.set(pk, old.concat(fresh)); imgs += fresh.length; }
        } catch (e) { /* 附件库不可用：跳过图片 */ }
      }
    }
    saveMap(dm);
    try { localStorage.setItem("nav_mood", JSON.stringify(mm)); } catch { /* 忽略 */ }
    return { diaries, moods, imgs };
  }

  /* ---------- 导出/导入面板 ---------- */
  let pkMask = null, pkMode = "local", pkDays = {}, fileInput = null;
  function ensurePack() {
    if (pkMask) return pkMask;
    pkMask = document.createElement("div");
    pkMask.className = "modal-mask";
    pkMask.id = "packMask";
    pkMask.hidden = true;
    pkMask.innerHTML =
      `<div class="modal pack-modal">` +
      `<div class="diary-head"><b id="packTitle">📦 附件 · 日记 · 心情</b>` +
      `<button type="button" class="lb-x" title="关闭">✕</button></div>` +
      `<div class="pack-bar">` +
      `<button type="button" class="btn sm" data-act="all">全选</button>` +
      `<button type="button" class="btn sm" data-act="none">全不选</button>` +
      `<button type="button" class="btn sm primary" data-act="export">⬇ 导出选中</button>` +
      `<button type="button" class="btn sm" data-act="import">📂 从文件导入</button>` +
      `</div>` +
      `<div class="pack-bar pack-range">` +
      `<span class="ff-dash">范围</span>` +
      `<input type="date" id="pkFrom" title="只列这个日期之后的（含）">` +
      `<span class="ff-dash">~</span>` +
      `<input type="date" id="pkTo" title="只列这个日期之前的（含）">` +
      `<button type="button" class="btn sm" data-act="filter">筛选</button>` +
      `</div>` +
      `<div class="pack-bar pack-types">` +
      `<span class="ff-dash">导出内容</span>` +
      `<label class="pack-type"><input type="checkbox" id="pkT_attach" checked>📷 图片</label>` +
      `<label class="pack-type"><input type="checkbox" id="pkT_diary" checked>📝 日记</label>` +
      `<label class="pack-type"><input type="checkbox" id="pkT_mood" checked>🌤️ 心情</label>` +
      `</div>` +
      `<div class="pack-note" id="packNote"></div>` +
      `<div class="pack-list" id="packList"></div>` +
      `</div>`;
    document.body.appendChild(pkMask);
    pkMask.addEventListener("click", (e) => { if (e.target === pkMask) pkMask.hidden = true; });
    pkMask.querySelector(".lb-x").onclick = () => { pkMask.hidden = true; };
    pkMask.querySelector('[data-act="all"]').onclick = () =>
      pkMask.querySelectorAll(".pack-row input").forEach((c) => { c.checked = true; });
    pkMask.querySelector('[data-act="none"]').onclick = () =>
      pkMask.querySelectorAll(".pack-row input").forEach((c) => { c.checked = false; });
    pkMask.querySelector('[data-act="filter"]').onclick = () => {
      const f = pkMask.querySelector("#pkFrom").value, t = pkMask.querySelector("#pkTo").value;
      if (f && t && f > t) { alert("开始日期不能晚于结束日期"); return; }
      renderList();
    };
    pkMask.querySelector('[data-act="export"]').onclick = doExport;
    pkMask.querySelector('[data-act="import"]').onclick = pickFile;
    return pkMask;
  }

  function fmtDate(k) {
    const [y, m, d] = k.split("-");
    return y && m && d ? `${y}年${+m}月${+d}日` : k;
  }
  function rowBadges(v) {
    const parts = [];
    if (Array.isArray(v.attach) && v.attach.length) parts.push(`📷 ${v.attach.length}张`);
    if (v.diary) parts.push(`📝 ${String(v.diary).replace(/\s+/g, " ").slice(0, 18)}`);
    if (v.mood) parts.push(`心情 ${v.mood}`);
    return parts.join(" · ");
  }
  /* 存储键的日期不补零（2026-1-5），<input type=date> 的值补零（2026-01-05）：
     比较/排序前统一补零，否则 1–9 月会因字符串比较被错误排除在范围外 */
  const normKey = (k) => {
    const [y, m, d] = k.split("-");
    return `${y}-${(m || "").padStart(2, "0")}-${(d || "").padStart(2, "0")}`;
  };
  function renderList() {
    const list = pkMask.querySelector("#packList");
    /* 时间范围筛选（v67）：只在范围内列出，便于批量勾选导出 */
    const from = pkMask.querySelector("#pkFrom").value;
    const to = pkMask.querySelector("#pkTo").value;
    const keys = Object.keys(pkDays).filter((k) => pkDays[k] && Object.keys(pkDays[k]).length)
      .filter((k) => {
        const nk = normKey(k);
        return (!from || nk >= from) && (!to || nk <= to);
      })
      .sort((a, b) => (normKey(a) < normKey(b) ? 1 : -1));
    if (!keys.length) {
      list.innerHTML = `<div class="pack-empty">${
        pkMode === "local" ? "还没有任何一天有附件/日记/心情" : "文件里没有可导入的数据"}</div>`;
      return;
    }
    list.innerHTML = keys.map((k) =>
      `<label class="pack-row"><input type="checkbox" data-k="${escAttr(k)}" checked>` +
      `<span class="pack-date">${esc(fmtDate(k))}</span>` +
      `<span class="pack-badges">${esc(rowBadges(pkDays[k]))}</span></label>`
    ).join("");
  }
  function selectedDays() {
    const out = {};
    pkMask.querySelectorAll(".pack-row input:checked").forEach((c) => {
      const k = c.dataset.k;
      if (pkDays[k]) out[k] = pkDays[k];
    });
    return out;
  }

  async function openPack() {
    const m = ensurePack();
    m.hidden = false;
    pkMode = "local";
    m.querySelector("#packTitle").textContent = "📦 附件 · 日记 · 心情（本机）";
    m.querySelector("#packNote").textContent = "勾选要导出的天，导出为 JSON 文件（图片已包含在内，文件可能较大）";
    m.querySelector('[data-act="export"]').hidden = false;
    pkDays = await collectDays();
    renderList();
  }

  /* 按面板里勾选的内容类型过滤每天的数据（只导勾选的部分） */
  function filterByTypes(days) {
    const on = {
      attach: !pkMask || pkMask.querySelector("#pkT_attach").checked,
      diary: !pkMask || pkMask.querySelector("#pkT_diary").checked,
      mood: !pkMask || pkMask.querySelector("#pkT_mood").checked
    };
    const out = {};
    for (const [k, v] of Object.entries(days)) {
      const f = {};
      for (const t of ["attach", "diary", "mood"]) {
        if (on[t] && v[t] !== undefined) f[t] = v[t];
      }
      if (Object.keys(f).length) out[k] = f;
    }
    return out;
  }
  function doExport() {
    const sel = filterByTypes(selectedDays());
    if (!Object.keys(sel).length) { alert("还没有勾选任何一天或内容类型"); return; }
    const payload = {
      app: "xingli-pack", ver: 1,
      exported_at: new Date().toISOString(),
      days: sel
    };
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const t = new Date();
    const p = (n) => String(n).padStart(2, "0");
    a.download = `星历_附件日记心情_${t.getFullYear()}${p(t.getMonth() + 1)}${p(t.getDate())}_${p(t.getHours())}${p(t.getMinutes())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function pickFile() {
    if (!fileInput) {
      fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".json,application/json";
      fileInput.style.display = "none";
      document.body.appendChild(fileInput);
      fileInput.onchange = async () => {
        const f = fileInput.files[0];
        fileInput.value = "";
        if (!f) return;
        let obj = null;
        try { obj = JSON.parse(await f.text()); } catch (e) { alert("文件不是合法 JSON：" + (e && e.message)); return; }
        const days = obj && typeof obj === "object" && obj.days && typeof obj.days === "object"
          ? obj.days : null;
        if (!days) { alert("这不是星历导出的附件/日记/心情文件"); return; }
        pkMode = "file";
        pkDays = days;
        pkMask.querySelector("#packTitle").textContent = `📦 从「${f.name}」导入`;
        pkMask.querySelector("#packNote").textContent =
          "勾选要导入的天：日记/心情覆盖所选天，图片追加（内容相同自动跳过）；导入到当前账号名下";
        const btn = pkMask.querySelector('[data-act="export"]');
        btn.textContent = "⬆ 导入选中";
        btn.onclick = doImport;
        renderList();
      };
    }
    fileInput.click();
  }

  async function doImport() {
    const sel = selectedDays();
    if (!Object.keys(sel).length) { alert("还没有勾选任何一天"); return; }
    if (!confirm(`将导入 ${Object.keys(sel).length} 天的数据（日记/心情覆盖，图片追加）到当前账号，继续？`)) return;
    const r = await applyPack(sel);
    alert(`导入完成：日记 ${r.diaries} 天 · 心情 ${r.moods} 天 · 新增图片 ${r.imgs} 张（重复已跳过）`);
    /* 恢复面板为本机数据视图 */
    const btn = pkMask.querySelector('[data-act="export"]');
    btn.textContent = "⬇ 导出选中";
    btn.onclick = doExport;
    if (typeof calRender === "function") calRender();
    await openPack();
  }

  /* （当天内容导出功能随 v67 移除入口按钮，死链已于清理批次删除） */

  return { map, text, open, openPack, collectDays, applyPack };
})();

document.addEventListener("DOMContentLoaded", () => {
  /* v67：弹窗尺寸记忆已移除，顺手清掉旧记录 */
  try { localStorage.removeItem("nav_modal_sizes"); } catch { /* 忽略 */ }
  const btn = document.getElementById("packBtn");
  if (btn) btn.onclick = () => window.Diary.openPack();
});
