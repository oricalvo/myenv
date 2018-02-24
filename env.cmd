@echo off

set PATH_EX=%~dp0\cmds;
set PATH_EX=%PATH_EX%;%~dp0\tools
set PATH_EX=%PATH_EX%;%~dp0\bin\PsTools
set PATH_EX=%PATH_EX%;%~dp0\bin\7z
set PATH_EX=%PATH_EX%;%~dp0\bin\node
set PATH=%PATH_EX%;%PATH%

echo Your environment has been set
