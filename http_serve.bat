@echo off
echo Starting HTTPS Server
"C:\Users\brandonchong\OneDrive\Downloads\node-v24.11.1-win-x64\node.exe" "C:\Users\brandonchong\OneDrive\Downloads\node-v24.11.1-win-x64\node_modules\http-server\bin\http-server" -S -C localhost.pem -K localhost-key.pem