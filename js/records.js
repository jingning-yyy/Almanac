/* ============================================================
 * 生日与记录 · 数据管理
 * 记录类型：
 *   birthday 生日   / anniversary 纪念日 / note 提醒
 * 日期类型：
 *   cal:"solar" 公历·每年重复 {m,d,y?}（y=出生年，用于显示年龄）
 *   cal:"lunar" 农历·每年重复 {m,d,leap}
 *   cal:"once"  仅某一天        {y,m,d}
 * 存储在 localStorage["nav_records"]
 * 依赖：js/solarlunar.js（农历匹配）、app.js 的 $ 助手
 * ============================================================ */
"use strict";

const Records = (() => {
  const LS_KEY = "nav_records";
  const KIND_META = {
    birthday: { icon: "🎂", label: "生日", color: "#e89a3c" },
    anniversary: { icon: "💝", label: "纪念日", color: "#e15b8f" },
    note: { icon: "📌", label: "提醒", color: "#3b6cff" }
  };
  const onChangeSubs = [];
  let cache = null;

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

  const startOfDay = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const addDays = (dt, n) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + n);

  let seq = 0;
  const nextId = () => Date.now() + "" + (seq++);

  /* 把外部传入的记录规范化为存储结构 */
  function normalize(r, id) {
    const entry = {
      id,
      name: String(r.name).slice(0, 20),
      kind: ["birthday", "anniversary", "note"].includes(r.kind) ? r.kind : "note",
      cal: r.cal, m: Number(r.m), d: Number(r.d)
    };
    if (r.cal === "once") entry.y = Number(r.y);
    else if (r.y) entry.y = Number(r.y);
    if (r.cal === "lunar" && r.leap) entry.leap = true;
    if (r.note) entry.note = String(r.note).slice(0, 30);
    return entry;
  }

  /* 某条记录是否落在指定日期（sl 为该日的 solar2lunar 结果） */
  function matchDay(r, y, m, d, sl) {
    if (r.cal === "once") return r.y === y && r.m === m && r.d === d;
    if (r.cal === "solar") return sl.cMonth === r.m && sl.cDay === r.d;
    /* lunar：注意闰月标记必须一致 */
    return sl.lMonth === r.m && sl.lDay === r.d && !!sl.isLeap === !!r.leap;
  }

  function lunarDesc(r) {
    const months = ["正月", "二月", "三月", "四月", "五月", "六月",
      "七月", "八月", "九月", "十月", "冬月", "腊月"];
    const days = [];
    for (let i = 1; i <= 10; i++) days.push("初" + "一二三四五六七八九十"[i - 1]);
    days.push("十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
      "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十");
    return (r.leap ? "闰" : "") + months[r.m - 1] + days[r.d - 1];
  }

  function recordDesc(r) {
    if (r.cal === "once") return `${r.y}年${r.m}月${r.d}日`;
    const base = r.cal === "lunar" ? "农历" + lunarDesc(r) : `${r.m}月${r.d}日`;
    return r.y ? `${base}（${r.y}）` : base;
  }

  /* ---------- 公开 API ---------- */
  const api = {
    KIND_META,
    all: () => [...load()],
    onChange: (fn) => onChangeSubs.push(fn),
    lunarDesc,
    recordDesc,

    getFor(y, m, d, sl) {
      return load().filter((r) => matchDay(r, y, m, d, sl));
    },

    add(r) { load().push(normalize(r, nextId())); save(); },

    /* 修改已有一条记录（保留 id） */
    update(id, rec) {
      const list = load();
      const idx = list.findIndex((x) => x.id === id);
      if (idx < 0) return false;
      list[idx] = normalize(rec, id);
      save();
      return true;
    },

    /* 农历↔公历互转：按出生年份换算成另一历法的固定日期。
       无法换算（无出生年份、闰月/卅十在当年不存在等）返回 { ok:false, reason } */
    convertCal(r) {
      if (r.cal === "once") return { ok: false, reason: "单次提醒没有历法属性，无需转换" };
      if (!r.y || r.y < 1900 || r.y > 2100) {
        return { ok: false, reason: `「${r.name}」没有出生年份，无法在农历/公历间换算。可点 ✎ 修改补上出生年份后再试` };
      }
      if (r.cal === "lunar") {
        const s = solarLunar.lunar2solar(r.y, r.m, r.d, !!r.leap);
        if (s === -1) {
          return { ok: false, reason: `${r.y}年农历${r.leap ? "闰" : ""}${r.m}月没有「${r.d}日」这一天，无法换算` };
        }
        return { ok: true, rec: { ...r, cal: "solar", m: s.cMonth, d: s.cDay, y: s.cYear } };
      }
      const l = solarLunar.solar2lunar(r.y, r.m, r.d);
      if (l === -1) return { ok: false, reason: "日期超出支持范围（1900-2100）" };
      return { ok: true, rec: { ...r, cal: "lunar", m: l.lMonth, d: l.lDay, ...(l.isLeap ? { leap: true } : {}) } };
    },

    remove(id) {
      cache = load().filter((r) => r.id !== id);
      save();
    },

    addMany(list) {
      const seen = new Set(load().map((r) => `${r.name}|${r.cal}|${r.m}|${r.d}|${r.y || ""}`));
      let added = 0, skipped = 0;
      for (const r of list) {
        const key = `${r.name}|${r.cal}|${r.m}|${r.d}|${r.y || ""}`;
        if (seen.has(key)) { skipped++; continue; }
        seen.add(key);
        load().push({
          id: Date.now() + "" + Math.floor(Math.random() * 1000) + added,
          name: r.name, kind: r.kind, cal: r.cal, m: r.m, d: r.d,
          ...(r.cal === "once" ? { y: r.y } : (r.y ? { y: r.y } : {})),
          ...(r.cal === "lunar" && r.leap ? { leap: true } : {}),
          ...(r.note ? { note: r.note } : {})
        });
        added++;
      }
      if (added) save();
      return { added, skipped };
    },

    /* 未来 days 天内的下一次发生日期（覆盖全部记录，按天数排序） */
    upcoming() {
      const recs = load();
      const out = [];
      const today = startOfDay(new Date());
      for (let off = 0; off <= 400; off++) {
        const dt = addDays(today, off);
        const sl = solarLunar.solar2lunar(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
        if (sl === -1) break;
        for (const r of recs) {
          if (out.find((o) => o.r.id === r.id)) continue;
          if (matchDay(r, dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), sl)) {
            out.push({ r, off, dt, sl });
          }
        }
        if (out.length === recs.length) break;
      }
      return out.sort((a, b) => a.off - b.off);
    },

    /* ---------- 导入：解析行数组 → 记录数组 ---------- */
    parseRows(rows) {
      const DATE_FULL = /^(\d{4})[年\/\-\.](\d{1,2})[月\/\-\.](\d{1,2})[日]?$/;
      const DATE_MD = /^(\d{1,2})[月\/\-](\d{1,2})[日]?$/;
      const DATE_Y_M = /^(\d{4})[年\/\-\.](\d{1,2})$/;
      const HEADER_WORDS = /姓名|名字|昵称|生日|日期|类型|分组|组别|备注|说明|手机|电话|联系|号码|性别|标签|阳历|公历|农历|阴历|^日$|^月$|^年$/;
      const out = [];

      for (const rawRow of rows) {
        const row = (rawRow || []).map((c) => String(c ?? "").trim());
        if (!row.some(Boolean)) continue;

        let name = null, birth = null, lunarFlag = false, note = "";
        let isHeader = false;

        for (const cell of row) {
          if (!cell) continue;
            /* 农历标记：整格或格内带"(农历)"等 */
          if (/农历|阴历|lunar/i.test(cell)) {
            /* "1990-8-15(农历)" 这类：先抽日期再看是否还有别的 */
            const dm = cell.match(DATE_FULL);
            if (dm) { birth = dm; lunarFlag = true; continue; }
            if (/^[\(（]?(农历|阴历|lunar)[\)）]?$|^(农历|阴历)$/i.test(cell)) { lunarFlag = true; continue; }
            lunarFlag = true;
            continue;
          }
          if (/公历|阳历|solar/i.test(cell) && !/\d{4}/.test(cell)) continue;
          if (HEADER_WORDS.test(cell) && !/\d/.test(cell)) { isHeader = true; continue; }

          const dm = cell.match(DATE_FULL) || cell.match(DATE_MD) || cell.match(DATE_Y_M);
          if (dm && !birth) { birth = dm; continue; }
          if (!birth && /^\d{5}$/.test(cell)) continue; /* Excel 序列号误入 */

          if (!name && /[A-Za-z\u4e00-\u9fa5·]/.test(cell) && cell.length <= 12 && !/^\d+$/.test(cell)) {
            name = cell;
            continue;
          }
          if (!note) note = cell;
        }

        if (!birth) continue;
        if (!name && isHeader) continue;

        let y = null, m = null, d = null;
        if (birth.length === 4) { y = +birth[1]; m = +birth[2]; d = +birth[3]; }
        else if (birth.length === 3) { m = +birth[1]; d = +birth[2]; }
        else { y = +birth[1]; m = +birth[2]; } /* 只有年月：视为 1 日 */
        if (!m || m < 1 || m > 12 || !d || d < 1 || d > 31) continue;

        out.push({
          name: name || "未命名",
          kind: "birthday",
          cal: lunarFlag ? "lunar" : "solar",
          m, d, ...(y && y > 1900 && y <= new Date().getFullYear() ? { y } : {})
        });
      }
      return out;
    }
  };
  return api;
})();
