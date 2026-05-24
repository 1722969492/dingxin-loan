@echo off
chcp 65001 >nul
title 默裕企服 - 表单接收服务
echo ╔═══════════════════════════════════════╗
echo ║    默裕企服 - 表单接收服务启动中...     ║
echo ╚═══════════════════════════════════════╝
echo.

:: 启动 Node 服务
start "默裕企服-API" cmd /k "node %~dp0server.js"
timeout /t 3 /nobreak >nul

:: 启动隧道
echo 正在启动公网隧道...
start "默裕企服-隧道" cmd /k "npx localtunnel --port 3456 --subdomain moyu-qifu"
timeout /t 5 /nobreak >nul

echo.
echo ✅ 服务已启动！
echo 📋 API: http://localhost:3456
echo 🌐 隧道: https://moyu-qifu.loca.lt
echo 📁 线索: %~dp0leads.csv
echo.
echo 按任意键打开线索文件...
pause >nul
start %~dp0leads.csv
