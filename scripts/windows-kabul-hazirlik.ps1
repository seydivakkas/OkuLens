<#
OkuLens - Islem 004-E / Windows kabul ortami kaydi.
Yalnizca okur: model indirmez, tarayiciya uzanti kurmaz,
ag baglantisini degistirmez ve gercek ONNX kabul PASS uretmez.
Ornek: powershell -NoProfile -File scripts/windows-kabul-hazirlik.ps1 -Tarayici Chrome
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('Chrome','Edge')]
    [string]$Tarayici,
    [string]$CiktiKlasoru = 'kanitlar'
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
    throw 'WINDOWS_REQUIRED: Bu betik yalnizca Windows ortaminda calisir.'
}
if (-not (Test-Path -LiteralPath 'manifest.json' -PathType Leaf)) {
    throw 'REPO_ROOT_REQUIRED: OkuLens depo kok dizininde calistirin.'
}
$manifest = Get-Content -LiteralPath 'manifest.json' -Raw -Encoding UTF8 | ConvertFrom-Json
if ($manifest.name -ne 'OkuLens') {
    throw 'UNEXPECTED_EXTENSION: manifest.json OkuLens degil.'
}

function Get-ExecutablePath {
    param([string]$Browser)
    $file = if ($Browser -eq 'Chrome') { 'chrome.exe' } else { 'msedge.exe' }
    $subpath = if ($Browser -eq 'Chrome') {
        'Google\Chrome\Application\chrome.exe'
    } else {
        'Microsoft\Edge\Application\msedge.exe'
    }
    $roots = @($env:ProgramFiles,[Environment]::GetFolderPath('ProgramFilesX86'),$env:LOCALAPPDATA)
    foreach ($root in $roots) {
        if (-not $root) { continue }
        $candidate = Join-Path $root $subpath
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
    }
    $command = Get-Command -Name $file -ErrorAction SilentlyContinue
    if ($null -ne $command -and (Test-Path -LiteralPath $command.Source -PathType Leaf)) {
        return $command.Source
    }
    return $null
}

$exe = Get-ExecutablePath -Browser $Tarayici
$version = $null
if ($exe) { $version = (Get-Item -LiteralPath $exe).VersionInfo.ProductVersion }
$osVersion = [Environment]::OSVersion.Version.ToString()
$osCaption = $null
try { $osCaption = (Get-CimInstance -ClassName Win32_OperatingSystem).Caption } catch {}

$gpuDetails = @()
try {
    $gpuDetails = @(Get-CimInstance -ClassName Win32_VideoController |
        Select-Object -Property Name,DriverVersion)
} catch {}

$gitSha = $null
try {
    $git = Get-Command -Name git -ErrorAction SilentlyContinue
    if ($null -ne $git) {
        $sha = (& git rev-parse HEAD 2>$null | Out-String).Trim()
        if ($sha -match '^[a-f0-9]{40}$') { $gitSha = $sha }
    }
} catch {}

$report = [ordered]@{
    schemaVersion = 1
    kind = 'OKULENS_WINDOWS_ENVIRONMENT_EVIDENCE'
    generatedAt = [DateTime]::UtcNow.ToString('o')
    browser = $Tarayici
    browserDetected = [bool]$exe
    browserVersion = $version
    windowsVersion = $osVersion
    windowsName = $osCaption
    extensionName = $manifest.name
    extensionVersion = $manifest.version
    repositoryCommit = $gitSha
    graphicsDevices = @($gpuDetails)
    gpuVramMeasurementStatus = 'NOT_MEASURED'
    onnxModelLoaded = $false
    opfsVerified = $false
    offlineInferenceVerified = $false
    networkCaptureStatus = 'NOT_MEASURED'
    sourceFidelityVerified = $false
    decision = 'HOLD'
    note = 'Bu dosya yalnizca Windows ortam envanteridir. Chrome/Edge ONNX, VRAM, ag ve kaynak kabul raporu degildir.'
}
New-Item -ItemType Directory -Path $CiktiKlasoru -Force | Out-Null
$name = 'okulens-windows-' + $Tarayici.ToLowerInvariant() + '-ortam.json'
$destination = Join-Path (Resolve-Path $CiktiKlasoru).Path $name
$json = $report | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText($destination,$json + [Environment]::NewLine,
    (New-Object System.Text.UTF8Encoding $false))
Write-Host ('Ortam kaydi olusturuldu: ' + $destination)
if (-not $exe) {
    Write-Warning ('Tarayici bulunamadi: ' + $Tarayici + '. Ortam ve model kabulu HOLD.')
}
Write-Host 'ONNX, OPFS, offline, VRAM ve ag kabul karari: HOLD.'
