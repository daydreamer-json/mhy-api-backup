chcp 65001
@echo off&cls&cd /d %~dp0
start /min cmd /c "C:\Program Files\nodejs\npm" start
exit