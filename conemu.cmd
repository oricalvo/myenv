@echo off

CALL %~dp0\env.cmd
node %~dp0/src/me.js install conemu
START %~dp0\bin\conemu\conemu64.exe
