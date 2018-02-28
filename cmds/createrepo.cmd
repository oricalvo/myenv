@echo off

node %~dp0../src/createrepo.js

REM curl -u 'ori.calvo@gmail.com:hello05' https://api.github.com/user/repos -d '{"name":"%1"}'
