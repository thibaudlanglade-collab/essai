$pdf = 'C:\Users\Utilisateur\Downloads\PAC-2025_RDS_030155602_20260305.pdf'
Write-Output ('PDF_SIZE: ' + (Get-Item $pdf).Length + ' bytes')
Write-Output '=== SSE STREAM ==='
curl.exe -X POST http://127.0.0.1:8000/api/execute_planner `
  -F "user_request=Extrait toutes les tables et fais en un excel" `
  -F "file=@$pdf;type=application/pdf" `
  --no-buffer `
  --max-time 120 `
  2>&1
