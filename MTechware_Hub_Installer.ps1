# Console styling functions
function Write-ColorText {
    param (
        [string]$Text,
        [string]$ForegroundColor = "White"
    )
    Write-Host $Text -ForegroundColor $ForegroundColor
}

function Write-ThemeLine {
    param (
        [string]$Text = "",
        [int]$Width = 70,
        [string]$Color = "DarkYellow"
    )
    $pad = [Math]::Max(0, [Math]::Floor(($Width - $Text.Length)/2))
    Write-ColorText ("-" * $Width) $Color
    if ($Text) {
        Write-ColorText (" " * $pad + $Text) $Color
        Write-ColorText ("-" * $Width) $Color
    }
}

function Write-ThemeMsg {
    param (
        [string]$Text,
        [int]$Width = 70,
        [string]$Color = "White"
    )
    $pad = [Math]::Max(0, [Math]::Floor(($Width - $Text.Length)/2))
    Write-ColorText (" " * $pad + $Text) $Color
}

function Write-StatusMsg {
    param (
        [string]$Text,
        [string]$Status,
        [string]$StatusColor = "Green"
    )
    Write-Host "  $Text " -NoNewline
    Write-Host "[$Status]" -ForegroundColor $StatusColor
}

# ======================================================================
# MTechware's Hub Installer Script
# Created by MTechware
# Version: 1.0.0
# ======================================================================
# This script will:
#  - Download the latest MTechware's Hub executable
#  - Create the installation directory (%LOCALAPPDATA%\MTechWare\MTechWare's Hub)
#  - Create a desktop shortcut
#  - Launch the application
#
# Installation Directory: %LOCALAPPDATA%\MTechWare\MTechWare's Hub
#  - Application executable: MTechware-Hub.exe
#  - Settings and data: settings.json
# ======================================================================

# Configuration
$appName = "MTechware's Hub"
$companyName = "MTechWare"
$version = "0.0.2"
$installDir = "$env:LOCALAPPDATA\MTechWare\MTechWare's Hub"
$exeUrl = "https://github.com/MTechWare/MTechWare-Hub/releases/download/main/Hub.exe"
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "$appName.lnk"
$exeName = "Hub.exe"
$targetExePath = Join-Path $installDir $exeName

# System information
$osInfo = Get-CimInstance Win32_OperatingSystem
$osName = $osInfo.Caption
$osVersion = $osInfo.Version
$computerName = $env:COMPUTERNAME
$userName = $env:USERNAME

# Clear the console and set title
Clear-Host
$host.UI.RawUI.WindowTitle = "$appName Installer - $companyName"

# Hub
Write-ThemeLine "$appName Installer" -Color "DarkYellow"

Write-ThemeMsg " __  __ _____        _    __        __                " -Color "Yellow"
Write-ThemeMsg "|  \/  |_   _|__  __| |_  \ \      / /_ _ _ __ ___     " -Color "Yellow"
Write-ThemeMsg "| |\/| | | |/ _ \/ _` | '_ \ \ \ /\ / / _` | '__/ _ \   " -Color "Yellow"
Write-ThemeMsg "| |  | | | |  __/ (_| | | | | \ V  V / (_| | | |  __/  " -Color "Yellow"
Write-ThemeMsg "|_|  |_| |_|\___|\__,_|_| |_|  \_/\_/ \__,_|_|  \___| " -Color "Yellow"
Write-ThemeMsg "" -Color "Yellow"
Write-ThemeMsg "                    _   _       _                    " -Color "Yellow"
Write-ThemeMsg "                   | | | |_   _| |__                 " -Color "Yellow"
Write-ThemeMsg "                   | |_| | | | | '_ \                " -Color "Yellow"
Write-ThemeMsg "                   |  _  | |_| | |_) |               " -Color "Yellow"
Write-ThemeMsg "                   |_| |_|\__,_|_.__/                " -Color "Yellow"
#Write-ThemeMsg "by $companyName" -Color "White"
Write-ThemeLine "" -Color "DarkYellow"

# Display system information
Write-Host ""
Write-StatusMsg "System" "$osName ($osVersion)" "Yellow"
Write-StatusMsg "Computer" "$computerName" "Yellow"
Write-StatusMsg "User" "$userName" "Yellow"
Write-StatusMsg "Installing to" "$installDir" "Yellow"
Write-Host ""



# Installation steps
Write-ThemeLine "Installation Process" -Color "DarkYellow"
Write-Host ""

# Create install directory if it doesn't exist
Write-StatusMsg "Installation directory" "CHECKING" "Yellow"
if (!(Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
    Write-StatusMsg "Creating directory" "SUCCESS" "Green"
} else {
    Write-StatusMsg "Installation directory" "EXISTS" "Green"
}

# Download the executable
Write-StatusMsg "Downloading $appName" "DOWNLOADING..." "Yellow"
try {
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $exeUrl -OutFile $targetExePath -UseBasicParsing -ErrorAction Stop
    $ProgressPreference = 'Continue'

    if (Test-Path $targetExePath) {
        Write-StatusMsg "Download" "COMPLETE" "Green"
    } else {
        throw "File was not downloaded successfully"
    }
} catch {
    Write-StatusMsg "Download" "FAILED" "Red"
    Write-Host "  Error: $_" -ForegroundColor "Red"
    Write-Host "  Please check your internet connection or the download URL." -ForegroundColor "Red"
    exit 1
}

# Create desktop shortcut
Write-StatusMsg "Creating shortcut" "PENDING" "Yellow"
try {
    $WScriptShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WScriptShell.CreateShortcut($shortcutPath)
    $Shortcut.TargetPath = $targetExePath
    $Shortcut.WorkingDirectory = $installDir
    $Shortcut.Description = "$appName - A modern application for managing and installing your favorite apps"
    $Shortcut.IconLocation = "$targetExePath,0"
    $Shortcut.Save()
    Write-StatusMsg "Desktop shortcut" "CREATED" "Green"
} catch {
    Write-StatusMsg "Desktop shortcut" "FAILED" "Red"
    Write-Host "  Error: $_" -ForegroundColor "Red"
}

# Installation Complete
Write-Host ""
Write-ThemeLine "Installation Complete" -Color "DarkYellow"
Write-Host ""
Write-ThemeMsg "$appName has been successfully installed!" -Color "Cyan"
Write-ThemeMsg "A desktop shortcut has been created" -Color "Cyan"
Write-ThemeMsg "The application will start momentarily" -Color "Cyan"
Write-Host ""

# Display helpful information
Write-ThemeLine "Helpful Information" -Color "DarkYellow"
Write-Host ""
Write-Host "  * Installation Directory: " -NoNewline -ForegroundColor "White"
Write-Host "$installDir" -ForegroundColor "Yellow"
Write-Host "  * Settings & Data: " -NoNewline -ForegroundColor "White"
Write-Host "$installDir\settings.json" -ForegroundColor "Yellow"
Write-Host "  * Desktop Shortcut: " -NoNewline -ForegroundColor "White"
Write-Host "$shortcutPath" -ForegroundColor "Yellow"
Write-Host "  * Version: " -NoNewline -ForegroundColor "White"
Write-Host "$version" -ForegroundColor "Yellow"
Write-Host "  * Support: " -NoNewline -ForegroundColor "White"
Write-Host "https://github.com/MTechWare" -ForegroundColor "Yellow"
Write-Host ""

Write-ThemeLine "Thank you for choosing $appName!" -Color "DarkYellow"
Write-Host ""
Write-ThemeMsg "Starting $appName..." -Color "Cyan"
Write-Host ""
Write-ThemeMsg "You can close this window after the application launches." -Color "White"

# Countdown before starting the app
for ($i = 3; $i -gt 0; $i--) {
    Write-Host "`rLaunching in $i..." -NoNewline -ForegroundColor "Yellow"
    Start-Sleep -Seconds 1
}
Write-Host "`rLaunching now!    " -ForegroundColor "Yellow"

# Start the app
Start-Process -FilePath $targetExePath

Write-Host ""
Write-Host "Installation completed successfully!" -ForegroundColor "Green"
Write-Host "Press any key to exit..." -ForegroundColor "Gray"
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
