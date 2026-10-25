/* ============================================================
 * 壁纸中心 · 动态/静态壁纸设置与应用
 * 存储：设置在 localStorage["nav_wallpaper"]；
 *       本地图片/视频文件存 IndexedDB["nav_wallpaper_db"]（刷新不丢）
 * 依赖：app.js 的 $ 与 store
 * ============================================================ */
"use strict";

(() => {
  const LS_WP = "nav_wallpaper";
  const DB_NAME = "nav_wallpaper_db";

  const $ = (sel) => document.querySelector(sel);
  const DEFAULTS = {
    mode: "none", grad: 1, dim: 0.35, url: "",
    gradColors: ["#3b6cff", "#22c3ee", "#7c4dff"]
  };

  let settings = { ...DEFAULTS, ...safeGet() };
  let objectUrl = null;     // 当前 IDB 文件的 objectURL
  let pendingFile = null;   // 面板里新选的文件（保存时写入 IDB）

  function safeGet() {
    try { return JSON.parse(localStorage.getItem(LS_WP)) || {}; }
    catch { return {}; }
  }
  const save = () => localStorage.setItem(LS_WP, JSON.stringify(settings));

  /* ---------- IndexedDB ---------- */
  function idbOpen() {
    return new Promise((res, rej) => {
      const rq = indexedDB.open(DB_NAME, 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore("files");
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
  }
  const idbPut = (blob) => idbOpen().then((db) => new Promise((res, rej) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").put(blob, "current");
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  }));
  const idbGet = () => idbOpen().then((db) => new Promise((res, rej) => {
    const rq = db.transaction("files").objectStore("files").get("current");
    rq.onsuccess = () => res(rq.result || null); rq.onerror = () => rej(rq.error);
  }));
  const idbDel = () => idbOpen().then((db) => new Promise((res) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").delete("current"); tx.oncomplete = res;
  }));

  /* ---------- 应用壁纸 ---------- */
  function apply() {
    const layer = $("#wallpaperLayer");
    if (!layer) return;
    layer.className = "wallpaper-layer";
    layer.innerHTML = "";
    document.body.classList.toggle("has-wallpaper", settings.mode !== "none");
    layer.style.setProperty("--wp-dim", settings.dim ?? 0.35);

    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }

    if (settings.mode === "grad") {
      if (settings.grad === "custom") {
        const cs = settings.gradColors || DEFAULTS.gradColors;
        layer.style.setProperty("--wp-c1", cs[0] || "#3b6cff");
        layer.style.setProperty("--wp-c2", cs[1] || "#22c3ee");
        layer.style.setProperty("--wp-c3", cs[2] || "#7c4dff");
        layer.classList.add("wp-gradient", "wp-grad-custom");
      } else {
        layer.classList.add("wp-gradient", `wp-grad-${settings.grad || 1}`);
      }
    } else if (settings.mode === "imgfile" || settings.mode === "vidfile") {
      idbGet().then((blob) => {
        if (!blob) return;
        objectUrl = URL.createObjectURL(blob);
        mountMedia(settings.mode === "vidfile" ? "video" : "img", objectUrl);
        layer.classList.add("has-media");
      }).catch(() => {});
    } else if (settings.mode === "imgurl" || settings.mode === "vidurl") {
      mountMedia(settings.mode === "vidurl" ? "video" : "img", settings.url);
      layer.classList.add("has-media");
    }
  }

  function mountMedia(kind, src) {
    const layer = $("#wallpaperLayer");
    if (kind === "video") {
      const v = document.createElement("video");
      v.src = src; v.autoplay = true; v.muted = true; v.loop = true;
      v.playsInline = true; v.className = "wp-media";
      v.onerror = () => v.remove();
      layer.appendChild(v);
    } else {
      const i = document.createElement("img");
      i.src = src; i.className = "wp-media"; i.alt = "";
      i.onerror = () => i.remove();
      layer.appendChild(i);
    }
  }

  /* ---------- 面板 ---------- */
  function syncPanel() {
    $("#wpSource").value = settings.mode;
    $("#wpDim").value = Math.round((settings.dim ?? 0.35) * 100);
    $("#wpDimVal").textContent = Math.round((settings.dim ?? 0.35) * 100) + "%";
    $("#wpURLRow").hidden = !(settings.mode === "imgurl" || settings.mode === "vidurl");
    $("#wpFileRow").hidden = !(settings.mode === "imgfile" || settings.mode === "vidfile");
    $("#wpURL").placeholder = settings.mode === "vidurl" ? "视频地址（mp4/webm）" : "图片地址（https://…）";
    /* 渐变色：色卡选中态 + 自定义取色器（被并行编辑覆盖后补回） */
    $("#wpGradRow").hidden = settings.mode !== "grad";
    const cs = settings.gradColors || DEFAULTS.gradColors;
    $("#wpC1").value = cs[0]; $("#wpC2").value = cs[1]; $("#wpC3").value = cs[2];
    document.querySelectorAll(".wp-swatch").forEach((b) => {
      b.classList.toggle("active", String(settings.grad) === b.dataset.g);
    });
    $("#wpGradRow .wp-cs").classList.toggle("custom", settings.grad === "custom");
  }

  function saveSettings() {
    const mode = $("#wpSource").value;
    settings.mode = mode;
    settings.dim = Number($("#wpDim").value) / 100;
    settings.url = $("#wpURL").value.trim();
    save();
    apply();
  }

  /* ---------- 初始化 ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    apply();

    $("#wpBtn").onclick = () => {
      syncPanel();
      $("#wpMask").hidden = false;
    };
    $("#wpClose").onclick = () => { $("#wpMask").hidden = true; };
    $("#wpMask").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) $("#wpMask").hidden = true;
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#wpMask").hidden) $("#wpMask").hidden = true;
    });

    /* 所有改动即时生效并立即保存（「应用壁纸」仅剩文件/URL 确认用途） */
    const liveSave = () => { save(); apply(); };
    $("#wpSource").onchange = () => { settings.mode = $("#wpSource").value; syncPanel(); liveSave(); };
    $("#wpPickImg").onclick = () => $("#wpImgFile").click();
    $("#wpPickVid").onclick = () => $("#wpVidFile").click();
    $("#wpImgFile").onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      pendingFile = f;
      settings.mode = "imgfile";
      $("#wpSource").value = "imgfile";
      syncPanel();
      $("#wpFileName").textContent = f.name + "（点「应用」生效）";
      e.target.value = "";
    };
    $("#wpVidFile").onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      pendingFile = f;
      settings.mode = "vidfile";
      $("#wpSource").value = "vidfile";
      syncPanel();
      $("#wpFileName").textContent = f.name + "（点「应用」生效）";
      e.target.value = "";
    };
    $("#wpURL").oninput = () => {
      settings.mode = $("#wpSource").value === "vidurl" ? "vidurl" : "imgurl";
      settings.url = $("#wpURL").value.trim();
    };
    $("#wpURL").onchange = () => { if (settings.url) liveSave(); };
    $("#wpDim").oninput = () => {
      const v = Number($("#wpDim").value);
      $("#wpDimVal").textContent = v + "%";
      settings.dim = v / 100;
      $("#wallpaperLayer").style.setProperty("--wp-dim", settings.dim);
    };
    $("#wpDim").onchange = () => save();
    /* 渐变色卡与自定义取色：即时预览，松手即保存 */
    document.querySelectorAll(".wp-swatch").forEach((b) => {
      b.onclick = () => {
        settings.grad = Number(b.dataset.g);
        settings.mode = "grad";
        $("#wpSource").value = "grad";
        syncPanel();
        liveSave();
      };
    });
    [["wpC1", 0], ["wpC2", 1], ["wpC3", 2]].forEach(([id, i]) => {
      $("#" + id).oninput = () => {
        settings.mode = "grad";
        settings.grad = "custom";
        settings.gradColors = [...(settings.gradColors || DEFAULTS.gradColors)];
        settings.gradColors[i] = $("#" + id).value;
        $("#wpSource").value = "grad";
        syncPanel();
        apply();
      };
      $("#" + id).onchange = () => save();
    });
    $("#wpApply").onclick = async () => {
      try {
        if (pendingFile && (settings.mode === "imgfile" || settings.mode === "vidfile")) {
          await idbPut(pendingFile);
          pendingFile = null;
        }
        saveSettings();
        $("#wpFileName").textContent = "";
        $("#wpApplyOk").textContent = "已应用 ✓";
        setTimeout(() => { $("#wpApplyOk").textContent = ""; }, 1500);
      } catch (e) {
        alert("应用失败：" + e.message);
      }
    };
    $("#wpClear").onclick = () => {
      settings = { ...DEFAULTS };
      pendingFile = null;
      save();
      idbDel().catch(() => {});
      syncPanel();
      apply();
    };
  });
})();
