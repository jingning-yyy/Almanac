/* ============================================================
 * 星历 Almanac · 逻辑
 * ============================================================ */
"use strict";

/* ---------- 搜索引擎 ---------- */
const ENGINES = {
  baidu:  { name: "百度",   url: "https://www.baidu.com/s?wd=" },
  bing:   { name: "必应",   url: "https://www.bing.com/search?q=" },
  google: { name: "Google", url: "https://www.google.com/search?q=" },
  sogou:  { name: "搜狗",   url: "https://www.sogou.com/web?query=" },
  so360:  { name: "360",    url: "https://www.so.com/s?q=" }
};

const LS = {
  custom: "nav_custom_sites",
  theme: "nav_theme",
  engine: "nav_engine",
  hidden: "nav_hidden_sites",     // 已删除的内置/导入网址（url 数组，可恢复）
  moves: "nav_site_moves",        // 拖动换分类记录 { url: 目标分类名 }
  catRenames: "nav_cat_renames",  // 分类重命名记录 { 旧名: 新名 }
  removedCats: "nav_removed_cats",// 已清除的空分组名单
  order: "nav_cat_order",         // 分类显示顺序
  siteOrder: "nav_site_order",    // 网址显示顺序
  sidebarMini: "nav_sidebar_mini",// 侧栏缩略图模式
  iconMode: "nav_icon_mode",     // 网址小图标（方块）模式
  zen: "nav_zen"                  // 专注模式（点击问候语隐藏下方内容）
};

const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* 忽略 */ }
  }
};

let activeCategory = "all";
let keyword = "";
let regionFilter = "all";   // all | cn | global
let sidebarMini = store.get(LS.sidebarMini, false); // 侧栏缩略图模式
let iconMode = store.get(LS.iconMode, false);       // 网址小图标（方块）模式
let zenMode = store.get(LS.zen, false);             // 专注模式（隐藏下方内容）
let dragCat = null;         // 正在拖动的分类名
let dropBefore = true;      // 分类拖动插入位置：目标之前/之后
let currentEngine = store.get(LS.engine, "baidu");
if (!ENGINES[currentEngine]) currentEngine = "baidu";

function applySidebarMode() {
  document.querySelector(".layout")?.classList.toggle("mini", sidebarMini);
}

/* 小图标模式：网址卡片变成图标+名称的小方块网格（外网右侧 🔲 按钮切换） */
function applyIconMode() {
  document.body.classList.toggle("icon-mode", iconMode);
}
applyIconMode();

/* 专注模式：点击问候语隐藏/恢复搜索区与网址列表。
   脚本在 body 末尾执行，立刻上类避免刷新时内容闪现 */
function applyZen() {
  document.body.classList.toggle("zen", zenMode);
}
applyZen();

/* ---------- 小工具 ---------- */
const $ = (sel) => document.querySelector(sel);

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function normalizeUrl(url) {
  url = String(url).trim();
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : "https://" + url;
}

const GRADS = [
  ["#5b8cff", "#7c5bff"], ["#00b8a9", "#00d68f"], ["#ff7e5f", "#feb47b"],
  ["#f857a6", "#ff5858"], ["#36d1dc", "#5b86e5"], ["#a18cd1", "#fbc2eb"],
  ["#11998e", "#38ef7d"], ["#ee9ca7", "#ffdde1"], ["#2193b0", "#6dd5ed"],
  ["#fc4a1a", "#f7b733"], ["#8e2de2", "#4a00e0"], ["#0f9b8e", "#396afc"]
];

function gradFor(name) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return GRADS[h % GRADS.length];
}

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "夜深了";
  if (h < 11) return "早上好";
  if (h < 14) return "中午好";
  if (h < 18) return "下午好";
  return "晚上好";
}

/* ---------- 网址目录：内置分类基线 + 自定义 ---------- */
function allCategories() {
  /* 目录统一：默认身份与账号都用内置分类做基线，
     个人网址存在各账号自己的 nav_custom_sites 里（按账号显示） */
  const cats = NAV_DATA.map((c) => ({ name: c.name, icon: c.icon || "🔗", sites: [...c.sites] }));
  /* 1) 分类重命名：先于移动归位应用，保持原位置与图标（新名与已有分类相同视为并入） */
  const renames = store.get(LS.catRenames, {});
  for (const cat of [...cats]) {
    let n = cat.name, guard = 0;
    while (renames[n] && guard++ < 5) n = renames[n];
    if (n === cat.name) continue;
    const host = cats.find((c) => c.name === n && c !== cat);
    if (host) {
      host.sites.push(...cat.sites);
      cat.name = n + "\u0000";        /* 标记待移除 */
    } else {
      cat.name = n;
    }
  }
  for (let i = cats.length - 1; i >= 0; i--) {
    if (cats[i].name.endsWith("\u0000")) cats.splice(i, 1);
  }
  /* 2) 自定义网址（catIcon：导入数据带来的分组图标，仅建新分类时生效） */
  for (const s of store.get(LS.custom, [])) {
    let cat = cats.find((c) => c.name === s.category);
    if (!cat) {
      cat = { name: s.category, icon: s.catIcon || "📌", sites: [] };
      cats.push(cat);
    }
    const { catIcon, ...site } = s;
    cat.sites.push({ ...site, custom: true });
  }
  /* 3) 应用删除过滤与拖动换分类 */
  const hidden = new Set(store.get(LS.hidden, []));
  const movesRaw = store.get(LS.moves, {});
  const moves = {};
  for (const [k, v] of Object.entries(movesRaw)) {
    let n = v, guard = 0;
    while (renames[n] && guard++ < 5) n = renames[n];
    moves[k] = n;
  }
  const movedSites = {};
  for (const cat of cats) {
    cat.sites = cat.sites.filter((s) => {
      if (hidden.has(s.url)) return false;
      const t = moves[s.url];
      if (t && t !== cat.name) { movedSites[s.url] = s; return false; }
      return true;
    });
  }
  for (const [url, s] of Object.entries(movedSites)) {
    const target = moves[url];
    let cat = cats.find((c) => c.name === target);
    if (!cat) {
      cat = { name: target, icon: "📌", sites: [] };
      cats.push(cat);
    }
    cat.sites.push(s);
  }
  /* 5) 应用分类排序与网址排序 */
  const catOrder = store.get(LS.order, []);
  if (catOrder.length) {
    const ci = new Map(catOrder.map((n, i) => [n, i]));
    cats.sort((a, b) => (ci.has(a.name) ? ci.get(a.name) : 1e9) - (ci.has(b.name) ? ci.get(b.name) : 1e9));
  }
  const so = store.get(LS.siteOrder, []);
  if (so.length) {
    const si = new Map(so.map((u, i) => [u, i]));
    for (const cat of cats) {
      cat.sites.sort((a, b) => (si.has(a.url) ? si.get(a.url) : 1e9) - (si.has(b.url) ? si.get(b.url) : 1e9));
    }
  }
  /* 6) 过滤已被清除的空分组（重新有内容的分组会自动恢复显示） */
  const removedCats = store.get(LS.removedCats, []);
  const result = cats.filter((c) => !(c.sites.length === 0 && removedCats.includes(c.name)));
  return result.length ? result : cats;
}

/* 把拖动载荷里的 url 解析为站点真实 url（容忍结尾斜杠差异） */
function resolveDraggedUrl(raw) {
  if (!raw) return null;
  const norm = raw.replace(/\/+$/, "").toLowerCase();
  for (const c of allCategories()) {
    for (const s of c.sites) {
      if (s.url === raw || s.url.replace(/\/+$/, "").toLowerCase() === norm) return s.url;
    }
  }
  return null;
}

/* 滚动联动：全部视图下，滑到哪个分类区块就高亮哪个 */
function updateSpy() {
  const items = [...document.querySelectorAll("#sidebar .side-item[data-cat]")];
  if (activeCategory !== "all" || keyword) {
    items.forEach((i) => i.classList.remove("spy"));
    return;
  }
  const secs = [...document.querySelectorAll(".section[data-cat]")];
  if (!secs.length) return;
  let current = secs[0].dataset.cat;
  for (const s of secs) {
    if (s.getBoundingClientRect().top <= 120) current = s.dataset.cat;
  }
  items.forEach((i) => i.classList.toggle("spy", i.dataset.cat === current));
}

/* 拖动分类排序：把 dragName 移动到 targetName 前/后 */
function reorderCategory(dragName, targetName, before) {
  if (!dragName || !targetName || dragName === targetName) return;
  const orderArr = store.get(LS.order, []);
  const inOrder = new Set(orderArr);
  for (const c of allCategories()) if (!inOrder.has(c.name)) orderArr.push(c.name);
  const i = orderArr.indexOf(dragName);
  if (i >= 0) orderArr.splice(i, 1);
  const j = orderArr.indexOf(targetName);
  orderArr.splice(j >= 0 ? (before ? j : j + 1) : orderArr.length, 0, dragName);
  store.set(LS.order, orderArr);
  renderAll();
}

/* 拖动网址排序：把 url 移到 beforeUrl 之前 */
function reorderSite(url, beforeUrl, catSites) {
  if (!url || !beforeUrl || url === beforeUrl) return;
  const so = store.get(LS.siteOrder, []);
  const inOrder = new Set(so);
  for (const s of catSites) if (!inOrder.has(s.url)) so.push(s.url);
  const i = so.indexOf(url);
  if (i >= 0) so.splice(i, 1);
  const j = so.indexOf(beforeUrl);
  if (j >= 0) so.splice(j, 0, url); else so.push(url);
  store.set(LS.siteOrder, so);
  renderAll();
}

/* 分类重命名：同步更新移动记录、自定义网址归属与合并链 */
function renameCategory(oldName, newName) {
  newName = (newName || "").trim();
  if (!newName || newName === oldName) return;
  const cats = allCategories();
  if (cats.some((c) => c.name === newName)) {
    if (!confirm(`分类「${newName}」已存在，确定把「${oldName}」的全部网址并入吗？`)) return;
  }
  const renames = store.get(LS.catRenames, {});
  for (const k of Object.keys(renames)) {
    if (renames[k] === oldName) renames[k] = newName;
  }
  renames[oldName] = newName;
  store.set(LS.catRenames, renames);

  const moves = store.get(LS.moves, {});
  for (const k of Object.keys(moves)) {
    if (moves[k] === oldName) moves[k] = newName;
  }
  store.set(LS.moves, moves);

  const orderArr = store.get(LS.order, []);
  for (let i = 0; i < orderArr.length; i++) {
    if (orderArr[i] === oldName) orderArr[i] = newName;
  }
  store.set(LS.order, orderArr);

  const customs = store.get(LS.custom, []);
  for (const s of customs) if (s.category === oldName) s.category = newName;
  store.set(LS.custom, customs);

  const removed = store.get(LS.removedCats, []);
  const idx = removed.indexOf(newName);
  if (idx >= 0) { removed.splice(idx, 1); store.set(LS.removedCats, removed); }

  activeCategory = activeCategory === oldName ? newName : activeCategory;
  renderAll();
}

/* 清除空分组：没有网址的分类从侧栏移除（重新加入网址会恢复） */
function removeEmptyCategories() {
  const empty = allCategories().filter((c) => c.sites.length === 0).map((c) => c.name);
  if (!empty.length) {
    alert("当前没有空分组");
    return;
  }
  if (confirm(`清除 ${empty.length} 个空分组？\n${empty.join("、")}\n\n（之后往该分类重新添加网址会自动恢复）`)) {
    store.set(LS.removedCats, [...new Set([...store.get(LS.removedCats, []), ...empty])]);
    activeCategory = "all";
    renderAll();
  }
}

/* 拖动换分类：自定义网址直接改记录，内置/导入网址记一条移动记录 */
function moveSiteToCategory(url, targetCat) {
  const customs = store.get(LS.custom, []);
  const idx = customs.findIndex((s) => s.url === url);
  if (idx >= 0) {
    if (customs[idx].category === targetCat) return false;
    customs[idx].category = targetCat;
    store.set(LS.custom, customs);
    return true;
  }
  const cur = allCategories().find((c) => c.sites.some((s) => s.url === url));
  if (!cur || cur.name === targetCat) return false;
  const moves = store.get(LS.moves, {});
  moves[url] = targetCat;
  store.set(LS.moves, moves);
  return true;
}

/* 删除：自定义网址彻底移除；内置/导入网址进入可恢复的隐藏列表 */
function deleteSite(url) {
  const customs = store.get(LS.custom, []);
  if (customs.some((s) => s.url === url)) {
    store.set(LS.custom, customs.filter((s) => s.url !== url));
    return;
  }
  const hidden = store.get(LS.hidden, []);
  if (!hidden.includes(url)) hidden.push(url);
  store.set(LS.hidden, hidden);
  const moves = store.get(LS.moves, {});
  if (moves[url]) {
    delete moves[url];
    store.set(LS.moves, moves);
  }
}

function restoreHiddenSites() {
  const hidden = store.get(LS.hidden, []);
  if (!hidden.length) {
    alert("没有可恢复的网址（删除内置/导入网址后会进回收站，可在「添加网址」窗口恢复）");
    return;
  }
  if (confirm(`恢复 ${hidden.length} 个已删除的网址？`)) {
    store.set(LS.hidden, []);
    store.set(LS.removedCats, []);   /* 一并恢复被清除的空分组 */
    renderAll();
  }
}

/* ---------- 渲染 ---------- */
function renderEngines() {
  const box = $("#engines");
  box.innerHTML = "";
  for (const [key, eng] of Object.entries(ENGINES)) {
    const b = el("button", "engine" + (key === currentEngine ? " active" : ""), esc(eng.name));
    b.type = "button";
    b.onclick = () => {
      currentEngine = key;
      store.set(LS.engine, key);
      renderEngines();
    };
    box.appendChild(b);
  }
}

function regionOk(site) {
  if (regionFilter === "all") return true;
  return regionFilter === "global"
    ? site.region === "global"
    : site.region !== "global";
}

function renderSidebar(cats) {
  const bar = $("#sidebar");
  bar.innerHTML = "";
  const inRegion = (c) => c.sites.filter(regionOk).length;
  const total = cats.reduce((n, c) => n + inRegion(c), 0);

  /* 模式切换按钮（与「全部」并列在同一行，稍后组装） */
  const modeBtn = el("button", "side-mode", sidebarMini ? "»" : "☰");
  modeBtn.type = "button";
  modeBtn.title = sidebarMini ? "展开完整侧栏" : "缩略图模式（只显示图标）";
  modeBtn.onclick = () => {
    sidebarMini = !sidebarMini;
    store.set(LS.sidebarMini, sidebarMini);
    applySidebarMode();
    renderAll();
  };

  const mkItem = (name, icon, cnt, label) => {
    const b = el("button", "side-item" + ((keyword ? "all" : activeCategory) === name ? " active" : ""));
    b.type = "button";
    b.dataset.cat = name;
    if (name !== "all") b.title = `${icon} ${label || name}（${cnt}）`;
    b.innerHTML = `<span>${esc(icon)}</span><span class="lbl">${esc(label || name)}</span><span class="cnt">${cnt}</span>` +
      (name === "all" ? "" : '<span class="rename" title="重命名分类">✎</span>');
    b.onclick = () => {
      activeCategory = name;
      keyword = "";
      $("#searchInput").value = "";
      renderAll();
    };
    if (name !== "all") {
      b.querySelector(".rename").onclick = (e) => {
        e.stopPropagation();
        const newName = prompt(`重命名分类「${name}」：\n（若与已有分类同名，网址会全部并入该分类）`, name);
        if (newName !== null) renameCategory(name, newName);
      };
      /* 分类拖动排序 */
      b.draggable = true;
      b.addEventListener("dragstart", (e) => {
        dragCat = name;
        e.dataTransfer.setData("application/x-nav-cat", name);
        e.dataTransfer.setData("text/plain", name);
        e.dataTransfer.effectAllowed = "move";
        b.classList.add("dragging");
      });
      b.addEventListener("dragend", () => {
        dragCat = null;
        b.classList.remove("dragging", "drag-over", "drag-above", "drag-below");
      });
      /* 拖动网址到此改变归属；拖动分类到此调整排序 */
      b.addEventListener("dragover", (e) => {
        const types = [...(e.dataTransfer.types || [])];
        const isCat = types.includes("application/x-nav-cat");
        const isSite = !isCat && types.includes("text/plain");
        if (!isCat && !isSite) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (isCat) {
          const r = b.getBoundingClientRect();
          dropBefore = e.clientY < r.top + r.height / 2;
          b.classList.toggle("drag-above", dropBefore);
          b.classList.toggle("drag-below", !dropBefore);
        } else {
          b.classList.add("drag-over");
        }
      });
      b.addEventListener("dragleave", () => b.classList.remove("drag-over", "drag-above", "drag-below"));
      b.addEventListener("drop", (e) => {
        e.preventDefault();
        b.classList.remove("drag-over", "drag-above", "drag-below");
        const types = [...(e.dataTransfer.types || [])];
        if (types.includes("application/x-nav-cat")) {
          if (dragCat) reorderCategory(dragCat, name, dropBefore);
          dragCat = null;
          return;
        }
        const url = resolveDraggedUrl(e.dataTransfer.getData("text/plain"));
        if (url && moveSiteToCategory(url, name)) renderAll();
      });
    }
    return b;
  };

  /* 第一行：模式切换按钮 + 全部 并列 */
  const head = el("div", "side-head");
  head.appendChild(modeBtn);
  head.appendChild(mkItem("all", "🏠", total, "全部"));
  bar.appendChild(head);
  for (const c of cats) bar.appendChild(mkItem(c.name, c.icon, inRegion(c)));
}

/* 图标源：依次尝试，全部失败则回退字母头像
 * 1. 站点自己的 favicon.ico（最正宗）
 * 2/3. 国内可直连的公共图标缓存服务
 * 4. Google 图标服务（海外场景兜底） */
function faviconSources(domain) {
  return [
    `https://${domain}/favicon.ico`,
    `https://favicon.cccyun.cc/${domain}`,
    `https://api.iowen.cn/favicon/${domain}.png`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
  ];
}

/* 图标加载失败时切换下一个源（由 img 的 onerror 调用） */
window.faviconFail = (img) => {
  const box = img.parentElement;
  const domain = box.dataset.domain;
  const list = faviconSources(domain);
  const step = Number(img.dataset.step || 0) + 1;
  if (step < list.length) {
    img.dataset.step = step;
    img.src = list[step];
  } else {
    img.remove(); /* 保留渐变字母头像 */
  }
};

function avatarHtml(site) {
  const [c1, c2] = gradFor(site.name);
  const letter = [...String(site.name).trim()][0] || "?";
  let domain = "";
  try { domain = new URL(site.url).hostname; } catch { return `<span class="avatar" style="background:linear-gradient(135deg,${c1},${c2})">${esc(letter)}</span>`; }
  return `<span class="avatar" data-domain="${esc(domain)}" style="background:linear-gradient(135deg,${c1},${c2})">` +
    `<span class="letter">${esc(letter)}</span>` +
    `<img alt="" loading="lazy" referrerpolicy="no-referrer" data-step="0"` +
    ` src="${faviconSources(domain)[0]}"` +
    ` onload="this.parentElement.classList.add('has-icon')" onerror="faviconFail(this)"></span>`;
}

function buildCard(site) {
  const a = el("a", "card");
  a.href = site.url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.draggable = true;
  a.title = iconMode
    ? `${site.name}\n${site.desc || site.url}`
    : "拖动到左侧分类可更改归属 · 拖到其他卡片上可调整排序";
  a.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", site.url);
    e.dataTransfer.effectAllowed = "move";
    a.classList.add("dragging");
  });
  a.addEventListener("dragend", () => a.classList.remove("dragging"));
  /* 拖到其他卡片上：调整排序（跨分类时跟随目标分类） */
  a.addEventListener("dragover", (e) => {
    const types = [...(e.dataTransfer.types || [])];
    if (types.includes("application/x-nav-cat")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    a.classList.add("drag-over");
  });
  a.addEventListener("dragleave", () => a.classList.remove("drag-over"));
  a.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    a.classList.remove("drag-over");
    const url = resolveDraggedUrl(e.dataTransfer.getData("text/plain"));
    if (!url || url === site.url) return;
    const cat = allCategories().find((c) => c.sites.some((s) => s.url === site.url));
    if (!cat) return;
    moveSiteToCategory(url, cat.name);
    reorderSite(url, site.url, cat.sites);
  });
  a.innerHTML =
    avatarHtml(site) +
    `<span class="info">
       <span class="name">${esc(site.name)}${site.region === "global" ? '<span class="tag global">🌐 外网</span>' : ""}${site.custom ? '<span class="tag">自定义</span>' : ""}</span>
       <span class="desc">${esc(site.desc || site.url)}</span>
     </span>`;
  const del = el("button", "del", "✕");
  del.type = "button";
  del.title = site.custom ? "删除该网址" : "从导航中移除（可恢复）";
  del.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`删除「${site.name}」吗？${site.custom ? "" : "\n内置网址会进回收站，可在「添加网址」窗口恢复。"}`)) {
      deleteSite(site.url);
      renderAll();
    }
  };
  a.appendChild(del);
  return a;
}

function renderMain(cats) {
  const main = $("#main");
  main.innerHTML = "";
  const searching = keyword.length > 0;
  const kw = keyword.toLowerCase();
  const hit = (site) =>
    regionOk(site) &&
    (!kw || (site.name + " " + (site.desc || "") + " " + site.url).toLowerCase().includes(kw));

  const visible = [];
  let total = 0;

  for (const cat of cats) {
    if (!searching && activeCategory !== "all" && cat.name !== activeCategory) continue;
    const sites = cat.sites.filter(hit);
    if (!sites.length) continue;
    visible.push([cat, sites]);
    total += sites.length;
  }

  if (searching) {
    const bar = el("div", "result-bar",
      `搜索 “<b>${esc(keyword)}</b>” ：在 <b>${total}</b> 个网址中找到匹配结果`);
    const clear = el("button", "btn", "清除搜索");
    clear.type = "button";
    clear.onclick = () => {
      keyword = "";
      $("#searchInput").value = "";
      renderAll();
    };
    bar.appendChild(clear);
    main.appendChild(bar);
  }

  if (!visible.length) {
    main.appendChild(el("div", "empty",
      '<span class="big">🔍</span>没有找到匹配的网址<br>换个关键词试试，或点击右上角「添加网址」收藏它'));
    return;
  }

  for (const [cat, sites] of visible) {
    const sec = el("section", "section");
    sec.dataset.cat = cat.name;
    sec.innerHTML =
      `<div class="section-head">
         <span class="emoji">${esc(cat.icon)}</span>
         <h2>${esc(cat.name)}</h2>
         <span class="badge">${sites.length} 个网址</span>
         <span class="line"></span>
       </div>`;
    const grid = el("div", "grid");
    for (const s of sites) grid.appendChild(buildCard(s));
    sec.appendChild(grid);
    main.appendChild(sec);
  }
}

function renderFooter(cats) {
  const total = cats.reduce((n, c) => n + c.sites.length, 0);
  $("#footStats").textContent = `共收录 ${cats.length} 个分类 · ${total} 个网站`;
}

function renderAll() {
  const cats = allCategories();
  renderSidebar(cats);
  renderMain(cats);
  renderFooter(cats);
  updateSpy();
}

/* ---------- 主题（浅色 / 护眼 / 深色 循环切换） ---------- */
const THEME_SEQ = ["light", "eye", "dark"];
const THEME_META = {
  light: { icon: "☀️", label: "浅色" },
  eye: { icon: "🌿", label: "护眼" },
  dark: { icon: "🌙", label: "深色" }
};

function applyTheme(theme) {
  if (!THEME_META[theme]) theme = "dark";
  document.documentElement.setAttribute("data-theme", theme);
  store.set(LS.theme, theme);
  $("#themeBtn").textContent = THEME_META[theme].icon;
  $("#themeBtn").title = `当前：${THEME_META[theme].label}主题（点击切换）`;
}

/* ---------- 时钟 ---------- */
function tickClock() {
  const d = new Date();
  const wd = "日一二三四五六"[d.getDay()];
  const pad = (n) => String(n).padStart(2, "0");
  $("#clockDate").textContent = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${wd}`;
  $("#clockTime").textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  $("#greet").textContent = greeting();
}

/* ---------- 添加网址弹窗 ---------- */
function openModal() {
  const sel = $("#fCat");
  sel.innerHTML = allCategories().map((c) => `<option>${esc(c.name)}</option>`).join("");
  $("#fName").value = "";
  $("#fUrl").value = "";
  $("#fDesc").value = "";
  $("#fRegion").value = "";
  $("#modalMask").hidden = false;
  $("#fName").focus();
}

function closeModal() {
  $("#modalMask").hidden = true;
}

function saveCustom() {
  const name = $("#fName").value.trim();
  const url = normalizeUrl($("#fUrl").value);
  const category = $("#fCat").value.trim() || "我的收藏";
  const desc = $("#fDesc").value.trim();
  if (!name || !url) {
    alert("请至少填写「名称」和「网址」");
    return;
  }
  const list = store.get(LS.custom, []);
  if (list.some((s) => s.url === url)) {
    alert("该网址已存在");
    return;
  }
  const region = $("#fRegion").value;
  list.push({
    name: name.slice(0, 30), url, desc: desc.slice(0, 40), category,
    ...(region ? { region } : {})
  });
  store.set(LS.custom, list);
  closeModal();
  activeCategory = "all";
  keyword = "";
  $("#searchInput").value = "";
  renderAll();
}

/* ---------- 导出 / 导入 ---------- */
function exportCustom() {
  const data = store.get(LS.custom, []);
  if (!data.length) {
    alert("还没有自定义网址可以导出");
    return;
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "我的网址备份.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function importCustom(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const arr = JSON.parse(reader.result);
      if (!Array.isArray(arr)) throw new Error("bad");
      const list = store.get(LS.custom, []);
      const seen = new Set(list.map((s) => s.url));
      let added = 0;
      for (const s of arr) {
        if (s && s.name && s.url && !seen.has(s.url)) {
          list.push({
            name: String(s.name).slice(0, 30),
            url: normalizeUrl(s.url),
            desc: String(s.desc || "").slice(0, 40),
            category: String(s.category || "我的收藏").slice(0, 12)
          });
          seen.add(s.url);
          added++;
        }
      }
      store.set(LS.custom, list);
      renderAll();
      alert(`成功导入 ${added} 个网址`);
    } catch {
      alert("文件格式不正确，请选择之前导出的 JSON 文件");
    }
  };
  reader.readAsText(file);
}

/* ---------- 初始化 ---------- */
function init() {
  applySidebarMode();
  /* （生日自动导入机制已随 v73 隐私清理移除预置数据文件，死分支已删；
     需要"每年重复"的生日用 📅 生日与记录 手动添加/批量导入） */
  // 主题：优先取上次保存的，其次跟随系统
  const savedTheme = store.get(LS.theme, null);
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(THEME_SEQ.includes(savedTheme) ? savedTheme : (prefersDark ? "dark" : "light"));
  $("#themeBtn").onclick = () => {
    const seq = THEME_SEQ;
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(seq[(seq.indexOf(cur) + 1) % seq.length]);
  };

  // 时钟
  tickClock();
  setInterval(tickClock, 1000);

  // 专注模式：点击问候语切换（iTab 式），状态自动记忆
  $("#heroTitle").onclick = () => {
    zenMode = !zenMode;
    store.set(LS.zen, zenMode);
    applyZen();
  };

  // 搜索：输入即时筛选；回车用当前引擎搜索
  const input = $("#searchInput");
  input.addEventListener("input", () => {
    keyword = input.value.trim();
    renderAll();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      window.open(ENGINES[currentEngine].url + encodeURIComponent(input.value.trim()), "_blank");
    } else if (e.key === "Escape") {
      input.value = "";
      keyword = "";
      renderAll();
      input.blur();
    }
  });

  // 顶栏按钮（弹窗里的"导出/导入备份"复用同一逻辑；
  // 顶栏原 ⬇️⬆️ 已并入账号面板导出/导入，元素可能不存在，做空保护）
  $("#addBtn").onclick = openModal;
  const $opt = (s) => document.querySelector(s);
  $opt("#exportBtn") && ($("#exportBtn").onclick = exportCustom);
  $opt("#importBtn") && ($("#importBtn").onclick = () => $("#importFile").click());
  $("#exportBtn2").onclick = exportCustom;
  $("#importBtn2").onclick = () => $("#importFile").click();
  $("#restoreBtn").onclick = restoreHiddenSites;
  $("#cleanBtn").onclick = removeEmptyCategories;
  $("#importFile").addEventListener("change", (e) => {
    if (e.target.files[0]) importCustom(e.target.files[0]);
    e.target.value = "";
  });

  // 弹窗
  $("#fSave").onclick = saveCustom;
  $("#fCancel").onclick = closeModal;
  $("#modalMask").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("#modalMask").hidden) closeModal();
  });

  // 地区筛选：全部 / 大陆 / 外网（仅带 data-r 的按钮，🔲 模式按钮不参与）
  const rBtns = $("#regionFilter").querySelectorAll("button[data-r]");
  rBtns.forEach((b) => {
    b.onclick = () => {
      regionFilter = b.dataset.r;
      rBtns.forEach((x) => x.classList.toggle("active", x === b));
      renderAll();
    };
  });

  // 小图标模式：外网右侧 🔲 按钮，方块网格与大卡片互切（状态记忆）
  const iconBtn = $("#iconModeBtn");
  const syncIconBtn = () => {
    iconBtn.classList.toggle("active", iconMode);
    iconBtn.title = iconMode ? "小图标模式已开启 · 点击恢复大卡片" : "切换为小图标（方块）模式";
  };
  iconBtn.onclick = () => {
    iconMode = !iconMode;
    store.set(LS.iconMode, iconMode);
    applyIconMode();
    syncIconBtn();
    renderAll();
  };
  syncIconBtn();

  // 回到顶部
  const backTop = $("#backTop");
  backTop.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
  window.addEventListener("scroll", () => {
    backTop.classList.toggle("show", window.scrollY > 400);
    updateSpy();
  }, { passive: true });

  renderAll();
}

document.addEventListener("DOMContentLoaded", init);
