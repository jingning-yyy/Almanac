#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
星历 Almanac · 本地数据服务器
作用：把各账号数据实时镜像为 data/ 目录下的真实 JSON 文件，
     在资源管理器里可以直接看到 data/ 下的各账号数据并拷贝迁移。

启动：双击 server.py，或在命令行运行  python server.py [端口]
使用：浏览器访问 http://127.0.0.1:8630 （页面数据会自动同步到 data/ 目录）
"""
import http.server
import json
import os
import re
import socketserver
import sys

# pythonw（无窗口）启动时 stdout/stderr 为 None：任何日志写入都会抛异常，
# 表现为 /api/ping 正常（被静默）而静态文件/同步请求全部空响应——
# 双击 bat"打不开"的根因。统一切到 devnull。
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w")

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")
SAFE = re.compile(r"^\w+$")   # 用户名/数据键白名单（中英文、数字、下划线）


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
        if path == "/api/sync":
            tree = {}
            if os.path.isdir(DATA):
                for dirpath, _, files in os.walk(DATA):
                    rel = os.path.relpath(dirpath, DATA).replace("\\", "/")
                    folder = "" if rel == "." else rel + "/"
                    for f in files:
                        if not f.endswith(".json"):
                            continue
                        key = folder + f[:-5]
                        try:
                            with open(os.path.join(dirpath, f), encoding="utf-8") as fp:
                                tree[key] = json.load(fp)
                        except Exception:
                            pass
            print("[sync] GET tree keys:", sorted(tree.keys()), flush=True)
            return self._json({"ok": True, "tree": tree})
        return super().do_GET()

    def do_POST(self):
        path = self.path.split("?")[0]
        if path == "/api/sync":
            n = int(self.headers.get("Content-Length") or 0)
            raw = self.rfile.read(n)
            print("[sync] POST body bytes:", n, "repr:", raw[:120], flush=True)
            try:
                payload = json.loads(raw.decode("utf-8"))
            except Exception as e:
                return self._json({"ok": False, "error": str(e)}, 400)
            want = {}
            tree_data = payload.get("tree")
            if tree_data is None:
                tree_data = payload          # 兼容：直接提交树本身（卸载信标）
            # 空浏览器防线（v73，v74 对齐语义）：无账号、无登录身份、无任何账号数据包
            # 的推送一律忽略——防止空状态清掉磁盘上的真实数据。default 有实际内容
            # 视作有效数据（与客户端判定一致）。
            meta = ("accounts", "current", "deleted")
            acc = tree_data.get("accounts") or {}
            cur = tree_data.get("current") or ""
            user_bundles = [k for k in tree_data
                            if k not in meta
                            and isinstance(tree_data[k], dict) and tree_data[k]]
            if not acc and not cur and not user_bundles:
                print("[sync] POST ignored (empty browser push)", flush=True)
                return self._json({"ok": True, "saved": 0, "skipped": "empty"})

            # 墓碑 = 已删账号名单：磁盘已有 ∪ 本次推送。只按墓碑删用户文件、
            # 账号表按并集合并——v74 之前"磁盘多余即删"会让旧浏览器的卸载信标
            # 把刚拷入 data/ 的陌生账号文件一并销毁（拷贝迁移反而丢数据的根源）。
            def _read_disk_json(name):
                try:
                    with open(os.path.join(DATA, name + ".json"), encoding="utf-8") as fp:
                        return json.load(fp)
                except Exception:
                    return None

            dead = set()
            disk_dead = _read_disk_json("deleted")
            if isinstance(disk_dead, list):
                dead |= {str(x) for x in disk_dead}
            if isinstance(tree_data.get("deleted"), list):
                dead |= {str(x) for x in tree_data["deleted"]}

            for name, val in tree_data.items():
                if name in meta or name in dead:
                    continue
                if not SAFE.match(name):
                    continue                  # 非法名跳过（防目录穿越）
                want[name] = val
            # 账号表：磁盘 ∪ 本次推送、剔除墓碑（他机新建的账号不被后推的一方冲掉）
            disk_acc = _read_disk_json("accounts")
            merged_acc = dict(disk_acc) if isinstance(disk_acc, dict) else {}
            if isinstance(acc, dict):
                merged_acc.update(acc)
            for name in dead:
                merged_acc.pop(name, None)
            want["accounts"] = merged_acc
            want["deleted"] = sorted(dead)
            if "current" in tree_data:
                want["current"] = tree_data.get("current") or ""

            for name, val in want.items():
                fpath = os.path.join(DATA, name) + ".json"
                os.makedirs(os.path.dirname(fpath), exist_ok=True)
                with open(fpath, "w", encoding="utf-8") as fp:
                    json.dump(val, fp, ensure_ascii=False, indent=2)
            # 删除：只清理墓碑名单里的用户文件（不再"多余即删"，手工放入的
            # data/*.json 想删就自己删文件或建同名账号后删账号）
            removed = []
            for dirpath, _, files in os.walk(DATA):
                rel = os.path.relpath(dirpath, DATA).replace("\\", "/")
                folder = "" if rel == "." else rel + "/"
                for f in files:
                    if not f.endswith(".json"):
                        continue
                    key = folder + f[:-5]
                    if key in dead and key not in meta:
                        try:
                            os.remove(os.path.join(dirpath, f))
                            removed.append(key)
                        except OSError:
                            pass
            print("[sync] POST saved:", sorted(want.keys()), "removed:", removed, flush=True)
            return self._json({"ok": True, "saved": len(want)})
        return self._json({"ok": False}, 404)

    def log_message(self, fmt, *args):   # 静默常规访问日志
        if "/api/" not in (args[0] if args else ""):
            super().log_message(fmt, *args)


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8630
    with Server(("127.0.0.1", port), Handler) as httpd:
        print(f"星历（Almanac）数据服务器已启动: http://127.0.0.1:{port}")
        print(f"账号数据会实时保存到: {DATA}")
        print("按 Ctrl+C 退出")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n已退出")
