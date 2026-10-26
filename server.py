#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
星历 Almanac · 本地数据服务器（v2）
原则：默认身份的数据只存浏览器；登录账号的数据以磁盘 JSON 为唯一权威，
     浏览器里的 localStorage 只是运行缓存。
  <数据目录>/accounts.json   账号表 {用户名: 密码哈希}
  <数据目录>/current.json    当前身份（空 = 默认身份）
  <数据目录>/<用户名>.json   账号数据包 {savedAt, data:{localStorage键: 值}}
数据目录默认为应用目录下的 data/；在页面"账号 → 数据位置"里可改到任意
文件夹（记录在应用根下 config.json，每次请求重新读取，改完立即生效）。
"""
import http.server
import json
import os
import re
import shutil
import socket
import socketserver
import subprocess
import sys

# pythonw（无窗口）启动时 stdout/stderr 为 None：任何日志写入都会抛异常，
# 表现为 /api/ping 正常（被静默）而静态文件/接口请求全部空响应——
# 双击 bat"打不开"的根因。统一切到 devnull。
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w")

ROOT = os.path.dirname(os.path.abspath(__file__))
CONFIG = os.path.join(ROOT, "config.json")
SAFE = re.compile(r"^\w+$")   # 用户名白名单（中英文、数字、下划线）
RESERVED = {"accounts", "current", "deleted", "default"}


def data_dir():
    """每次请求都重新读取：页面上修改数据位置立即生效，无需重启服务器"""
    try:
        with open(CONFIG, encoding="utf-8") as f:
            d = json.load(f).get("dataDir")
        if d:
            return d
    except Exception:
        pass
    return os.path.join(ROOT, "data")


def _read_json(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _write_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def _read_current(dd):
    """current.json 内容为 JSON 字符串；兼容更早版本的裸字符串写法"""
    try:
        with open(os.path.join(dd, "current.json"), encoding="utf-8") as f:
            t = f.read().strip()
    except Exception:
        return ""
    if not t:
        return ""
    try:
        v = json.loads(t)
        return v if isinstance(v, str) else str(v)
    except Exception:
        return t


def _load_user(dd, name):
    """读取账号数据包；旧格式（无 savedAt 包装的裸键值表）按 savedAt=0 兼容"""
    raw = _read_json(os.path.join(dd, name + ".json"))
    if not isinstance(raw, dict):
        return None
    if isinstance(raw.get("data"), dict):
        return {"savedAt": int(raw.get("savedAt") or 0), "data": raw["data"]}
    return {"savedAt": 0, "data": raw}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/api/ping":
            return self._json({"ok": True, "server": "nav-data-server"})
        if path == "/api/state":
            dd = data_dir()
            accounts = _read_json(os.path.join(dd, "accounts.json"))
            current = _read_current(dd)
            user = _load_user(dd, current) if (current and SAFE.match(current)) else None
            return self._json({"ok": True, "dataDir": dd, "accounts": accounts or {},
                               "current": current, "user": user})
        return super().do_GET()

    def do_POST(self):
        path = self.path.split("?")[0]
        if path not in ("/api/user", "/api/auth", "/api/config"):
            return self._json({"ok": False}, 404)
        n = int(self.headers.get("Content-Length") or 0)
        try:
            payload = json.loads(self.rfile.read(n).decode("utf-8"))
        except Exception as e:
            return self._json({"ok": False, "error": str(e)}, 400)
        if not isinstance(payload, dict):
            return self._json({"ok": False, "error": "bad payload"}, 400)
        dd = data_dir()

        if path == "/api/user":
            # 保存账号数据包：磁盘是唯一权威，直接整包覆盖写入
            name = str(payload.get("name") or "")
            bundle = payload.get("bundle")
            if not SAFE.match(name) or name in RESERVED:
                return self._json({"ok": False, "error": "bad name"}, 400)
            if not isinstance(bundle, dict) or not isinstance(bundle.get("data"), dict):
                return self._json({"ok": False, "error": "bad bundle"}, 400)
            saved = bundle.get("savedAt")
            saved = saved if isinstance(saved, int) else 0
            _write_json(os.path.join(dd, name + ".json"),
                        {"savedAt": saved,
                         "data": {str(k): v for k, v in bundle["data"].items()}})
            return self._json({"ok": True})

        if path == "/api/auth":
            # 账号表 / 当前身份 / 删除账号：以页面提交为准，直接写盘
            acc = payload.get("accounts")
            clean = {}
            if isinstance(acc, dict):
                for k, v in acc.items():
                    ks = str(k)
                    if SAFE.match(ks):
                        clean[ks] = str(v)
            _write_json(os.path.join(dd, "accounts.json"), clean)
            _write_json(os.path.join(dd, "current.json"), str(payload.get("current") or ""))
            removed = []
            for name in (payload.get("remove") or []):
                ns = str(name)
                if SAFE.match(ns) and ns not in RESERVED:
                    try:
                        os.remove(os.path.join(dd, ns + ".json"))
                        removed.append(ns)
                    except OSError:
                        pass
            return self._json({"ok": True, "removed": removed})

        # /api/config：修改数据目录。目标目录里缺的文件从旧目录拷贝过去
        # （不覆盖目标已有文件），旧目录原样保留作备份。
        raw = str(payload.get("dataDir") or "").strip()
        old = data_dir()
        if raw:
            target = os.path.abspath(os.path.expanduser(raw))
        else:
            target = os.path.join(ROOT, "data")
            try:
                os.remove(CONFIG)
            except OSError:
                pass
        copied = 0
        if os.path.abspath(old) != os.path.abspath(target):
            os.makedirs(target, exist_ok=True)
            if os.path.isdir(old):
                for f in os.listdir(old):
                    if f.endswith(".json") and not os.path.exists(os.path.join(target, f)):
                        try:
                            shutil.copy2(os.path.join(old, f), os.path.join(target, f))
                            copied += 1
                        except OSError:
                            pass
        if raw:
            _write_json(CONFIG, {"dataDir": target})
        print(f"[config] data dir -> {target} (copied {copied})", flush=True)
        return self._json({"ok": True, "dataDir": target, "copied": copied})

    def log_message(self, fmt, *args):   # 静默常规访问日志
        if "/api/" not in (args[0] if args else ""):
            super().log_message(fmt, *args)


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def tailscale_ip():
    """本机 Tailscale IP（100.x.y.z）；找不到返回 None"""
    exes = [shutil.which("tailscale")]
    exes += [os.path.join(p, "Tailscale", "tailscale.exe")
             for p in (os.environ.get("ProgramFiles", r"C:\Program Files"),
                       os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)"),
                       r"D:\Program Files")]
    for exe in exes:
        if not exe or not os.path.isfile(exe):
            continue
        try:
            r = subprocess.run([exe, "ip", "-4"], capture_output=True, text=True, timeout=5)
            for line in (r.stdout or "").split():
                if line.startswith("100.") and "/" not in line:
                    return line
        except Exception:
            continue
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if ip.startswith("100.") and not ip.startswith("100.100."):
                return ip
    except Exception:
        pass
    return None


def local_ips():
    """本机所有可用 IPv4（回环 + 各网卡），供访问提示"""
    ips = []
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if ip not in ips and not ip.startswith("169.254."):
                ips.append(ip)
    except Exception:
        pass
    tip = tailscale_ip()
    if tip and tip not in ips:
        ips.append(tip)
    return ips


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8630
    with Server(("0.0.0.0", port), Handler) as httpd:
        print(f"星历（Almanac）数据服务器已启动: http://127.0.0.1:{port}")
        for ip in local_ips():
            tag = "（Tailscale）" if ip.startswith("100.") else ""
            print(f"可访问: http://{ip}:{port}{tag}")
        print(f"账号数据目录: {data_dir()}")
        print("按 Ctrl+C 退出")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n已退出")
