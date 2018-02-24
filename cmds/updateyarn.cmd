@echo off

CALL download https://yarnpkg.com/latest.msi %~dp0..\temp\latest.msi
IF NOT ERRORLEVEL 0 GOTO end

%~dp0..\temp\latest.msi

:end

