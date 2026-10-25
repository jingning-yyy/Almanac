/* ============================================================
 * 万年历 · 月视图（公历/农历/干支/节气/节日）
 * 依赖 js/solarlunar.js 提供的 solarLunar 全局对象
 * ============================================================ */
"use strict";

const CAL = {
  MIN_YEAR: 1901,
  MAX_YEAR: 2099,
  view: { y: 2026, m: 1 },   // 当前显示的公历年月
  selected: null,            // 当前选中的日期 {y, m, d}
  now: () => new Date()
};

/* 纪念日格点标记色（区别于生日橙/纪念粉/提醒蓝） */
const TIMER_DOT = "#8b5cf6";
/* 当日心情（万年历选中日后右下角单选） */
const MOODS = [
  { e: "☀️", t: "晴" }, { e: "☁️", t: "阴" }, { e: "🌧️", t: "雨" }, { e: "⛈️", t: "暴雨" }
];
function moodMap() {
  try { return JSON.parse(localStorage.getItem("nav_mood") || "{}"); } catch { return {}; }
}
function moodLabel(e) {
  const m = MOODS.find((x) => x.e === e);
  return m ? m.t : "";
}

/* ---------- 当日附件图片（IndexedDB 存储，key = y-m-d） ---------- */
const AttachDB = (() => {
  let dbp = null;
  const open = () => {
    if (!dbp) {
      dbp = new Promise((resolve, reject) => {
        const req = indexedDB.open("nav_calendar_attach", 1);
        req.onupgradeneeded = () => req.result.createObjectStore("days", { keyPath: "key" });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbp;
  };
  return {
    async get(key) {
      const db = await open();
      return new Promise((res, rej) => {
        const tx = db.transaction("days").objectStore("days").get(key);
        tx.onsuccess = () => res(tx.result ? tx.result.urls : []);
        tx.onerror = () => rej(tx.error);
      });
    },
    async set(key, urls) {
      const db = await open();
      return new Promise((res, rej) => {
        const tx = db.transaction("days", "readwrite");
        tx.objectStore("days").put({ key, urls });
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
      });
    },
    /* 当前账号前缀下的全部附件（导出/导入用） */
    async entries(prefix) {
      const db = await open();
      return new Promise((res, rej) => {
        const rq = db.transaction("days").objectStore("days").getAll();
        rq.onsuccess = () => res((rq.result || []).filter(
          (r) => r && typeof r.key === "string" && r.key.startsWith(prefix)
        ));
        rq.onerror = () => rej(rq.error);
      });
    }
  };
})();

/* 公历节日表（月-日 → 名称） */
const SOLAR_FEST = {
  "1-1": "元旦", "2-14": "情人节", "3-8": "妇女节", "3-12": "植树节",
  "4-1": "愚人节", "5-1": "劳动节", "5-4": "青年节", "6-1": "儿童节",
  "7-1": "建党节", "8-1": "建军节", "9-10": "教师节", "10-1": "国庆节",
  "12-24": "平安夜", "12-25": "圣诞节"
};

/* 农历节日表（农历月-日 → 名称） */
const LUNAR_FEST = {
  "1-1": "春节", "1-15": "元宵节", "2-2": "龙抬头", "5-5": "端午节",
  "7-7": "七夕节", "7-15": "中元节", "8-15": "中秋节", "9-9": "重阳节",
  "12-8": "腊八节", "12-23": "北方小年"
};

function calEsc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/* 计算某日的节日集合（含农历推算的除夕） */
function dayFests(y, m, d, sl) {
  const fests = [];
  const lunarKey = sl.lMonth + "-" + sl.lDay;
  if (lunarKey === "1-1") fests.push("春节");
  else if (LUNAR_FEST[lunarKey]) fests.push(LUNAR_FEST[lunarKey]);

  // 除夕：农历正月初一的前一天
  const next = new Date(y, m - 1, d + 1);
  const nl = solarLunar.solar2lunar(next.getFullYear(), next.getMonth() + 1, next.getDate());
  if (nl !== -1 && nl.lMonth === 1 && nl.lDay === 1) fests.push("除夕");

  if (SOLAR_FEST[m + "-" + d]) fests.push(SOLAR_FEST[m + "-" + d]);
  return fests;
}

/* 单元格小字标签：节气 > 节日 > 农历月初 > 农历日 */
function dayLabel(y, m, d, sl) {
  const fests = dayFests(y, m, d, sl);
  if (sl.isTerm) return { text: sl.term, cls: "term" };
  const lunarFest = fests.find((f) => f !== SOLAR_FEST[m + "-" + d]);
  if (lunarFest) return { text: lunarFest, cls: "fest" };
  if (fests.length) return { text: fests[0], cls: "fest" };
  if (sl.lDay === 1) return { text: sl.monthCn, cls: "" };
  return { text: sl.dayCn, cls: "" };
}

function calRender() {
  const { y, m } = CAL.view;
  const slHeader = solarLunar.solar2lunar(y, m, 1);
  $("#calYM").textContent = `${y} 年 ${m} 月`;
  $("#calGz").textContent = `${slHeader.gzYear}年 · ${slHeader.animal}年`;

  const grid = $("#calGrid");
  grid.innerHTML = "";

  const days = solarLunar.solarDays(y, m);
  const firstWeekday = new Date(y, m - 1, 1).getDay(); // 0=周日
  const today = CAL.now();
  const sel = CAL.selected;
  const moods = moodMap();

  for (let i = 0; i < firstWeekday; i++) grid.appendChild(document.createElement("span"));

  for (let d = 1; d <= days; d++) {
    const sl = solarLunar.solar2lunar(y, m, d);
    const label = dayLabel(y, m, d, sl);
    const dayRecs = Records.getFor(y, m, d, sl);
    const dayTimers = Timers.getFor(y, m, d);   // 当天起始的纪念日
    const col = (firstWeekday + d - 1) % 7;
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cal-cell" + (col === 0 || col === 6 ? " we" : "");
    if (today.getFullYear() === y && today.getMonth() + 1 === m && today.getDate() === d) cell.classList.add("today");
    if (sel && sel.y === y && sel.m === m && sel.d === d) cell.classList.add("selected");
    cell.title = `${sl.monthCn}${sl.dayCn}` + (sl.isTerm ? ` · ${sl.term}` : "")
      + (dayRecs.length ? `\n${dayRecs.map((r) => (Records.KIND_META[r.kind] || Records.KIND_META.note).icon + " " + r.name).join("\n")}` : "")
      + (dayTimers.length ? `\n${dayTimers.map((t) => t.icon + " " + t.name).join("\n")}` : "");
    /* 多色标记：生日按类型色，纪念日紫罗兰色，同日并存 */
    const dotColors = [];
    for (const r of dayRecs) {
      const c = (Records.KIND_META[r.kind] || Records.KIND_META.note).color;
      if (!dotColors.includes(c)) dotColors.push(c);
    }
    if (dayTimers.length && !dotColors.includes(TIMER_DOT)) dotColors.push(TIMER_DOT);
    const dot = dotColors.length
      ? `<span class="rec-dots">${dotColors.map((c) => `<i style="background:${c}"></i>`).join("")}</span>`
      : "";
    /* 当日心情：格子右上角 */
    const mood = moods[`${y}-${m}-${d}`];
    const moodIco = mood ? `<span class="cal-mood-ico" title="心情：${moodLabel(mood)}">${mood}</span>` : "";
    /* 当日日记：格子左上角小铅笔 */
    const diaryMap = window.Diary ? window.Diary.map() : {};
    const diaryIco = (diaryMap[`${y}-${m}-${d}`] || "").trim()
      ? `<span class="cal-diary-ico" title="有日记/备注">📝</span>` : "";
    cell.innerHTML =
      `<span class="solar">${d}</span>` +
      `<span class="lunar ${label.cls}">${calEsc(label.text)}</span>` + dot + moodIco + diaryIco;
    cell.onclick = () => {
      CAL.selected = { y, m, d };
      calRender();
    };
    grid.appendChild(cell);
  }
  calRenderDetail();
}

function calRenderDetail() {
  const box = $("#calDetail");
  if (!CAL.selected) { box.innerHTML = ""; return; }
  const { y, m, d } = CAL.selected;
  const sl = solarLunar.solar2lunar(y, m, d);
  if (sl === -1) { box.innerHTML = "<span>暂无该日期数据（支持 1900–2100 年）</span>"; return; }

  const fests = dayFests(y, m, d, sl);
  const festText = fests.length
    ? `<span class="fest-line">${fests.map(calEsc).join(" · ")}</span><br>`
    : "";

  const recs = Records.getFor(y, m, d, sl);
  const recLine = recs.length
    ? `<span class="cal-rec-line">${recs.map((r) => {
        const meta = Records.KIND_META[r.kind] || Records.KIND_META.note;
        let t = `${meta.icon} ${calEsc(r.name)}`;
        if (r.kind === "birthday" && r.y && r.y > 1900) t += `（满${y - r.y}岁）`;
        return t;
      }).join("　")}</span><br>`
    : "";

  /* 当天起始的纪念日 */
  const tms = Timers.getFor(y, m, d);
  const timerLine = tms.length
    ? `<span class="cal-timer-line">🎂 纪念日：${tms.map((t) => `${t.icon} ${calEsc(t.name)}`).join("　")}</span><br>`
    : "";

  /* 当日日记摘要（点击可编辑），与心情同键位（y-m-d） */
  const diaryKey = `${y}-${m}-${d}`;
  const diaryTxt = window.Diary ? String(window.Diary.map()[diaryKey] || "") : "";
  const diaryLine = diaryTxt.trim()
    ? `<span class="cal-diary-line" id="calDiaryLine" title="点击编辑日记">📝 ${calEsc(diaryTxt.replace(/\s+/g, " ").slice(0, 46))}${diaryTxt.replace(/\s+/g, " ").length > 46 ? "…" : ""}</span><br>`
    : "";

  /* 当天森林：番茄钟（pomodoro.v1）里 d = 当天（补零日期键）的树 */
  const forestQKey = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const FOREST_ICON = { 1: "🌳", 2: "🌲", 3: "🌵", 4: "🍄", 0: "🎄", "-1": "🥀" };
  const FOREST_NAME = {
    "1:0": "橡树", "1:1": "枫树", "1:2": "苹果树", "1:3": "椰子树", "1:4": "芒果树",
    "2:0": "松树", "2:1": "樱花", "2:2": "银杏", "2:3": "雪松", "2:4": "玉兰",
    "3:0": "仙人掌", "3:1": "灌木", "3:2": "竹子", "3:3": "仙人球", "3:4": "芦荟",
    "4:0": "蘑菇", "4:1": "多肉", "4:2": "花丛", "4:3": "四叶草", "4:4": "蕨类",
    "0:0": "果树", "0:1": "白桦", "0:2": "柳树", "0:3": "老榕树", "0:4": "桃树",
    "-1:0": "枯木"
  };
  let dayTrees = [];
  try {
    const pd = JSON.parse(localStorage.getItem("pomodoro.v1") || "{}");
    dayTrees = (pd.forest || []).filter((t) => t && t.d === forestQKey);
  } catch { /* 番茄钟数据不可用：不显示 */ }
  const treeTime = (ts) => {
    const d = new Date(ts || 0);
    const p = (n) => String(n).padStart(2, "0");
    return ts ? `${p(d.getHours())}:${p(d.getMinutes())}` : "";
  };
  const treeTip = (t) =>
    calEsc((FOREST_NAME[t.q + ":" + (t.sp || 0)] || "树")
      + (t.t ? " · " + t.t : "") + " · " + treeTime(t.ts));
  /* 左下角当天森林（始终占位，保证心情保持在右下角）：≤6 棵与心情同尺寸图标
     并列；更多放不下改进度条（满格 20 棵）；悬停显示树种 + 种植时间 */
  const forestBox = dayTrees.length <= 6
    ? `<button type="button" class="cal-forest-box${dayTrees.length ? "" : " empty"}" id="calForestDay" title="` +
      (dayTrees.length
        ? `点开按当天 ${forestQKey} 筛选的森林">` + dayTrees.map((t) => `<i class="cal-forest-i" title="${treeTip(t)}">${FOREST_ICON[t.q] || "🌳"}</i>`).join("")
        : `当天还没种树 · 点开森林去种一棵">🌳<span class="cal-forest-zero">0 棵</span>`) +
      `</button>`
    : `<button type="button" class="cal-forest-box hasbar" id="calForestDay" title="` +
      calEsc(dayTrees.slice(0, 15).map((t) =>
        (FOREST_NAME[t.q + ":" + (t.sp || 0)] || "树") + " · " + treeTime(t.ts)
      ).join("\n") + (dayTrees.length > 15 ? `\n…共 ${dayTrees.length} 棵` : "")) +
      `">🌳<span class="cal-forest-track"><i style="width:${Math.min(100, Math.round(dayTrees.length / 20 * 100))}%"></i></span><b>${dayTrees.length}棵</b></button>`;

  /* 当日心情单选（右下角），再次点击同一心情可取消 */
  const moodKey = `${y}-${m}-${d}`;
  /* 附件按当前账号前缀隔离（account.js 注入 NAV_USER_PREFIX） */
  const attachKey = (window.NAV_USER_PREFIX || "") + moodKey;
  const curMood = moodMap()[moodKey] || "";
  const moodRow =
    `<div class="cal-mood-row"><span class="cal-mood-label">当日心情</span>` +
    MOODS.map((mo) =>
      `<button type="button" class="cal-mood-btn${curMood === mo.e ? " active" : ""}" data-m="${mo.e}" title="${mo.t}">${mo.e}</button>`
    ).join("") +
    `</div>`;

  const detailText =
    `<b>${y}年${m}月${d}日</b> ${calEsc(sl.ncWeek)}${sl.isTerm ? ` · <span class="term-line">${calEsc(sl.term)}</span>` : ""}<br>` +
    `${festText}` +
    `农历 ${calEsc(sl.gzYear)}年（${calEsc(sl.animal)}） ${calEsc(sl.monthCn)}${calEsc(sl.dayCn)}<br>` +
    `干支 ${calEsc(sl.gzYear)}年 ${calEsc(sl.gzMonth)}月 ${calEsc(sl.gzDay)}日` +
    (recLine ? `<br>${recLine}` : "") +
    (timerLine ? `<br>${timerLine}` : "") +
    (diaryLine ? `<br>${diaryLine}` : "");

  box.innerHTML =
    `<div class="cal-detail-flex"><div class="cal-detail-text">${detailText}</div>` +
    `<div class="cal-attach" id="calAttach"><span class="cal-attach-hint">…</span></div></div>` +
    `<div class="cal-bottom-row">${forestBox}${moodRow}</div>`;

  const diaryLineEl = box.querySelector("#calDiaryLine");
  if (diaryLineEl) diaryLineEl.onclick = () =>
    window.Diary && window.Diary.open(diaryKey, `${y}年${m}月${d}日`);
  /* 当天森林 → 打开番茄钟森林并按当天筛选 */
  const forestEl = box.querySelector("#calForestDay");
  if (forestEl) forestEl.onclick = () => {
    document.getElementById("calMask").hidden = true;
    if (window.__OPEN_TOMATO) window.__OPEN_TOMATO("forest?d=" + forestQKey);
  };

  box.querySelectorAll(".cal-mood-btn").forEach((b) => {
    b.onclick = () => {
      const mp = moodMap();
      if (mp[moodKey] === b.dataset.m) delete mp[moodKey];   // 再点一次取消
      else mp[moodKey] = b.dataset.m;
      try { localStorage.setItem("nav_mood", JSON.stringify(mp)); } catch { /* 忽略 */ }
      calRender();   // 刷新格子右上角标记与选中态
    };
  });

  /* 附件图片（右上角，IndexedDB 异步加载）：多张显示最后一张，点开灯箱可左右查看 */
  AttachDB.get(attachKey).then((urls) => {
    const zone = document.getElementById("calAttach");
    const s = CAL.selected;
    if (!zone || !s || s.y !== y || s.m !== m || s.d !== d) return;   // 日期已切换
    if (!urls.length) {
      zone.innerHTML = `<button type="button" class="cal-attach-add" title="上传图片（可多选）">📷<i>＋</i></button>`;
    } else {
      zone.innerHTML =
        `<button type="button" class="cal-attach-thumb" title="点击放大查看，共 ${urls.length} 张"><img src="${urls[urls.length - 1]}" alt=""><i class="cal-attach-cnt">${urls.length}</i><i class="cal-attach-del" title="删除这张（最后上传的）">✕</i></button>` +
        `<button type="button" class="cal-attach-add" title="再添加图片">＋</button>`;
    }
    const addBtn = zone.querySelector(".cal-attach-add");
    if (addBtn) addBtn.onclick = () => pickAttach(attachKey);
    const thumb = zone.querySelector(".cal-attach-thumb");
    if (thumb) thumb.onclick = () => lbOpen(attachKey, urls, urls.length - 1);
    const del = zone.querySelector(".cal-attach-del");
    if (del) del.onclick = async (e) => {
      e.stopPropagation();                       // 不触发缩略图的灯箱
      const rest = urls.slice(0, -1);
      await AttachDB.set(attachKey, rest);
      calRenderDetail();
    };
  }).catch(() => { /* 存储不可用时静默 */ })
    /* 日记入口固定挂在附件区下方（不管附件库是否可用） */
    .finally(() => {
      const zone2 = document.getElementById("calAttach");
      const s = CAL.selected;
      if (!zone2 || !s || s.y !== y || s.m !== m || s.d !== d) return;   // 日期已切换
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cal-diary-btn" + ((window.Diary && window.Diary.map()[moodKey] || "").trim() ? " has" : "");
      b.title = "写日记/备注（每天一条）";
      b.textContent = "📝 日记";
      b.onclick = () => window.Diary && window.Diary.open(moodKey, `${y}年${m}月${d}日`);
      zone2.appendChild(b);
    });
}

/* ---------- 附件：选择文件 → dataURL 存入 IndexedDB ---------- */
let attachInput = null;
function pickAttach(key) {
  if (!attachInput) {
    attachInput = document.createElement("input");
    attachInput.type = "file";
    attachInput.accept = "image/*";
    attachInput.multiple = true;
    attachInput.style.display = "none";
    document.body.appendChild(attachInput);
    attachInput.onchange = async () => {
      const files = [...attachInput.files].filter((f) => f.type.startsWith("image/"));
      attachInput.value = "";
      if (!files.length) return;
      const read = (f) => new Promise((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.readAsDataURL(f);
      });
      try {
        const urls = [];
        for (const f of files) {
          if (f.size > 15 * 1024 * 1024) { alert(`「${f.name}」超过 15MB，已跳过`); continue; }
          urls.push(await read(f));
        }
        if (!urls.length) return;
        const old = await AttachDB.get(key);
        await AttachDB.set(key, old.concat(urls));
        calRenderDetail();
      } catch (e) {
        alert("图片保存失败：" + String(e && e.message || e));
      }
    };
  }
  attachInput.click();
}

/* ---------- 附件灯箱：左右切换 / 删除 / 关闭 ---------- */
let lbEl = null, lbList = [], lbIdx = 0, lbKey = null;
function ensureLightbox() {
  if (lbEl) return lbEl;
  lbEl = document.createElement("div");
  lbEl.id = "calLightbox";
  lbEl.hidden = true;
  lbEl.innerHTML =
    `<button type="button" class="lb-del" title="删除此图">🗑️</button>` +
    `<button type="button" class="lb-close" title="关闭">✕</button>` +
    `<button type="button" class="lb-prev" title="上一张">‹</button>` +
    `<img alt="">` +
    `<button type="button" class="lb-next" title="下一张">›</button>` +
    `<span class="lb-cnt"></span>`;
  document.body.appendChild(lbEl);
  lbEl.addEventListener("click", (e) => { if (e.target === lbEl) lbClose(); });
  lbEl.querySelector(".lb-close").onclick = lbClose;
  lbEl.querySelector(".lb-prev").onclick = () => { lbIdx = (lbIdx - 1 + lbList.length) % lbList.length; lbShow(); };
  lbEl.querySelector(".lb-next").onclick = () => { lbIdx = (lbIdx + 1) % lbList.length; lbShow(); };
  lbEl.querySelector(".lb-del").onclick = async () => {
    lbList.splice(lbIdx, 1);
    if (lbIdx >= lbList.length) lbIdx = lbList.length - 1;
    await AttachDB.set(lbKey, lbList);
    if (lbIdx < 0) { lbClose(); } else lbShow();
    calRenderDetail();
  };
  return lbEl;
}
function lbOpen(key, urls, idx) {
  lbKey = key; lbList = urls; lbIdx = idx;
  ensureLightbox().hidden = false;
  lbShow();
}
function lbClose() { if (lbEl) lbEl.hidden = true; }
function lbShow() {
  if (!lbEl || !lbList.length) return;
  lbEl.querySelector("img").src = lbList[lbIdx] || "";
  lbEl.querySelector(".lb-cnt").textContent = `${lbIdx + 1} / ${lbList.length}`;
  lbEl.querySelector(".lb-prev").style.visibility = lbList.length > 1 ? "visible" : "hidden";
  lbEl.querySelector(".lb-next").style.visibility = lbList.length > 1 ? "visible" : "hidden";
}

function calShift(delta) {
  let { y, m } = CAL.view;
  m += delta;
  if (m < 1) { m = 12; y--; }
  if (m > 12) { m = 1; y++; }
  if (y < CAL.MIN_YEAR || y > CAL.MAX_YEAR) return;
  CAL.view = { y, m };
  calRender();
}

function calBackToday() {
  const t = CAL.now();
  CAL.view = { y: t.getFullYear(), m: t.getMonth() + 1 };
  CAL.selected = { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() };
  calRender();
}

function calOpen() {
  const t = CAL.now();
  CAL.view = { y: t.getFullYear(), m: t.getMonth() + 1 };
  CAL.selected = { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() };
  $("#calMask").hidden = false;
  calRender();
}

function calClose() { $("#calMask").hidden = true; }

document.addEventListener("DOMContentLoaded", () => {
  $("#calendarBtn").onclick = calOpen;
  $("#calPrev").onclick = () => calShift(-1);
  $("#calNext").onclick = () => calShift(1);
  $("#calToday").onclick = calBackToday;
  $("#calClose").onclick = calClose;
  $("#calMask").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) calClose();
  });
  document.addEventListener("keydown", (e) => {
    /* 灯箱打开时：方向键切图，Esc 关闭 */
    const lb = document.getElementById("calLightbox");
    if (lb && !lb.hidden) {
      if (e.key === "Escape") lbClose();
      if (e.key === "ArrowLeft") { lbIdx = (lbIdx - 1 + lbList.length) % lbList.length; lbShow(); }
      if (e.key === "ArrowRight") { lbIdx = (lbIdx + 1) % lbList.length; lbShow(); }
      return;
    }
    if (e.key === "Escape" && !$("#calMask").hidden) calClose();
    if (!$("#calMask").hidden) {
      if (e.key === "ArrowLeft") calShift(-1);
      if (e.key === "ArrowRight") calShift(1);
    }
  });

  /* 记录变化时刷新日历圆点与详情 */
  if (window.Records) Records.onChange(calRender);
});
