/* ============================================================
 * 新版本检测：页面打开时对比线上 version.json 与本页内置版本号，
 * 线上更新 → 顶部弹"发现新版本"提示条，点击刷新即加载最新。
 * 仅线上（http/https）生效；本地 file:// 打开自动跳过。
 *
 * 版本号唯一常量在 index.html 头部（window.APP_VERSION），
 * 发新版本只改两处：
 *   1) index.html：头部 APP_VERSION + 全部 ?v= 参数（全局替换一次）
 *   2) version.json 的 "v"
 * 番茄钟等子模块自动跟随 window.APP_VERSION，无需单独改。
 * ============================================================ */
(() => {
  const APP_VER = window.APP_VERSION;
  if (!APP_VER) return;
  if (!/^https?:/.test(location.protocol)) return;   // file:// 本地打开不检测

  /* 逐段数值比较："1.10" > "1.9"、"2.0" > "1.9" 均正确 */
  const cmpVer = (a, b) => {
    const pa = String(a).split(".");
    const pb = String(b).split(".");
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const d = (parseInt(pa[i], 10) || 0) - (parseInt(pb[i], 10) || 0);
      if (d) return d;
    }
    return 0;
  };

  fetch("version.json?ts=" + Date.now())
    .then((r) => r.json())
    .then((j) => {
      if (!j || !(cmpVer(j.v, APP_VER) > 0)) return;  // 已是最新（或服务器版本异常）
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
