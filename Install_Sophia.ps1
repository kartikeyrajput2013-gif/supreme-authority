# ============================================================================
#  Nova one-step installer for Windows
#  Double-click THIS file. It copies Nova next to your delivery app,
#  keeps a backup of the old assistant.html, and makes a Desktop shortcut.
#  Nothing is uploaded and nothing is deleted.
# ============================================================================
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "    Nova - one step installer" -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""

$files = @('assistant.html', 'sophia_helper.py', 'Start_Sophia.bat')
foreach ($f in $files) {
    if (-not (Test-Path (Join-Path $here $f))) {
        Write-Host "  I cannot find $f next to this installer." -ForegroundColor Red
        Write-Host "  Unzip the whole folder first, then run this file again." -ForegroundColor Red
        Write-Host ""
        Read-Host "  Press Enter to close"
        exit 1
    }
}

function Ask-Yes($question) {
    while ($true) {
        Write-Host ""
        Write-Host "  $question" -ForegroundColor Yellow
        Write-Host "    [1] Yes, here      [2] Somewhere else      [3] Skip" -ForegroundColor Gray
        $a = Read-Host "  Choose 1, 2 or 3"
        if ($a -eq '1') { return 'here' }
        if ($a -eq '2') { return 'else' }
        if ($a -eq '3') { return 'skip' }
    }
}

function Pick-Folder($title) {
    try {
        Add-Type -AssemblyName System.Windows.Forms | Out-Null
        $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
        $dlg.Description = $title
        $dlg.ShowNewFolderButton = $true
        if ($dlg.ShowDialog() -eq 'OK') { return $dlg.SelectedPath }
    } catch { }
    return $null
}

# ---------------------------------------------------------------- 1. the folder
Write-Host "  Where should Nova live?" -ForegroundColor Cyan
Write-Host "  The best place is the same folder as your delivery app (index.html)." -ForegroundColor Gray
$desktop = [Environment]::GetFolderPath('Desktop')
$docs = [Environment]::GetFolderPath('MyDocuments')
$targets = @()

Write-Host ""
Write-Host "  Looking for a folder that has index.html (your delivery app)..." -ForegroundColor Gray
$guess = @(
    (Join-Path $desktop 'DELIVERY APP STUFF'),
    (Join-Path $docs 'DELIVERY APP STUFF'),
    (Join-Path $env:USERPROFILE 'DELIVERY APP STUFF'),
    (Join-Path $env:USERPROFILE 'Desktop\DELIVERY APP STUFF')
)
$delivery = $null
foreach ($g in $guess) {
    if (Test-Path (Join-Path $g 'index.html')) { $delivery = $g; break }
}
if (-not $delivery) {
    Write-Host "  Searching Desktop and Documents for index.html (this takes a moment)..." -ForegroundColor Gray
    $hits = @()
    foreach ($root in @($desktop, $docs, (Join-Path $env:USERPROFILE 'Downloads'))) {
        if (-not (Test-Path $root)) { continue }
        $hits += Get-ChildItem -Path $root -Filter 'index.html' -Recurse -Depth 3 -ErrorAction SilentlyContinue |
                 Where-Object { $_.FullName -notmatch '\\Windows\\' } |
                 Select-Object -First 5
    }
    if ($hits.Count -gt 0) {
        Write-Host ""
        Write-Host "  I found these pages. Which one is your delivery app?" -ForegroundColor Yellow
        $i = 1
        foreach ($h in $hits) {
            Write-Host ("    [{0}] {1}" -f $i, $h.DirectoryName) -ForegroundColor Gray
            $i++
        }
        Write-Host ("    [{0}] None of these" -f $i) -ForegroundColor Gray
        $pick = Read-Host "  Type the number"
        if ($pick -match '^\d+$' -and [int]$pick -ge 1 -and [int]$pick -le $hits.Count) {
            $delivery = $hits[[int]$pick - 1].DirectoryName
        }
    }
}

if ($delivery) {
    Write-Host ""
    Write-Host "  Delivery app found:" -ForegroundColor Green
    Write-Host "    $delivery" -ForegroundColor White
    $ans = Ask-Yes "Should Nova live in that folder (next to index.html)?"
    if ($ans -eq 'here') { $targets += $delivery }
    elseif ($ans -eq 'else') {
        $p = Pick-Folder 'Choose the folder for Nova (next to index.html)'
        if ($p) { $targets += $p }
    }
} else {
    Write-Host ""
    Write-Host "  I did not find index.html automatically." -ForegroundColor Yellow
    $ans = Ask-Yes "Do you want to choose the folder yourself?"
    if ($ans -eq 'here') {
        $p = Pick-Folder 'Choose the folder where your delivery app lives'
        if ($p) { $targets += $p }
    } elseif ($ans -eq 'else') {
        $p = Pick-Folder 'Choose any folder for Nova'
        if ($p) { $targets += $p }
    }
}

if ($targets.Count -eq 0) {
    $fallback = Join-Path $env:USERPROFILE 'Nova'
    Write-Host ""
    Write-Host "  No folder chosen, so I will use: $fallback" -ForegroundColor Yellow
    $targets += $fallback
}

# ------------------------------------------------------- 2. copy her files in
$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
foreach ($dest in $targets) {
    if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }
    Write-Host ""
    Write-Host "  Installing into: $dest" -ForegroundColor Cyan
    $old = Join-Path $dest 'assistant.html'
    if (Test-Path $old) {
        $backup = Join-Path $dest ("assistant-old-" + $stamp + ".html")
        Copy-Item $old $backup -Force
        Write-Host "    old assistant.html backed up as $(Split-Path -Leaf $backup)" -ForegroundColor Gray
    }
    foreach ($f in $files) {
        Copy-Item (Join-Path $here $f) (Join-Path $dest $f) -Force
        Write-Host "    copied $f" -ForegroundColor Green
    }
}

# ---------------------------------------------------------- 3. desktop link
$desk = [Environment]::GetFolderPath('Desktop')
$first = $targets[0]
$lnkPath = Join-Path $desk 'Nova.lnk'
try {
    $shell = New-Object -ComObject WScript.Shell
    $lnk = $shell.CreateShortcut($lnkPath)
    $lnk.TargetPath = (Join-Path $first 'Start_Sophia.bat')
    $lnk.WorkingDirectory = $first
    $lnk.Description = 'Start Nova, your personal AI assistant'
    $lnk.IconLocation = 'shell32.dll,21'
    $lnk.Save()
    Write-Host ""
    Write-Host "  A shortcut called Nova is now on your Desktop." -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "  I could not make the Desktop shortcut, but the files are installed." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "    Done. Nova is on this laptop." -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Next time: double-click Nova on the Desktop." -ForegroundColor White
Write-Host "  Or double-click Start_Sophia.bat in that folder." -ForegroundColor White
Write-Host ""
Write-Host "  What is new: the big list of every app on this laptop, and every" -ForegroundColor Gray
Write-Host "  Open button now always opens something or tells you why not." -ForegroundColor Gray
Write-Host ""
Write-Host "  If Windows shows a small warning about Python, Nova still opens" -ForegroundColor Gray
Write-Host "  in browser mode; she just cannot change volume or play with apps." -ForegroundColor Gray
Write-Host ""

$go = Read-Host "  Start Nova now? [Y/n]"
if ($go -notmatch '^[nN]') {
    Start-Process -FilePath (Join-Path $first 'Start_Sophia.bat') -WorkingDirectory $first
}
Read-Host "  Press Enter to close"
