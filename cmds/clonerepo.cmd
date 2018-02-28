@echo off

node %~dp0../src/clonerepo.js %1 %2 %3 %4 %5

REM curl -u 'ori.calvo@gmail.com:hello05' https://api.github.com/user/repos -d '{"name":"%1"}'
