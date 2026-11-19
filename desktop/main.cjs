const { app, BrowserWindow, dialog, protocol, session } = require('electron');
const { mkdirSync, promises: { readFile } } = require('node:fs');
const path = require('node:path');

const appName = '空间投影实验室';
const scheme = 'projection-lab';
const origin = `${scheme}://app`;
const entry = `${origin}/index.html`;
const resources = path.join(__dirname, 'web');
const assets = new Map([
  ['/index.html', 'text/html; charset=utf-8'],
  ['/lab.css', 'text/css; charset=utf-8'],
  ['/mark.svg', 'image/svg+xml'],
  ['/app.mjs', 'text/javascript; charset=utf-8'],
  ['/diagrams.mjs', 'text/javascript; charset=utf-8'],
  ['/examples.mjs', 'text/javascript; charset=utf-8'],
  ['/geometry.mjs', 'text/javascript; charset=utf-8'],
]);
const contentPolicy = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

protocol.registerSchemesAsPrivileged([
  { scheme, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

async function serveAsset(request) {
  const url = new URL(request.url);
  const type = assets.get(url.pathname);
  if (url.host !== 'app' || url.username || url.password || url.search || !type) {
    return new Response(null, { status: 404 });
  }
  if (!['GET', 'HEAD'].includes(request.method)) {
    return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  }

  try {
    const body = await readFile(path.join(resources, url.pathname.slice(1)));
    return new Response(request.method === 'HEAD' ? null : body, {
      headers: {
        'Content-Type': type,
        'Content-Security-Policy': contentPolicy,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Unable to load packaged resource', url.pathname, error.message);
    return new Response(null, { status: 500 });
  }
}

function focusWindow(window) {
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    title: appName,
    width: 1280,
    height: 900,
    minWidth: 620,
    minHeight: 520,
    backgroundColor: '#f3f6fb',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  const window = mainWindow;
  window.once('ready-to-show', () => window.show());
  window.on('closed', () => { mainWindow = undefined; });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, destination) => {
    if (destination.split('#', 1)[0] !== entry) event.preventDefault();
  });
  window.loadURL(entry).catch(error => {
    if (window.isDestroyed()) return;
    dialog.showErrorBox(appName, `本地实验页面加载失败。请重新解压完整的软件包。\n\n${error.message}`);
    app.quit();
  });
}

function start() {
  // A stable profile keeps custom scenes available when replacing the application.
  const requestedProfile = app.commandLine.getSwitchValue('user-data-dir');
  const profile = requestedProfile ? path.resolve(requestedProfile) : path.join(app.getPath('appData'), 'ProjectionLab');
  mkdirSync(profile, { recursive: true });
  app.setPath('userData', profile);
  app.setAppUserModelId('org.projectionlab.desktop');

  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    if (mainWindow) focusWindow(mainWindow);
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('activate', () => {
    if (app.isReady() && !mainWindow) createWindow();
  });
  app.on('before-quit', () => {
    if (app.isReady()) session.defaultSession.flushStorageData();
  });

  app.whenReady().then(() => {
    protocol.handle(scheme, serveAsset);
    const browserSession = session.defaultSession;
    browserSession.setPermissionRequestHandler((_contents, _permission, reply) => reply(false));
    browserSession.setPermissionCheckHandler(() => false);
    browserSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, reply) => reply({ cancel: true }));
    createWindow();
  }).catch(error => {
    dialog.showErrorBox(appName, `桌面程序无法启动。\n\n${error.message}`);
    app.quit();
  });
}

try {
  start();
} catch (error) {
  dialog.showErrorBox(appName, `无法创建桌面程序的数据目录。\n\n${error.message}`);
  app.quit();
}
