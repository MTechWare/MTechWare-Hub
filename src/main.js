const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const os = require('os');

let mainWindow;

// Settings management
const SETTINGS_DIR = path.join(os.homedir(), 'AppData', 'Local', 'MTechWare', "MTechWare's Hub");
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');

// Default settings
const DEFAULT_SETTINGS = {
    theme: 'classic-dark',
    primaryColor: '#ff6b35',
    rainbowMode: false,
    rainbowSpeed: 5,
    customTheme: {},
    autoUpdate: false,
    updateInterval: 86400000 // 24 hours in milliseconds
};

// Ensure settings directory exists
function ensureSettingsDirectory() {
    try {
        if (!fs.existsSync(SETTINGS_DIR)) {
            fs.mkdirSync(SETTINGS_DIR, { recursive: true });
        }
    } catch (error) {
        // Failed to create settings directory
    }
}

// Load settings from JSON file
function loadSettingsFromFile() {
    try {
        ensureSettingsDirectory();

        if (fs.existsSync(SETTINGS_FILE)) {
            const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
            const settings = JSON.parse(data);
            return { ...DEFAULT_SETTINGS, ...settings };
        } else {
            return DEFAULT_SETTINGS;
        }
    } catch (error) {
        return DEFAULT_SETTINGS;
    }
}

// Save settings to JSON file
function saveSettingsToFile(settings) {
    try {
        ensureSettingsDirectory();

        const settingsToSave = { ...DEFAULT_SETTINGS, ...settings };
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsToSave, null, 2), 'utf8');
        return true;
    } catch (error) {
        return false;
    }
}

// Load apps configuration
let appsConfig = null;

async function loadAppsConfig() {
    try {
        const appsJsonUrl = 'https://raw.githubusercontent.com/MTechWare/My-App/refs/heads/main/apps.json';

        // Try to fetch from GitHub first
        const https = require('https');
        const data = await new Promise((resolve, reject) => {
            https.get(appsJsonUrl, (response) => {
                let data = '';
                response.on('data', (chunk) => {
                    data += chunk;
                });
                response.on('end', () => {
                    resolve(data);
                });
            }).on('error', (error) => {
                reject(error);
            });
        });

        appsConfig = JSON.parse(data);
    } catch (error) {
        // Fallback to local file
        try {
            const appsJsonPath = path.join(process.cwd(), 'apps.json');
            const data = fs.readFileSync(appsJsonPath, 'utf8');
            appsConfig = JSON.parse(data);
        } catch (fallbackError) {
            appsConfig = { apps: [] };
        }
    }
}

// Get app configuration by ID
async function getAppConfig(appId) {
    if (!appsConfig) await loadAppsConfig();
    return appsConfig.apps.find(a => a.id === appId);
}

// Expand environment variables in paths
function expandPath(pathStr) {
    if (!pathStr) return null;

    let expandedPath = pathStr;
    expandedPath = expandedPath.replace(/%LOCALAPPDATA%/g, path.join(os.homedir(), 'AppData', 'Local'));
    expandedPath = expandedPath.replace(/%APPDATA%/g, path.join(os.homedir(), 'AppData', 'Roaming'));
    expandedPath = expandedPath.replace(/%USERPROFILE%/g, os.homedir());
    expandedPath = expandedPath.replace(/%PROGRAMFILES%/g, 'C:\\Program Files');
    expandedPath = expandedPath.replace(/%PROGRAMFILES\(X86\)%/g, 'C:\\Program Files (x86)');

    return expandedPath;
}

// App paths helper
async function getAppPath(appId) {
    const app = await getAppConfig(appId);
    if (!app || !app.managed || !app.installPath) return null;

    return expandPath(app.installPath);
}

// Check if app is installed
async function checkAppInstalled(appId) {
    const appPath = await getAppPath(appId);
    return appPath ? fs.existsSync(appPath) : false;
}

// Get app version from executable
async function getAppVersion(appId) {
    return new Promise(async (resolve) => {
        const appPath = await getAppPath(appId);
        if (!appPath || !(await checkAppInstalled(appId))) {
            resolve(null);
            return;
        }

        // Try to get version using PowerShell
        const command = `powershell -Command "(Get-ItemProperty '${appPath}').VersionInfo.FileVersion"`;

        exec(command, (error, stdout, stderr) => {
            if (error || stderr) {
                // Fallback: try to get version from file properties
                const command2 = `powershell -Command "(Get-Item '${appPath}').VersionInfo.ProductVersion"`;
                exec(command2, (error2, stdout2, stderr2) => {
                    if (error2 || stderr2) {
                        resolve('unknown');
                    } else {
                        resolve(stdout2.trim() || 'unknown');
                    }
                });
            } else {
                resolve(stdout.trim() || 'unknown');
            }
        });
    });
}

// Execute script with proper shell detection
function executeScript(script, appName, operation) {
    return new Promise((resolve, reject) => {
        // Determine the shell/command type
        let command;
        if (script.startsWith('powershell') || script.startsWith('pwsh')) {
            command = script;
        } else {
            // Default to PowerShell for scripts
            command = `powershell -Command "& {${script}}"`;
        }

        exec(command, (error, stdout, stderr) => {
            if (error) {
                // Provide user-friendly error messages for common uninstall issues
                if (operation === 'Uninstalling') {
                    if (error.message.includes('being used by another process') ||
                        error.message.includes('access is denied') ||
                        error.message.includes('cannot access the file')) {
                        const friendlyError = new Error(`Cannot uninstall ${appName} because it is currently running or files are in use. The application may have been closed but some processes are still running. Please wait a moment and try again, or restart your computer if the issue persists.`);
                        friendlyError.originalError = error;
                        reject(friendlyError);
                        return;
                    }
                }

                reject(error);
            } else {
                resolve(true);
            }
        });
    });
}

// Install app using installer script from JSON
async function installApp(appId) {
    try {
        const app = await getAppConfig(appId);
        if (!app) {
            throw new Error(`App not found: ${appId}`);
        }

        if (!app.managed) {
            throw new Error(`App is not managed: ${appId}`);
        }

        if (!app.installScript) {
            throw new Error(`No install script configured for app: ${appId}`);
        }

        return await executeScript(app.installScript, app.name, 'Installing');
    } catch (error) {
        throw error;
    }
}

// Update app using update script from JSON
async function updateApp(appId) {
    try {
        const app = await getAppConfig(appId);
        if (!app) {
            throw new Error(`App not found: ${appId}`);
        }

        if (!app.managed) {
            throw new Error(`App is not managed: ${appId}`);
        }

        // Use update script if available, otherwise fall back to install script
        const updateScript = app.updateScript || app.installScript;
        if (!updateScript) {
            throw new Error(`No update or install script configured for app: ${appId}`);
        }

        return await executeScript(updateScript, app.name, 'Updating');
    } catch (error) {
        throw error;
    }
}

// Check if app process is running
function isAppRunning(appName) {
    return new Promise((resolve) => {
        const command = `powershell -Command "Get-Process | Where-Object {$_.ProcessName -like '*${appName}*' -or $_.MainWindowTitle -like '*${appName}*'} | Select-Object -First 1"`;
        
        exec(command, (error, stdout, stderr) => {
            if (error || stderr) {
                resolve(false);
            } else {
                const hasProcess = stdout.trim().length > 0 && !stdout.includes('ProcessName');
                resolve(hasProcess);
            }
        });
    });
}

// Uninstall app using uninstall script or path from JSON
async function uninstallApp(appId) {
    try {
        const app = await getAppConfig(appId);
        if (!app) {
            throw new Error(`App not found: ${appId}`);
        }

        if (!app.managed) {
            throw new Error(`App is not managed: ${appId}`);
        }



        // Check if the app is currently running
        const isRunning = await isAppRunning(app.name);
        if (isRunning) {
            throw new Error(`Cannot uninstall ${app.name} because it is currently running. Please close the application first and try again.`);
        }

        // Check if app has custom uninstall script (highest priority)
        if (app.uninstallScript) {

            try {
                return await executeScript(app.uninstallScript, app.name, 'Uninstalling');
            } catch (scriptError) {
                // Check if error is due to app still running
                if (scriptError.message.includes('being used by another process') || 
                    scriptError.message.includes('access is denied') ||
                    scriptError.message.includes('cannot access the file')) {
                    throw new Error(`Cannot uninstall ${app.name} because it is currently running or files are in use. Please close the application and try again.`);
                }
                throw scriptError;
            }
        }

        // Default uninstall: remove directory
        let uninstallPath;

        // Check if app has custom uninstall path (medium priority)
        if (app.uninstallPath) {
            uninstallPath = expandPath(app.uninstallPath);

        } else {
            // Fallback to install path directory (lowest priority)
            const appPath = await getAppPath(appId);
            if (!appPath) {
                throw new Error(`No install or uninstall path configured for app: ${appId}`);
            }
            uninstallPath = path.dirname(appPath);

        }

        if (fs.existsSync(uninstallPath)) {

            try {
                fs.rmSync(uninstallPath, { recursive: true, force: true });
                return true;
            } catch (fsError) {
                // Check if error is due to files being in use
                if (fsError.code === 'EBUSY' || fsError.code === 'ENOTEMPTY' || 
                    fsError.message.includes('being used by another process') ||
                    fsError.message.includes('access is denied')) {
                    throw new Error(`Cannot uninstall ${app.name} because some files are currently in use. Please close the application and any related processes, then try again.`);
                }
                throw fsError;
            }
        } else {

            return false;
        }
    } catch (error) {
        throw error;
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, 'assets', 'images', 'icon.ico'),
        show: false
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Handle window controls
    ipcMain.on('window-minimize', () => {
        mainWindow.minimize();
    });

    ipcMain.on('window-maximize', () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    });

    ipcMain.on('window-close', () => {
        mainWindow.close();
    });

    // Handle app launching
    ipcMain.on('launch-app', async (event, appId, appPath) => {
        try {
            const managedAppPath = await getAppPath(appId);
            if (managedAppPath) {
                // This is a managed app, check if installed
                if (await checkAppInstalled(appId)) {
                    spawn(managedAppPath, [], { detached: true, stdio: 'ignore' });
                } else {
                    event.reply('app-not-installed', appId);
                }
            } else {
                // Regular app, use provided path
                spawn(appPath, [], { detached: true, stdio: 'ignore' });
            }
        } catch (error) {
            event.reply('app-launch-error', error.message);
        }
    });

    // Check app installation status
    ipcMain.on('check-app-status', async (event, appId) => {
        const managedAppPath = await getAppPath(appId);
        if (managedAppPath) {
            const isInstalled = await checkAppInstalled(appId);
            const installedVersion = isInstalled ? await getAppVersion(appId) : null;
            event.reply('app-status', {
                appId,
                installed: isInstalled,
                path: managedAppPath,
                version: installedVersion
            });
        } else {
            event.reply('app-status', {
                appId,
                installed: false,
                path: null,
                version: null
            });
        }
    });

    // Install app
    ipcMain.on('install-app', async (event, appId) => {
        try {
            event.reply('app-installing', appId);
            await installApp(appId);
            event.reply('app-installed', appId);
        } catch (error) {
            event.reply('app-install-error', appId, error.message);
        }
    });

    // Update app
    ipcMain.on('update-app', async (event, appId) => {
        try {
            event.reply('app-updating', appId);
            await updateApp(appId);
            event.reply('app-updated', appId);
        } catch (error) {
            event.reply('app-update-error', appId, error.message);
        }
    });

    // Uninstall app
    ipcMain.on('uninstall-app', async (event, appId) => {
        try {
            const success = await uninstallApp(appId);
            if (success) {
                event.reply('app-uninstalled', appId);
            } else {
                event.reply('app-uninstall-error', appId, 'App not found');
            }
        } catch (error) {
            event.reply('app-uninstall-error', appId, error.message);
        }
    });

    // Handle opening external links
    ipcMain.on('open-external', (event, url) => {
        shell.openExternal(url);
    });

    // Handle opening apps.json for editing
    ipcMain.on('open-apps-json', () => {
        const appsJsonPath = path.join(process.cwd(), 'apps.json');
        shell.openPath(appsJsonPath);
    });

    // Handle settings management
    ipcMain.handle('load-settings', () => {
        return loadSettingsFromFile();
    });

    ipcMain.handle('save-settings', (event, settings) => {
        return saveSettingsToFile(settings);
    });

    ipcMain.handle('get-settings-path', () => {
        return SETTINGS_FILE;
    });

    ipcMain.handle('open-settings-folder', () => {
        shell.openPath(SETTINGS_DIR);
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
