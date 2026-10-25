/* ============================================================
 * 顶栏图标自定义排序：按住拖动即可调整顺序，顺序自动记住。
 * 存储：localStorage["nav_header_order"] = [按钮id, …]
 * 说明：HTML5 拖拽（桌面）；拖动时按钮变半透明并显示插入位置。
 * ============================================================ */
"use strict";

(() => {
  const KEY = "nav_header_order";
  const read = () => {
    try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; }
    catch { return []; }
  };
  const saveOrder = (ids) => {
    try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* 忽略 */ }
  };

  function applySaved(box) {
    const order = read();
    if (!order.length) return;
    for (const id of order) {
      const el = document.getElementById(id);
      if (el && el.parentElement === box) box.appendChild(el);   // 依次追加 = 排成保存的顺序
    }
  }

  function enableDrag(box) {
    let dragEl = null;
    box.addEventListener("dragstart", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      dragEl = b;
      b.classList.add("dragging");
      try { e.dataTransfer.setData("text/plain", b.id); } catch { /* 合成事件无 dataTransfer */ }
      try { e.dataTransfer.effectAllowed = "move"; } catch { /* 忽略 */ }
    });
    box.addEventListener("dragend", () => {
      if (dragEl) dragEl.classList.remove("dragging");
      dragEl = null;
      saveOrder([...box.children].map((c) => c.id).filter(Boolean));
    });
    box.addEventListener("dragover", (e) => {
      if (!dragEl) return;
      e.preventDefault();
      try { e.dataTransfer.dropEffect = "move"; } catch { /* 忽略 */ }
      const others = [...box.children].filter((c) => c !== dragEl && c.tagName === "BUTTON");
      let ref = null;
      for (const c of others) {
        const r = c.getBoundingClientRect();
        if (e.clientX < r.left + r.width / 2) { ref = c; break; }
      }
      if (ref) box.insertBefore(dragEl, ref);
      else box.appendChild(dragEl);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const box = document.getElementById("headerActions");
    if (!box) return;
    applySaved(box);
    enableDrag(box);
    box.querySelectorAll("button").forEach((b) => { b.draggable = true; });
  });
})();
