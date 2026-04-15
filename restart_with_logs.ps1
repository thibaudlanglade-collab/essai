Get-Process | Where-Object { $_.ProcessName -like '*python*' } | ForEach-Object {
  try { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue } catch {}
}
Start-Sleep -Seconds 2

$proc = Start-Process `
  -FilePath 'F:\te\.venv\Scripts\python.exe' `
  -ArgumentList '-m','uvicorn','main:app','--host','127.0.0.1','--port','8000','--log-level','debug' `
  -WorkingDirectory 'F:\te\backend' `
  -WindowStyle Hidden `
  -PassThru `
  -RedirectStandardOutput 'F:\te\backend\.uvicorn.log' `
  -RedirectStandardError 'F:\te\backend\.uvicorn.err.log'

Write-Output ('BACKEND_PID: ' + $proc.Id)
Start-Sleep -Seconds 6
$code = curl.exe -s http://127.0.0.1:8000/docs -o NUL -w '%{http_code}'
Write-Output ('HTTP_CHECK: ' + $code)
