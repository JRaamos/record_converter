$ErrorActionPreference = 'Stop'
$version = (Get-Content "$PSScriptRoot/../package.json" -Raw | ConvertFrom-Json).version
$installer = (Resolve-Path "$PSScriptRoot/../release/Record-Converter-Setup-$version.exe").Path
$tempBase = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { [System.IO.Path]::GetTempPath() }
$temporaryRoot = Join-Path $tempBase ("RecordConverterSmoke-" + [Guid]::NewGuid().ToString('N'))
$installDirectory = Join-Path $temporaryRoot 'app'
$resultPath = Join-Path $temporaryRoot 'smoke-result.json'
New-Item -ItemType Directory -Path $temporaryRoot -Force | Out-Null
try {
    $installation = Start-Process -FilePath $installer -ArgumentList @('/S', "/D=$installDirectory") -PassThru -Wait
    if ($installation.ExitCode -ne 0) { throw "Installer exited with code $($installation.ExitCode)" }
    $application = Join-Path $installDirectory 'Record Converter.exe'
    if (-not (Test-Path $application)) { throw 'Installed application executable was not found.' }
    if (-not (Test-Path (Join-Path $installDirectory 'resources/app.asar'))) { throw 'Installed runtime archive is missing.' }
    # Packaged Electron carries its own Node runtime. Remove development Node from
    # this process PATH to demonstrate that the installed application is standalone.
    $previousPath = $env:PATH
    $env:PATH = "$env:SystemRoot\system32;$env:SystemRoot"
    try {
        $process = Start-Process -FilePath $application -ArgumentList @('--smoke-test', "`"$resultPath`"") -PassThru
        if (-not $process.WaitForExit(60000)) {
            Stop-Process -Id $process.Id -Force
            throw 'Installed application did not finish its smoke test within 60 seconds.'
        }
        if ($process.ExitCode -ne 0) { throw "Installed application exited with code $($process.ExitCode)" }
    } finally { $env:PATH = $previousPath }
    if (-not (Test-Path $resultPath)) { throw 'Installed application did not produce smoke test evidence.' }
    $result = Get-Content $resultPath -Raw | ConvertFrom-Json
    if ($result.ok -ne $true) { throw 'Installed application reported a failed smoke test.' }
    $uninstaller = Get-ChildItem -Path $installDirectory -Filter '*Uninstall*.exe' | Select-Object -First 1
    if (-not $uninstaller) { throw 'Uninstaller was not found.' }
    $uninstallation = Start-Process -FilePath $uninstaller.FullName -ArgumentList '/S' -PassThru -Wait
    if ($uninstallation.ExitCode -ne 0) { throw "Uninstaller exited with code $($uninstallation.ExitCode)" }
    for ($attempt = 0; $attempt -lt 40 -and (Test-Path $application); $attempt++) { Start-Sleep -Milliseconds 500 }
    if (Test-Path $application) { throw 'Application executable still exists after uninstall.' }
    Write-Output 'Windows smoke passed: silent installation, packaged launch, runtime self-test, and uninstallation.'
} finally {
    if (Test-Path $temporaryRoot) { Remove-Item $temporaryRoot -Recurse -Force -ErrorAction SilentlyContinue }
}
