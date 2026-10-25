/* ============================================================
 * 番茄钟集成：把 TomatoClock（tomato/ 子目录的独立子应用）
 * 以 iframe 内嵌进本页弹窗。番茄钟自身数据仍存它的
 * localStorage（键 pomodoro.v1），与本页数据互不干扰。
 *
 * 两个入口：
 *   顶栏 🍅 按钮            → 打开番茄钟（计时视图）
 *   万年历「🌳 种树 · 森林」 → 打开并直达「我的森林」（#forest）
 * ============================================================ */
(() => {
  /* 与 index.html 里 css/js 的 ?v=N 保持一致，用于刷新 iframe 缓存 */
  const TOMATO_VER = 1.0;
  const SRC = `tomato/index.html?v=${TOMATO_VER}`;

  let loaded = false;   // iframe 是否已加载过内容（about:blank 时为 false）

  function openTomato(hash) {
    const frame = document.getElementById("tomatoFrame");
    /* 每次都重设 src：一是带上锚点参数，二是番茄钟基于时间戳计时，
       重新加载即可恢复状态，不会有"后台暂停"问题 */
    frame.src = SRC + (hash ? "#" + hash : "");
    loaded = true;
    document.getElementById("tomatoMask").hidden = false;
  }
  /* 供 calendar.js 等调用（#forest?d=YYYY-MM-DD 直达某天的森林） */
  window.__OPEN_TOMATO = openTomato;

  function closeTomato() {
    document.getElementById("tomatoMask").hidden = true;
    const frame = document.getElementById("tomatoFrame");
    /* 置回 about:blank，停掉番茄钟的计时循环 / 提示音，避免关掉弹窗还在响 */
    if (loaded) { frame.src = "about:blank"; loaded = false; }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const mask = document.getElementById("tomatoMask");
    const frame = document.getElementById("tomatoFrame");

    /* 顶栏 🍅：打开番茄钟 */
    document.getElementById("tomatoBtn").onclick = () => openTomato("");

    /* 万年历里的种树入口（v67 起按钮已移除，保留兼容） */
    const forestEntry = document.getElementById("calForestBtn");
    if (forestEntry) forestEntry.onclick = () => {
      document.getElementById("calMask").hidden = true;
      openTomato("forest");
    };

    document.getElementById("tomatoClose").onclick = closeTomato;
    mask.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeTomato();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !mask.hidden) closeTomato();
    });

    /* 加载完把焦点交给 iframe，键盘快捷键（空格 / R / S）立即可用 */
    frame.addEventListener("load", () => {
      if (loaded) {
        try { frame.contentWindow.focus(); } catch (err) { /* 跨域时忽略 */ }
      }
    });
  });
})();
