/* ============================================================
 * 新版本检测：页面打开时对比线上 version.json 与本页内置版本号，
 * 线上更新 → 顶部弹"发现新版本"提示条，点击刷新即加载最新。
 * 仅线上（http/https）生效；本地 file:// 打开自动跳过。
 *
 * 发新版本时三处同步 +1（见 README「分发与更新」）：
 *   1) index.html 里所有 ?v=N
 *   2) 本文件的 APP_VER
 *   3) version.json 的 {"v": N}
 * ============================================================ */
(() => {
  const APP_VER = 1.0;
  if (!/^https?:/.test(location.protocol)) return;   // file:// 本地打开不检测
  fetch("version.json?ts=" + Date.now())
    .then((r) => r.json())
    .then((j) => {
      if (!j || !(j.v > APP_VER)) return;            // 已是最新（或服务器版本异常）
      const bar = document.createElement("div");
      bar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:999;" +
        "display:flex;gap:12px;justify-content:center;align-items:center;" +
        "background:linear-gradient(135deg,#3b6cff,#22c3ee);color:#fff;" +
        "padding:9px 12px;font-size:13px;box-shadow:0 4px 14px rgba(0,0,0,.2);";
      const txt = document.createElement("span");
      txt.textContent = `🎉 发现新版本 v${j.v}（当前 v${APP_VER}）`;
      const btn = document.createElement("button");
      btn.textContent = "立即刷新";
      btn.style.cssText = "border:none;border-radius:999px;padding:5px 14px;" +
        "cursor:pointer;font-size:12.5px;font-weight:600;background:#fff;color:#3b6cff;";
      btn.onclick = () => location.reload();
      bar.appendChild(txt);
      bar.appendChild(btn);
      document.body.appendChild(bar);
    })
    .catch(() => { /* 线下打开或网络异常：静默跳过 */ });
})();
