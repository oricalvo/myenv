@echo off

CALL %~dp0env.cmd
node %~dp0/src/me.js install conemu
START %~dp0packages\conemu\conemu64.exe
