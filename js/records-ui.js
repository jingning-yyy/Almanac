/* ============================================================
 * 生日与记录 · 面板 UI（列表 / 添加修改 / 导入导出）
 * 依赖：records.js（数据）、solarlunar.js、app.js 的 $ 助手
 * ============================================================ */
"use strict";

(() => {
  const recEsc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  let editId = null;   // 当前正在修改的记录 id（null = 新增模式）
  const pad2 = (n) => String(n).padStart(2, "0");

  /* ---------- XLSX 组件懒加载（仅导入 .xlsx 时） ---------- */
  let xlsxPromise = null;
  function ensureXLSX() {
    if (window.XLSX) return Promise.resolve();
    if (!xlsxPromise) {
      xlsxPromise = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "js/vendor/xlsx.full.min.js";
        s.onload = resolve;
        s.onerror = () => { xlsxPromise = null; reject(); };
        document.head.appendChild(s);
      });
    }
    return xlsxPromise;
  }

  /* ---------- 文件读取 ---------- */
  async function decodeSmart(buf) {
    try { return new TextDecoder("utf-8", { fatal: true }).decode(buf); }
    catch {
      try { return new TextDecoder("gb18030").decode(buf); }
      catch { return new TextDecoder("utf-8").decode(buf); }
    }
  }

  /* 单行 CSV 解析（支持引号内逗号） */
  function parseCSVLine(line) {
    const out = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else inQ = false;
        } else cur += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === "," || ch === "\t") { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  }

  async function fileToRows(file) {
    const buf = await file.arrayBuffer();
    if (/\.xlsx$|\.xls$/i.test(file.name)) {
      await ensureXLSX();
      const wb = window.XLSX.read(new Uint8Array(buf), { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      return window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: "yyyy-mm-dd" });
    }
    const text = await decodeSmart(buf);
    return text.split(/\r?\n/).filter(Boolean).map(parseCSVLine);
  }

  /* ---------- 列表渲染 ---------- */
  function renderList() {
    const box = $("#recList");
    const items = Records.upcoming();
    if (!items.length) {
      box.innerHTML = '<div class="rec-empty">还没有记录。<br>点「＋ 添加记录」，或把生日管家导出的文件拖进「导入」。</div>';
      return;
    }
    box.innerHTML = items.map(({ r, off, dt }) => {
      const meta = Records.KIND_META[r.kind] || Records.KIND_META.note;
      const badge = off === 0 ? '<span class="rec-badge today">今天</span>'
        : off === 1 ? '<span class="rec-badge soon">明天</span>'
        : `<span class="rec-badge">还有${off}天</span>`;
      let age = "";
      if (r.kind === "birthday" && r.y && r.y > 1900) {
        age = ` · 满${dt.getFullYear() - r.y}岁`;
      }
      return `<div class="rec-item" data-id="${r.id}">
        <span class="rec-ico" style="color:${meta.color}">${meta.icon}</span>
        <div class="rec-main">
          <div class="rec-name">${recEsc(r.name)}${badge}</div>
          <div class="rec-sub">${recEsc(Records.recordDesc(r))}${age}${r.note ? " · " + recEsc(r.note) : ""}</div>
        </div>
        ${r.cal !== "once" ? '<button class="rec-cvt" title="农历/公历互转（按出生年份换算）">⇄</button>' : ""}
        <button class="rec-edit" title="修改">✎</button>
        <button class="rec-del" title="删除">✕</button>
      </div>`;
    }).join("");

    box.querySelectorAll(".rec-item").forEach((item) => {
      const rec = Records.all().find((x) => x.id === item.dataset.id);
      if (!rec) return;
      item.querySelector(".rec-edit").onclick = () => openEdit(rec);
      const cvt = item.querySelector(".rec-cvt");
      if (cvt) {
        cvt.onclick = () => {
          const res = Records.convertCal(rec);
          if (!res.ok) { alert(res.reason); return; }
          const to = res.rec.cal === "solar" ? "公历" : "农历";
          if (confirm(`将「${rec.name}」的生日切换为${to}日期？\n\n换算结果：每年 ${Records.recordDesc(res.rec)}\n\n（切换后每年按${to}日期提醒，可再次点 ⇄ 切回）`)) {
            Records.update(rec.id, res.rec);
            renderList();
          }
        };
      }
      item.querySelector(".rec-del").onclick = () => {
        if (confirm(`删除「${rec.name}」的这条记录吗？`)) {
          Records.remove(rec.id);
          if (editId === rec.id) { editId = null; resetForm(); }
          renderList();
        }
      };
    });
  }

  /* ---------- 表单 ---------- */
  function openEdit(rec) {
    const p = $("#recPanel");
    if (p.hidden) { p.hidden = false; renderList(); }
    $("#recForm").hidden = false;
    editId = rec.id;
    $("#recName").value = rec.name;
    $("#recKind").value = rec.kind;
    $("#recMode").value = rec.cal;
    syncMode();
    if (rec.cal === "solar") {
      $("#recSM").value = rec.m;
      $("#recSD").value = rec.d;
    } else if (rec.cal === "lunar") {
      $("#recLM").value = (rec.leap ? "L" : "") + rec.m;
      $("#recLD").value = rec.d;
    } else {
      $("#recOnceDate").value = `${rec.y}-${pad2(rec.m)}-${pad2(rec.d)}`;
    }
    $("#recYear").value = rec.y || "";
    $("#recNote").value = rec.note || "";
    $("#recSave").textContent = "保存修改";
    $("#recForm").scrollIntoView({ block: "nearest" });
  }

  function syncMode() {
    const mode = $("#recMode").value;
    $("#recSolarWrap").hidden = mode !== "solar";
    $("#recLunarWrap").hidden = mode !== "lunar";
    $("#recOnceWrap").hidden = mode !== "once";
    /* 出生年份仅生日需要（显示年龄用） */
    $("#recYearWrap").hidden = mode === "once" || $("#recKind").value !== "birthday";
  }

  function saveForm() {
    const name = $("#recName").value.trim();
    if (!name) { alert("请填写名称"); return; }
    const kind = $("#recKind").value;
    const mode = $("#recMode").value;
    let rec = null;

    if (mode === "solar") {
      const m = Number($("#recSM").value);
      const d = Number($("#recSD").value);
      if (!m || !d) { alert("请选择月、日"); return; }
      rec = { name, kind, cal: "solar", m, d };
    } else if (mode === "lunar") {
      const mv = $("#recLM").value;
      const leap = mv.startsWith("L");
      rec = {
        name, kind, cal: "lunar",
        m: parseInt(leap ? mv.slice(1) : mv), d: Number($("#recLD").value),
        ...(leap ? { leap: true } : {})
      };
    } else {
      const v = $("#recOnceDate").value;
      if (!v) { alert("请选择日期"); return; }
      const [y, m, d] = v.split("-").map(Number);
      rec = { name, kind, cal: "once", y, m, d };
    }

    /* 出生年份（仅生日显示年龄用） */
    if (mode !== "once" && kind === "birthday") {
      const yv = Number($("#recYear").value);
      if (yv >= 1900 && yv <= 2100) rec.y = yv;
    }

    const note = $("#recNote").value.trim();
    if (note) rec.note = note;

    if (editId) {
      Records.update(editId, rec);
      editId = null;
      $("#recForm").hidden = true;
      $("#recSave").textContent = "保存";
    } else {
      Records.add(rec);
      $("#recName").value = "";
      $("#recNote").value = "";
    }
    renderList();
  }

  /* ---------- 导入 / 导出 ---------- */
  async function doImport(file) {
    try {
      const rows = await fileToRows(file);
      const parsed = Records.parseRows(rows);
      if (!parsed.length) {
        alert("没有识别到生日数据。\n请确认文件里有「姓名」和「生日」两列，日期形如 1990-08-15 或 8月15日；农历生日请带「农历」标记。");
        return;
      }
      const { added, skipped } = Records.addMany(parsed);
      renderList();
      alert(`成功导入 ${added} 条记录${skipped ? `（跳过重复 ${skipped} 条）` : ""}`);
    } catch (e) {
      alert("导入失败：" + (String(e && e.message || e)) + "\n若为 Excel 文件，请确认网络正常后重试，或将文件另存为 CSV 再导入。");
    }
  }

  function doExport() {
    const data = Records.all();
    if (!data.length) { alert("还没有记录可以导出"); return; }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "生日与记录备份.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ---------- 下拉填充 ---------- */
  function fillDateSelects() {
    const months = ["正月", "二月", "三月", "四月", "五月", "六月",
      "七月", "八月", "九月", "十月", "冬月", "腊月"];
    const days = ["初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
      "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
      "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];
    $("#recLM").innerHTML =
      months.map((t, i) => `<option value="${i + 1}">${t}</option>`).join("") +
      months.map((t, i) => `<option value="L${i + 1}">闰${t}（少见）</option>`).join("");
    $("#recLD").innerHTML = days.map((t, i) => `<option value="${i + 1}">${t}</option>`).join("");
    $("#recSM").innerHTML = months.map((t, i) => `<option value="${i + 1}">${i + 1}月</option>`).join("");
    $("#recSD").innerHTML = days.map((t, i) => `<option value="${i + 1}">${i + 1}日</option>`).join("");
  }

  /* ---------- 初始化 ---------- */
  function initUI() {
    fillDateSelects();

    $("#recToggle").onclick = () => {
      const p = $("#recPanel");
      p.hidden = !p.hidden;
      if (!p.hidden) renderList();
    };
    $("#recAddToggle").onclick = () => {
      const p = $("#recPanel");
      if (p.hidden) { p.hidden = false; renderList(); }
      if (!$("#recForm").hidden) { resetForm(); }
      $("#recForm").hidden = !$("#recForm").hidden;
      if (!$("#recForm").hidden) $("#recName").focus();
    };
    $("#recMode").onchange = syncMode;
    $("#recKind").onchange = syncMode;
    $("#recSave").onclick = saveForm;
    $("#recImportBtn").onclick = () => $("#recImportFile").click();
    $("#recImportFile").onchange = (e) => {
      if (e.target.files[0]) doImport(e.target.files[0]);
      e.target.value = "";
    };
    $("#recExportBtn").onclick = doExport;

    Records.onChange(renderList);
    syncMode();
  }

  function resetForm() {
    editId = null;
    $("#recName").value = "";
    $("#recKind").value = "birthday";
    $("#recMode").value = "solar";
    $("#recYear").value = "";
    $("#recNote").value = "";
    $("#recSave").textContent = "保存";
    syncMode();
  }

  /* ---------- XLSX 后备：见上方 ensureXLSX ---------- */

  document.addEventListener("DOMContentLoaded", initUI);

  /* 供控制台/自动化测试调用 */
  window.RecordsUI = { importFile: doImport, renderList, openEdit };
})();
