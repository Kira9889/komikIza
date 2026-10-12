# Tenshi.id — sync otomatis Shinigami -> Supabase (WAJIB jalan dari IP rumah,
# karena IP datacenter seperti Render diblokir api.shngm.io).
#
# Cara pakai manual: klik kanan file ini > Run with PowerShell.
# Cara otomatis: daftarkan ke Task Scheduler (lihat panduan di chat).
#
# DATABASE_URL dibaca otomatis dari server/.env oleh sync-shinigami.mjs,
# jadi tidak perlu setting apa-apa. Yang sudah terisi di-skip sendiri,
# jadi aman dijalankan tiap malam (cuma nyedot yang kurang/baru).

$ErrorActionPreference = 'Continue'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $dir

$log = Join-Path $dir 'sync-auto.log'
$stamp = { param($m) "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $m" }

if (!(Get-Command node -ErrorAction SilentlyContinue)) {
  "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ERROR: node tidak ketemu di PATH." | Tee-Object -FilePath $log -Append
  exit 1
}

# Penjaga 1x sehari: kalau hari ini sudah pernah sync sampai selesai, lewati.
# Jadi jadwal boleh ke-trigger kapan saja (jam 2, jam 7 pas laptop dibuka, dll),
# yang dikerjakan tetap maksimal 1x per hari.
$stampFile = Join-Path $dir '.sync-last-run'
$today = Get-Date -Format 'yyyy-MM-dd'
if ((Test-Path -LiteralPath $stampFile) -and ((Get-Content -LiteralPath $stampFile -TotalCount 1) -eq $today)) {
  "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Sudah sync hari ini ($today), lewati." | Tee-Object -FilePath $log -Append
  exit 0
}

$wantFull = $args -contains '-Full'

& {
  Write-Output (& $stamp 'MULAI sync otomatis')
  # Impor katalog dulu: judul + bookmark BARU dari Shinigami masuk DB di sini.
  # Tanpa ini, sync chapter di bawah cuma mengurus judul yang sudah ada.
  Write-Output (& $stamp 'Impor katalog (judul baru)')
  node sync-shinigami.mjs --import
  if ($LASTEXITCODE -ne 0) {
    Write-Output (& $stamp "Impor katalog exit=$LASTEXITCODE (lanjut chapter)")
  }
  # Bagi beban: tiap malam cuma 200 judul, rotasi per tanggal (full 1000
  # kelar dalam 5 malam). Parameter -Full untuk sapu semua sekaligus.
  # Contoh manual penuh: .\sync-otomatis.ps1 -Full
  if ($wantFull) {
    $ranges = @(0, 100, 200, 300, 400, 500, 600, 700, 800, 900)
  } else {
    $dayIdx = ((Get-Date).DayOfYear % 5)
    $ranges = @(($dayIdx * 200), ($dayIdx * 200) + 100)
    Write-Output (& $stamp "Jatah malam ini: offset $($ranges[0])-${($ranges[1])} (rotasi harian, -Full untuk semua)")
  }
  foreach ($o in $ranges) {
    Write-Output (& $stamp "Batch offset=$o limit=100")
    node sync-shinigami.mjs --limit=100 --offset=$o --workers=3 --jobs=1
    if ($LASTEXITCODE -ne 0) {
      Write-Output (& $stamp "Batch offset=$o exit=$LASTEXITCODE (lanjut batch berikut)")
    }
  }
  Write-Output (& $stamp 'SELESAI sync otomatis')
  $today | Set-Content -LiteralPath $stampFile -NoNewline
} *>&1 | Tee-Object -FilePath $log -Append
