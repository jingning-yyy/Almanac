/* ============================================================
 * 纪念日 · 正计时
 * 记录与恋人/朋友的重要日子（如「在一起」「第一次旅行」），
 * 按起始日期正向累计：第 N 天（含当天）或 已过 N 天，秒级实时跳动，
 * 支持自定义分组（恋爱/生日…或任意名称）与按分组筛选。
 * 存储 localStorage["nav_timers"]，显示偏好 nav_timer_style，
 * 分组筛选记忆 nav_timer_cat
 * 依赖：app.js 的 $ 助手（须在本文件之前加载）
 * ============================================================ */
"use strict";

const Timers = (() => {
  const LS_KEY = "nav_timers";
  const LS_STYLE = "nav_timer_style";
  const LS_CAT = "nav_timer_cat";
  const LS_COMPACT = "nav_timer_compact";
  const LS_ORDER = "nav_timer_order";
  const LS_SIZE = "nav_timer_size";
  const LS_HOL_OFF = "nav_holiday_off";   // 用户删除过的自动节日名（不再重新生成）
  const LS_CAT_ORDER = "nav_timer_cat_order";  // 分组页签拖动排序
  const LS_REMIND = "nav_remind";              // "1" = 开启纪念日提醒
  const LS_REMIND_DONE = "nav_remind_done";    // 当天已提醒标记 { date }
  let dragCat = null;     // 正在拖动的分组页签
  const PRESET_CATS = ["恋爱", "生日", "旅行", "家人", "朋友", "生活", "节假日", "网络节日", "其他"];  // 分组建议（可自由输入）
  const EMOJIS = ["💗", "💕", "💑", "💖", "🌸", "🎁", "💍", "✈️",
    "🛫", "🛬", "🎂", "🎉", "🎈", "💐", "🧸", "🍼",
    "🎮", "📚", "🏠", "🎓", "🍜", "🎬", "📸", "⭐", "🍀", "🐱"];
  const onChangeSubs = [];
  let cache = null;
  let editId = null;      // 正在编辑的记录 id（null = 新增模式）
  let pickEmoji = "💗";   // 表单当前选中的图标
  let curCat = localStorage.getItem(LS_CAT) || "all";  // 当前筛选分组
  let compact = localStorage.getItem(LS_COMPACT) === "1";  // 小图模式
  let desc = localStorage.getItem(LS_ORDER) === "desc";    // 降序（晚→早）
  let tickTimer = null;   // 秒级刷新定时器（仅弹窗打开时运行）

  const load = () => {
    if (cache) return cache;
    try { cache = JSON.parse(localStorage.getItem(LS_KEY)) || []; }
    catch { cache = []; }
    return cache;
  };
  const save = () => {
    localStorage.setItem(LS_KEY, JSON.stringify(cache || []));
    onChangeSubs.forEach((fn) => fn());
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
  const pad2 = (n) => String(n).padStart(2, "0");
  let seq = 0;
  const nextId = () => Date.now() + "" + (seq++);

  const styleOf = () =>
    localStorage.getItem(LS_STYLE) === "elapsed" ? "elapsed" : "inclusive";

  function normalize(t, id) {
    return {
      id,
      icon: String(t.icon || "💗").replace(/[<>"'`\\]/g, "").slice(0, 8) || "💗",
      name: String(t.name).slice(0, 20),
      cat: String(t.cat || "").trim().slice(0, 10) || "其他",
      y: Number(t.y), m: Number(t.m), d: Number(t.d),
      time: /^\d{1,2}:\d{2}$/.test(t.time || "") ? t.time : "",
      /* 自动节日标记（holiday 法定 / netfest 网络节日），用于过期自动清理 */
      ...(t.auto === "holiday" || t.auto === "netfest" ? { auto: t.auto } : {}),
      /* 生日若按阴历录入，保留原始农历输入用于显示与编辑 */
      ...(t.lcal && Number(t.lcal.y) && Number(t.lcal.m) && Number(t.lcal.d)
        ? { lcal: { y: Number(t.lcal.y), m: Number(t.lcal.m), d: Number(t.lcal.d), ...(t.lcal.leap ? { leap: true } : {}) } }
        : {}),
      ...(t.note ? { note: String(t.note).slice(0, 30) } : {})
    };
  }

  /* 旧数据可能没有 cat 字段 */
  const catOf = (t) => t.cat || "其他";

  /* 起始时刻（毫秒）；未填时间按当天 00:00 */
  const startMs = (t) => {
    const [hh, mm] = t.time ? t.time.split(":").map(Number) : [0, 0];
    return new Date(t.y, t.m - 1, t.d, hh, mm, 0).getTime();
  };
  /* 起始日 0 点（第 N 天按自然日计算，与是否填时间无关） */
  const startDayMs = (t) => new Date(t.y, t.m - 1, t.d).getTime();

  /* 百天整（100/200/…/1000/1100…）与 520 天算作节点 */
  const isNode = (n) => n > 0 && (n % 100 === 0 || n === 520);

  /* 已共同度过 X 年 X 个月（不足一个月返回空） */
  function spanText(t, now) {
    let y = now.getFullYear() - t.y;
    let m = now.getMonth() + 1 - t.m;
    if (now.getDate() < t.d) m--;
    if (m < 0) { y--; m += 12; }
    if (y <= 0 && m <= 0) return "";
    return (y > 0 ? `${y} 年` : "") + (m > 0 ? `${y > 0 ? " " : ""}${m} 个月` : "");
  }

  /* ---------- 单条卡片的动态数据 ---------- */
  function calc(t, now) {
    const sMs = startMs(t), sdMs = startDayMs(t);
    const elapsed = Math.floor((now.getTime() - sMs) / 1000);   // 已过秒数
    const days = Math.max(0, Math.floor((now.getTime() - sdMs) / 86400000));
    const style = styleOf();

    /* 大数字与秒级实时行：天数与大数字同口径（自然日），时分秒为当日精确进度 */
    const future = elapsed < 0;   // 晚于当前时间 → 倒计时
    let big, live;
    if (future) {
      big = Math.ceil(-elapsed / 86400);   // 还有 X 天（不足一天按 1 天）
      const dd = Math.floor(-elapsed / 86400);
      const r = (-elapsed) % 86400;
      live = `${dd} 天 ${pad2(Math.floor(r / 3600))}:${pad2(Math.floor((r % 3600) / 60))}:${pad2(r % 60)}`;
    } else {
      big = style === "inclusive" ? days + 1 : days;         // 大数字：第 N 天 / 已过 N 天
      const r = elapsed % 86400;
      live = `${days} 天 ${pad2(Math.floor(r / 3600))}:${pad2(Math.floor((r % 3600) / 60))}:${pad2(r % 60)}`;
    }

    /* 下个节点：满 N 天（百天整 / 520）或 周年，取更近者（倒计时条目不适用） */
    let next = null;
    if (!future) {
      const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      for (let n = big + 1; n <= big + 120; n++) {
        if (isNode(n)) {
          const dt = new Date(sdMs + (style === "inclusive" ? n - 1 : n) * 86400000);
          next = { label: `满 ${n} 天`, days: Math.round((dt.getTime() - todayMs) / 86400000), date: dt };
          break;
        }
      }
      for (let k = 1; k <= 3; k++) {
        const dt = new Date(t.y + k, t.m - 1, t.d);
        if (dt.getTime() === todayMs) {
          /* 今天正是周年日 */
          const cand = { label: `${k} 周年`, days: 0, date: dt, today: true };
          if (!next || !next.today) next = cand;
          break;
        }
        if (dt.getTime() > todayMs) {
          const cand = { label: `${k} 周年`, days: Math.round((dt.getTime() - todayMs) / 86400000), date: dt };
          if (!next || cand.date < next.date) next = cand;
          break;
        }
      }
    }

    return {
      days, big, live, next, style, future,
      today: !future && isNode(big),             // 今天正好满整数天（如 520、1000）
      annivToday: !!(next && next.today)         // 今天正好是周年
    };
  }

  const fmtDate = (t) => `${t.y}-${pad2(t.m)}-${pad2(t.d)}${t.time ? " " + t.time : ""}`;

  /* 相隔天数的人性化后缀 */
  function fmtGap(d) {
    if (d >= 365) return `${d} 天（约 ${(d / 365.25).toFixed(1)} 年）`;
    if (d >= 60) return `${d} 天（约 ${Math.round(d / 30.44)} 个月）`;
    if (d >= 14) return `${d} 天（${Math.floor(d / 7)} 周）`;
    return `${d} 天`;
  }

  /* ---------- 法定节假日 / 网络节日自动维护 ----------
   * 只保留未到的：过期自动清理；未来两年内缺失的自动生成。
   * 农历节日（春节/端午/中秋/七夕）与清明节气由农历引擎精确推算。
   * 用户删过的节日（记入 nav_holiday_off）不再生成。 */
  function ensureHolidays() {
    const now = new Date();
    const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    let changed = false;

    /* 1) 清理已过期的自动节日 */
    cache = load().filter((t) => {
      if (t.auto && startDayMs(t) < todayMs) { changed = true; return false; }
      return true;
    });

    /* 2) 生成未来两年内缺失的节日 */
    const off = (() => { try { return new Set(JSON.parse(localStorage.getItem(LS_HOL_OFF) || "[]")); } catch { return new Set(); } })();
    const seen = new Set(load().map((t) => `${t.name}|${t.y}-${t.m}-${t.d}`));
    const add = (name, y, m, d, icon, auto) => {
      const key = `${name}|${y}-${m}-${d}`;
      if (off.has(name) || seen.has(key)) return;
      if (new Date(y, m - 1, d).getTime() < todayMs) return;   // 只加未到的
      load().push(normalize({
        icon, name, cat: auto === "holiday" ? "节假日" : "网络节日", y, m, d, auto
      }, nextId()));
      seen.add(key);
      changed = true;
    };
    for (const y of [now.getFullYear(), now.getFullYear() + 1]) {
      /* 法定节假日（固定阳历） */
      add("元旦", y, 1, 1, "🎊", "holiday");
      add("劳动节", y, 5, 1, "🛠️", "holiday");
      add("国庆节", y, 10, 1, "🎆", "holiday");
      /* 法定节假日（农历/节气推算） */
      const chj = solarLunar.lunar2solar(y, 1, 1, false);        // 正月初一
      if (chj !== -1) add("春节", chj.cYear, chj.cMonth, chj.cDay, "🏮", "holiday");
      const dw = solarLunar.lunar2solar(y, 5, 5, false);         // 五月初五
      if (dw !== -1) add("端午节", dw.cYear, dw.cMonth, dw.cDay, "🐉", "holiday");
      const zq = solarLunar.lunar2solar(y, 8, 15, false);        // 八月十五
      if (zq !== -1) add("中秋节", zq.cYear, zq.cMonth, zq.cDay, "🥮", "holiday");
      for (let d = 3; d <= 7; d++) {                             // 清明节气（4 月初）
        const sl = solarLunar.solar2lunar(y, 4, d);
        if (sl !== -1 && sl.term === "清明") { add("清明节", y, 4, d, "🌱", "holiday"); break; }
      }
      /* 网络节日（固定阳历） */
      add("情人节", y, 2, 14, "💕", "netfest");
      add("520", y, 5, 20, "💗", "netfest");
      add("618", y, 6, 18, "🛍️", "netfest");
      add("双十一", y, 11, 11, "🛒", "netfest");
      /* 网络节日（农历推算） */
      const qx = solarLunar.lunar2solar(y, 7, 7, false);         // 七月初七
      if (qx !== -1) add("七夕", qx.cYear, qx.cMonth, qx.cDay, "🌌", "netfest");
    }
    if (changed) save();
  }

  /* ---------- 渲染 ---------- */
  function render() {
    const box = $("#timerList");
    const now = new Date();
    const items = [...load()].sort((a, b) =>
      desc ? startMs(b) - startMs(a) : startMs(a) - startMs(b));

    /* 分组筛选条：全部固定在首，其余按记忆顺序（可拖动排序），新组附后 */
    fillCatList();
    const catsBox = $("#timerCats");
    const counts = {};
    for (const t of items) {
      const c = catOf(t);
      counts[c] = (counts[c] || 0) + 1;
    }
    const present = [
      ...PRESET_CATS.filter((c) => counts[c]),
      ...Object.keys(counts).filter((c) => !PRESET_CATS.includes(c))
    ];
    const storedOrder = (() => { try { return JSON.parse(localStorage.getItem(LS_CAT_ORDER) || "[]"); } catch { return []; } })();
    const ordered = storedOrder.filter((c) => counts[c]);
    for (const c of present) if (!ordered.includes(c)) ordered.push(c);
    if (curCat !== "all" && !counts[curCat]) curCat = "all";
    catsBox.innerHTML = ordered.length
      ? `<button type="button" data-c="all" class="${curCat === "all" ? "active" : ""}">全部<i class="cnt">${items.length}</i></button>` +
        ordered.map((c) =>
          `<button type="button" draggable="true" data-c="${esc(c)}" class="${curCat === c ? "active" : ""}" title="拖动调整分组顺序">${esc(c)}<i class="cnt">${counts[c]}</i></button>`
        ).join("")
      : "";
    catsBox.querySelectorAll("button").forEach((b) => {
      b.onclick = () => {
        curCat = b.dataset.c;
        localStorage.setItem(LS_CAT, curCat);
        render();
      };
      /* 拖动排序 */
      b.ondragstart = (e) => {
        dragCat = b.dataset.c;
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", dragCat); } catch { /* 忽略 */ }
      };
      b.ondragover = (e) => {
        if (dragCat && dragCat !== b.dataset.c) { e.preventDefault(); b.classList.add("drag-over"); }
      };
      b.ondragleave = () => b.classList.remove("drag-over");
      b.ondragend = () => {
        dragCat = null;
        catsBox.querySelectorAll("button").forEach((x) => x.classList.remove("drag-over"));
      };
      b.ondrop = (e) => {
        e.preventDefault();
        b.classList.remove("drag-over");
        const from = dragCat;
        dragCat = null;
        if (!from || from === b.dataset.c) return;
        const fromIdx = ordered.indexOf(from);
        const toIdx = ordered.indexOf(b.dataset.c);
        if (fromIdx < 0 || toIdx < 0) return;
        ordered.splice(fromIdx, 1);
        ordered.splice(toIdx, 0, from);
        localStorage.setItem(LS_CAT_ORDER, JSON.stringify(ordered));
        render();
      };
    });

    const shown = curCat === "all" ? items : items.filter((t) => catOf(t) === curCat);
    if (!shown.length) {
      box.innerHTML = `<div class="rec-empty">${items.length
        ? "该分组下还没有纪念日。"
        : '还没有纪念日。<br>点「＋ 添加纪念日」，记下你们的第一个重要日子吧。'}</div>`;
      return;
    }
    /* 首行：有正计时条目 → 显示最新一条距今；全是未来条目 → 显示最近一条倒计时 */
    const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const pastItems = shown.filter((t) => startDayMs(t) <= todayMs);
    let headHtml = "";
    if (pastItems.length) {
      const newestPast = pastItems.reduce((a, b) => (startDayMs(b) > startDayMs(a) ? b : a), pastItems[0]);
      const d = Math.round((todayMs - startDayMs(newestPast)) / 86400000);
      if (d > 0) headHtml = `<div class="timer-gap"><span>⏳ 最新一条距今 ${fmtGap(d)}</span></div>`;
    } else {
      const nearest = shown.reduce((a, b) => (startDayMs(b) < startDayMs(a) ? b : a), shown[0]);
      const d = Math.round((startDayMs(nearest) - todayMs) / 86400000);
      if (d > 0) headHtml = `<div class="timer-gap"><span>⏳ 最近一条还有 ${fmtGap(d)}</span></div>`;
    }
    box.innerHTML = headHtml + shown.map((t, i) => {
      const c = calc(t, now);
      const badge = (c.today || c.annivToday)
        ? `<span class="timer-badge">🎉 今天${c.annivToday ? `是「${esc(t.name)}」${esc(c.next.label)}` : `满 ${c.big} 天`}</span>`
        : "";
      const nextLine = (c.next && c.next.days > 0)
        ? `⏭ 下个节点：${esc(c.next.label)} · 还有 ${c.next.days} 天（${c.next.date.getFullYear()}-${pad2(c.next.date.getMonth() + 1)}-${pad2(c.next.date.getDate())}）`
        : "";
      let durTxt = "";
      if (!c.future) {
        const span = spanText(t, now);
        durTxt = span ? `已 ${span}` : (c.days >= 7 ? `已 ${Math.floor(c.days / 7)} 周` : "");
      }
      /* 与上一条（相邻上方卡片）的起始日期间隔（升降序都取绝对间隔） */
      let gapHtml = "";
      if (i > 0) {
        const gapDays = Math.abs(Math.round((startDayMs(t) - startDayMs(shown[i - 1])) / 86400000));
        if (gapDays > 0) gapHtml = `<div class="timer-gap"><span>↳ 相隔 ${gapDays} 天</span></div>`;
      }
      /* 阴历录入的生日：附注原始农历日期 */
      const lunarTxt = (t.lcal && typeof Records !== "undefined" && Records.lunarDesc)
        ? `（农历${Records.lunarDesc({ m: t.lcal.m, d: t.lcal.d, leap: t.lcal.leap })}）` : "";
      return gapHtml + `<div class="timer-item${c.future ? " future" : ""}${c.today || c.annivToday ? " milestone" : ""}" data-id="${t.id}"
        title="${esc(`始于 ${fmtDate(t)}${lunarTxt}${durTxt ? " · " + durTxt : ""}${t.note ? "\n" + t.note : ""}${nextLine ? "\n" + nextLine.replace(/<[^>]*>/g, "") : ""}`)}">
        <div class="timer-head">
          <span class="timer-ico">${t.icon}</span>
          <b class="timer-name">${esc(t.name)}</b>
          ${curCat === "all" ? `<span class="rec-badge">${esc(catOf(t))}</span>` : ""}
          ${badge}
          <button class="rec-edit" title="修改">✎</button>
          <button class="rec-del" title="删除">✕</button>
        </div>
        <div class="timer-big"><span class="pre">${c.future ? "还有" : (c.style === "inclusive" ? "第" : "已过")}</span><span class="num">${c.big}</span><span class="unit">天</span></div>
        <div class="timer-live">${esc(c.live)}</div>
        <div class="timer-sub">始于 ${fmtDate(t)}${esc(lunarTxt)}${durTxt ? " · " + durTxt : ""}${t.note ? "<br>" + esc(t.note) : ""}</div>
        ${nextLine ? `<div class="timer-next">${nextLine}</div>` : ""}
      </div>`;
    }).join("");

    box.querySelectorAll(".timer-item").forEach((item) => {
      const rec = load().find((x) => x.id === item.dataset.id);
      if (!rec) return;
      /* 小图模式下整卡点击 = 编辑（✎ 按钮已隐藏） */
      item.onclick = (e) => {
        if (e.target.closest(".rec-del")) return;
        if (item.closest(".timer-list").classList.contains("compact")) openEdit(rec);
      };
      item.querySelector(".rec-edit").onclick = () => openEdit(rec);
      item.querySelector(".rec-del").onclick = () => {
        if (confirm(`删除纪念日「${rec.name}」吗？`)) {
          Timers.remove(rec.id);
          if (editId === rec.id) { editId = null; resetForm(); }
          render();
        }
      };
    });
    refreshRemindDot();   // 数据变化后同步顶栏红点
  }

  /* 每秒只刷新秒级行（不重建整卡） */
  function tickLive() {
    const now = new Date();
    document.querySelectorAll("#timerList .timer-item").forEach((item) => {
      const rec = load().find((x) => x.id === item.dataset.id);
      const live = item.querySelector(".timer-live");
      if (rec && live) live.textContent = calc(rec, now).live;
    });
  }

  /* ---------- 表单 ---------- */
  function renderEmojiRow() {
    $("#timerEmojiRow").innerHTML = EMOJIS.map((e) =>
      `<button type="button" class="${e === pickEmoji ? "active" : ""}" data-e="${e}">${e}</button>`).join("");
    $("#timerEmojiRow").querySelectorAll("button").forEach((b) => {
      b.onclick = () => { pickEmoji = b.dataset.e; renderEmojiRow(); };
    });
  }

  /* 分组建议列表：已有分组（含自定义）∪ 预置建议 */
  function fillCatList() {
    const groups = new Set([...load().map(catOf), ...PRESET_CATS]);
    $("#timerCatList").innerHTML = [...groups].map((c) => `<option value="${esc(c)}">`).join("");
  }

  /* 历法切换：阳历=日期选择器；阴历=年/月/日选择（保存时换算成阳历固定存储） */
  function syncCalType() {
    const lunar = $("#timerCalType").value === "lunar";
    $("#timerLunarWrap").hidden = !lunar;
    $("#timerDate").hidden = lunar;
  }

  function fillLunarSelects() {
    const months = ["正月", "二月", "三月", "四月", "五月", "六月",
      "七月", "八月", "九月", "十月", "冬月", "腊月"];
    const days = ["初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
      "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
      "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];
    $("#timerLM").innerHTML =
      months.map((t, i) => `<option value="${i + 1}">${t}</option>`).join("") +
      months.map((t, i) => `<option value="L${i + 1}">闰${t}（少见）</option>`).join("");
    $("#timerLD").innerHTML = days.map((t, i) => `<option value="${i + 1}">${t}</option>`).join("");
  }

  function openEdit(t) {
    $("#timerForm").hidden = false;
    editId = t.id;
    pickEmoji = t.icon || "💗";
    renderEmojiRow();
    $("#timerCat").value = catOf(t);
    if (t.lcal) {
      $("#timerCalType").value = "lunar";
      syncCalType();
      $("#timerLY").value = t.lcal.y;
      $("#timerLM").value = (t.lcal.leap ? "L" : "") + t.lcal.m;
      $("#timerLD").value = t.lcal.d;
    } else {
      $("#timerCalType").value = "solar";
      syncCalType();
      $("#timerDate").value = `${t.y}-${pad2(t.m)}-${pad2(t.d)}`;
    }
    $("#timerTime").value = t.time || "";
    $("#timerNote").value = t.note || "";
    $("#timerSave").textContent = "保存修改";
    $("#timerForm").scrollIntoView({ block: "nearest" });
  }

  function resetForm() {
    editId = null;
    pickEmoji = "💗";
    renderEmojiRow();
    $("#timerCat").value = PRESET_CATS[0];
    $("#timerCalType").value = "solar";
    syncCalType();
    $("#timerLY").value = "";
    $("#timerLM").value = "1";
    $("#timerLD").value = "1";
    $("#timerName").value = "";
    $("#timerDate").value = "";
    $("#timerTime").value = "";
    $("#timerNote").value = "";
    $("#timerSave").textContent = "保存纪念日";
  }

  function saveForm() {
    const name = $("#timerName").value.trim();
    if (!name) { alert("请填写名称"); return; }
    const cat = ($("#timerCat").value || "").trim().slice(0, 10) || "其他";
    const time = $("#timerTime").value || "";
    let rec = null;

    if ($("#timerCalType").value === "lunar") {
      /* 阴历：换算成对应阳历日期后固定存储 */
      const y = Number($("#timerLY").value);
      const mv = $("#timerLM").value;
      const leap = mv.startsWith("L");
      const lm = parseInt(leap ? mv.slice(1) : mv);
      const ld = Number($("#timerLD").value);
      if (!y || y < 1900 || y > 2100) { alert("请填写 1900–2100 之间的农历年份"); return; }
      if (!lm || !ld) { alert("请选择农历月、日"); return; }
      const s = solarLunar.lunar2solar(y, lm, ld, leap);
      if (s === -1) { alert(`${y} 年农历${leap ? "闰" : ""}${lm}月没有${ld === 30 ? "三十" : ld + " 日"}，请检查`); return; }
      rec = { icon: pickEmoji, cat, name, y: s.cYear, m: s.cMonth, d: s.cDay, time, lcal: { y, m: lm, d: ld, ...(leap ? { leap: true } : {}) } };
    } else {
      const dv = $("#timerDate").value;
      if (!dv) { alert("请选择开始日期"); return; }
      const [y, m, d] = dv.split("-").map(Number);
      if (!y || !m || !d) { alert("日期格式不正确"); return; }
      rec = { icon: pickEmoji, cat, name, y, m, d, time };
    }
    const note = $("#timerNote").value.trim();
    if (note) rec.note = note;

    if (editId) {
      Timers.update(editId, rec);
      resetForm();
      $("#timerForm").hidden = true;
    } else {
      Timers.add(rec);
      resetForm();
    }
    render();
  }

  /* ---------- 导入 / 导出 ---------- */
  function doExport() {
    const data = load();
    if (!data.length) { alert("还没有纪念日可以导出"); return; }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "纪念日备份.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function doImport(file) {
    try {
      const arr = JSON.parse(await file.text());
      if (!Array.isArray(arr)) throw new Error("文件格式不对（应为 JSON 数组）");
      let added = 0, skipped = 0;
      const seen = new Set(load().map((t) => `${t.name}|${t.y}-${t.m}-${t.d}|${t.time || ""}`));
      for (const raw of arr) {
        if (!raw || !raw.name || !raw.y || !raw.m || !raw.d) { skipped++; continue; }
        const key = `${String(raw.name).slice(0, 20)}|${raw.y}-${raw.m}-${raw.d}|${raw.time || ""}`;
        if (seen.has(key)) { skipped++; continue; }
        seen.add(key);
        load().push(normalize(raw, nextId()));
        added++;
      }
      if (added) save();
      render();
      alert(`成功导入 ${added} 个纪念日${skipped ? `（跳过 ${skipped} 条：重复或格式不对）` : ""}`);
    } catch (e) {
      alert("导入失败：" + String(e && e.message || e));
    }
  }

  /* ---------- 弹窗开关与秒级定时器 ---------- */
  function open() {
    ensureHolidays();          // 先补齐/清理自动节日再渲染
    $("#timerMask").hidden = false;
    render();
    if (!tickTimer) tickTimer = setInterval(tickLive, 1000);
    maybeRemind();             // 打开弹窗时顺带检查今天是否需要提醒
  }
  function close() {
    $("#timerMask").hidden = true;
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  }

  /* ---------- 小图 / 大图模式（纯展示切换，不影响数据） ---------- */
  function applyCompact() {
    $("#timerList").classList.toggle("compact", compact);
    $("#timerCompactBtn").textContent = compact ? "📋 大图模式" : "🔲 小图模式";
  }

  /* ---------- 升序 / 降序 ---------- */
  function applyOrder() {
    $("#timerOrderBtn").textContent = desc ? "⇅ 时间倒序" : "⇅ 时间正序";
  }

  /* ---------- 纪念日提醒（电脑浏览器通知） ---------- */
  /* 今天的提醒内容：纪念日满整百/520 天、周年、自动节日当天 */
  function todayEvents() {
    const now = new Date();
    const list = [];
    for (const t of load()) {
      const c = calc(t, now);
      if (c.annivToday) list.push(`${t.icon} 今天是「${t.name}」${c.next.label}`);
      else if (c.today) list.push(`${t.icon} 今天「${t.name}」满 ${c.big} 天`);
      else if (t.auto && !c.future && c.days === 0) list.push(`${t.icon} 今天是 ${t.name}`);
    }
    return list;
  }

  async function maybeRemind() {
    if (localStorage.getItem(LS_REMIND) !== "1") return;
    const now = new Date();
    const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    let done = null;
    try { done = JSON.parse(localStorage.getItem(LS_REMIND_DONE) || "null"); } catch { /* 忽略 */ }
    if (done && done.date === key) return;   // 今天已提醒过
    const list = todayEvents();
    if (!list.length) return;
    try { localStorage.setItem(LS_REMIND_DONE, JSON.stringify({ date: key })); } catch { /* 忽略 */ }
    const body = list.slice(0, 5).join("\n") + (list.length > 5 ? `\n…共 ${list.length} 条` : "");
    if (window.Notification && Notification.permission === "granted") {
      new Notification("🎂 纪念日提醒", { body });
    } else if (window.Notification && Notification.permission !== "denied") {
      const p = await Notification.requestPermission();
      if (p === "granted") new Notification("🎂 纪念日提醒", { body });
      else alert("🎂 纪念日提醒\n" + body);
    } else {
      alert("🎂 纪念日提醒\n" + body);   // 无通知能力时兜底
    }
    refreshRemindDot();
  }

  function refreshRemindDot() {
    const btn = document.getElementById("timerBtn");
    if (!btn) return;
    try { btn.classList.toggle("has-remind", todayEvents().length > 0); } catch { /* 忽略 */ }
  }

  /* ---------- 初始化 ---------- */
  function initUI() {
    ensureHolidays();          // 页面加载即清理过期/补齐自动节日
    renderEmojiRow();
    fillCatList();
    fillLunarSelects();
    applyCompact();
    applyOrder();
    $("#timerCalType").onchange = syncCalType;
    /* 纪念日提醒开关 */
    const remindBtn = $("#timerRemindBtn");
    const syncRemind = () => {
      remindBtn.textContent = localStorage.getItem(LS_REMIND) === "1" ? "🔔 提醒开" : "🔕 提醒关";
    };
    syncRemind();
    remindBtn.onclick = () => {
      const on = localStorage.getItem(LS_REMIND) === "1";
      localStorage.setItem(LS_REMIND, on ? "0" : "1");
      syncRemind();
      if (!on) maybeRemind();
    };
    /* 弹窗大小：恢复上次拖拽的尺寸；仅在真正拖拽原生手柄后记忆，
       避免打开/视口钳制/内容变化时误存 */
    const tmodal = document.querySelector("#timerMask .timer-modal");
    try {
      const saved = JSON.parse(localStorage.getItem(LS_SIZE) || "null");
      if (saved && saved.w && saved.h) {
        tmodal.style.width = saved.w + "px";
        tmodal.style.height = saved.h + "px";
      }
    } catch { /* 忽略坏数据 */ }
    tmodal.addEventListener("mousedown", (e) => {
      const r = tmodal.getBoundingClientRect();
      if (e.clientX <= r.right - 18 || e.clientY <= r.bottom - 18) return;  // 不在右下角手柄区
      const up = () => {
        document.removeEventListener("mouseup", up);
        const r2 = tmodal.getBoundingClientRect();
        if (r2.width && r2.height) {
          localStorage.setItem(LS_SIZE, JSON.stringify({ w: Math.round(r2.width), h: Math.round(r2.height) }));
        }
      };
      document.addEventListener("mouseup", up);
    });
    $("#timerCompactBtn").onclick = () => {
      compact = !compact;
      localStorage.setItem(LS_COMPACT, compact ? "1" : "0");
      applyCompact();
    };
    $("#timerOrderBtn").onclick = () => {
      desc = !desc;
      localStorage.setItem(LS_ORDER, desc ? "desc" : "asc");
      applyOrder();
      render();
    };
    $("#timerBtn").onclick = open;
    $("#timerClose").onclick = close;
    $("#timerAddToggle").onclick = () => {
      const f = $("#timerForm");
      if (!f.hidden) { f.hidden = true; resetForm(); return; }
      resetForm();
      f.hidden = false;
      $("#timerName").focus();
    };
    $("#timerSave").onclick = saveForm;
    $("#timerExportBtn").onclick = doExport;
    $("#timerImportBtn").onclick = () => $("#timerImportFile").click();
    $("#timerImportFile").onchange = (e) => {
      if (e.target.files[0]) doImport(e.target.files[0]);
      e.target.value = "";
    };
    const styleSel = $("#timerStyle");
    styleSel.value = styleOf();
    styleSel.onchange = (e) => {
      localStorage.setItem(LS_STYLE, e.target.value);
      render();
    };
    $("#timerMask").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#timerMask").hidden) close();
    });
  }

  document.addEventListener("DOMContentLoaded", initUI);

  /* 页面加载后检查一次今日提醒，之后每 30 分钟复查；🎂 按钮红点常显 */
  setTimeout(() => {
    try { ensureHolidays(); refreshRemindDot(); } catch { /* 忽略 */ }
    maybeRemind();
  }, 1500);
  setInterval(() => { try { maybeRemind(); refreshRemindDot(); } catch { /* 忽略 */ } }, 30 * 60 * 1000);

  return {
    all: () => [...load()],
    onChange: (fn) => onChangeSubs.push(fn),
    add(t) { load().push(normalize(t, nextId())); save(); },
    update(id, t) {
      const list = load();
      const idx = list.findIndex((x) => x.id === id);
      if (idx < 0) return false;
      list[idx] = normalize(t, id);
      save();
      return true;
    },
    remove(id) {
      /* 删除自动节日时记入忽略名单，避免下次自动重新生成 */
      const rec = load().find((t) => t.id === id);
      if (rec && rec.auto) {
        try {
          const off = new Set(JSON.parse(localStorage.getItem(LS_HOL_OFF) || "[]"));
          off.add(rec.name);
          localStorage.setItem(LS_HOL_OFF, JSON.stringify([...off]));
        } catch { /* 忽略 */ }
      }
      cache = load().filter((t) => t.id !== id);
      save();
    },
    /* 万年历联动：某天起始的纪念日 */
    getFor(y, m, d) {
      return load().filter((t) => t.y === y && t.m === m && t.d === d);
    },
    open, close,
    /* 供控制台/自动化测试调用 */
    _test: { render, saveForm, calc, todayEvents }
  };
})();

/* 挂到 window：跨模块订阅纪念日数据变化（万年历圆点/详情刷新） */
window.Timers = Timers;
