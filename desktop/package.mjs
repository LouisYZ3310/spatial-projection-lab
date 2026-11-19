import { packager } from '@electron/packager';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const desktop = dirname(fileURLToPath(import.meta.url));
const project = join(desktop, '..');
const source = join(project, 'dist');
const release = join(desktop, 'release');
const metadata = JSON.parse(await readFile(join(desktop, 'package.json'), 'utf8'));
const targets = {
  'macos': { platform: 'darwin', arch: 'universal', label: 'macOS', name: metadata.productName },
  'win-x64': { platform: 'win32', arch: 'x64', label: 'Windows', name: 'ProjectionLab' },
  'win-arm64': { platform: 'win32', arch: 'arm64', label: 'Windows', name: 'ProjectionLab' },
};
const requested = [...new Set(process.argv.slice(2))];
if (process.platform !== 'darwin' || requested.some(key => !Object.hasOwn(targets, key))) {
  throw new Error('在 macOS 上运行 pnpm package，可指定 macos、win-x64 或 win-arm64。');
}

const webFiles = ['index.html', 'lab.css', 'mark.svg', 'app.mjs', 'diagrams.mjs', 'examples.mjs', 'geometry.mjs'];
const scratch = await mkdtemp(join(tmpdir(), 'projection-lab-build-'));
const work = join(scratch, 'app');
const run = (file, args, options = {}) => execFileSync(file, args, { stdio: 'inherit', ...options });

async function preserveMacRuntimeNotices({ buildPath, platform }) {
  if (platform !== 'darwin') return;
  const resources = join(buildPath, 'Electron.app', 'Contents', 'Resources');
  await copyFile(join(buildPath, 'LICENSE'), join(resources, 'LICENSE.electron.txt'));
  await copyFile(join(buildPath, 'LICENSES.chromium.html'), join(resources, 'LICENSES.chromium.html'));
}

async function verifyNotices(bundleDir, target) {
  const mac = target.platform === 'darwin';
  const resources = mac ? join(bundleDir, `${target.name}.app`, 'Contents', 'Resources') : join(bundleDir, 'resources');
  const runtime = mac ? resources : bundleDir;
  const runtimeLicense = mac ? 'LICENSE.electron.txt' : 'LICENSE';
  const files = [
    join(resources, 'LICENSE'),
    join(resources, 'SOURCES.md'),
    join(resources, 'THIRD_PARTY_NOTICES.md'),
    join(resources, 'third_party', 'electron', 'LICENSE'),
    join(resources, 'third_party', 'electron-packager', 'LICENSE'),
    join(runtime, runtimeLicense),
    join(runtime, 'LICENSES.chromium.html'),
  ];
  await Promise.all(files.map(async file => {
    if (!(await readFile(file)).length) throw new Error(`许可文件为空：${file}`);
  }));
}

async function writeChecksums() {
  const archives = (await readdir(release)).filter(file => file.endsWith('.zip') && file.startsWith('ProjectionLab-')).sort();
  const rows = [];
  for (const file of archives) {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(join(release, file))) hash.update(chunk);
    rows.push(`${hash.digest('hex')}  ${file}`);
  }
  const temporary = join(release, '.SHA256SUMS.txt.tmp');
  await writeFile(temporary, rows.join('\n') + '\n');
  await rename(temporary, join(release, 'SHA256SUMS.txt'));
}

async function makeMacIcon() {
  const master = join(scratch, 'app.png');
  const images = join(scratch, 'ProjectionLab.iconset');
  const output = join(scratch, 'ProjectionLab.icns');
  await mkdir(images);
  run('/usr/bin/xcrun', ['swift', '-module-cache-path', join(tmpdir(), 'projection-lab-swift-cache'),
    join(desktop, 'render-icon.swift'), join(source, 'mark.svg'), master]);
  for (const size of [16, 32, 128, 256, 512]) {
    for (const scale of [1, 2]) {
      const pixels = String(size * scale);
      const filename = `icon_${size}x${size}${scale === 2 ? '@2x' : ''}.png`;
      run('/usr/bin/sips', ['-z', pixels, pixels, master, '--out', join(images, filename)], { stdio: 'ignore' });
    }
  }
  run('/usr/bin/iconutil', ['-c', 'icns', '-o', output, images]);
  return output;
}

async function buildTarget(key, icon) {
  const target = targets[key];
  const mac = target.platform === 'darwin';
  const [bundleDir] = await packager({
    dir: work,
    out: join(scratch, key),
    name: target.name,
    executableName: 'ProjectionLab',
    platform: target.platform,
    arch: target.arch,
    electronVersion: metadata.desktopRuntime.electron,
    electronZipDir: process.env.PROJECTION_LAB_ELECTRON_ZIPS || undefined,
    download: { cacheRoot: join(tmpdir(), 'projection-lab-electron-cache') },
    appVersion: metadata.version,
    asar: true,
    extraResource: ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'SOURCES.md', 'third_party'].map(file => join(project, file)),
    afterExtract: [preserveMacRuntimeNotices],
    ...(mac ? {
      appBundleId: 'org.projectionlab.desktop',
      appCategoryType: 'public.app-category.education',
      extendInfo: { LSMinimumSystemVersion: '13.0.0', CFBundleDisplayName: metadata.productName },
      icon,
      osxSign: {
        identity: '-',
        identityValidation: false,
        optionsForFile: () => ({
          entitlements: ['com.apple.security.cs.allow-jit', 'com.apple.security.cs.disable-library-validation'],
        }),
      },
    } : {}),
  });
  if (!bundleDir) throw new Error(`没有生成 ${key} 的应用目录。`);
  await verifyNotices(bundleDir, target);

  const filename = `ProjectionLab-${metadata.version}-${target.label}-${target.arch}.zip`;
  const temporaryArchive = join(release, `.${filename}.${process.pid}.tmp.zip`);
  try {
    if (mac) {
      const app = join(bundleDir, `${target.name}.app`);
      run('/usr/bin/codesign', ['--verify', '--deep', '--strict', app]);
      run('/usr/bin/ditto', ['-c', '-k', '--keepParent', app, temporaryArchive]);
    } else {
      const folder = join(dirname(bundleDir), 'ProjectionLab');
      await rename(bundleDir, folder);
      run('/usr/bin/zip', ['-qr', temporaryArchive, basename(folder)], { cwd: dirname(folder) });
    }
    await rename(temporaryArchive, join(release, filename));
    console.log(`已生成 ${filename}`);
  } finally {
    await rm(temporaryArchive, { force: true });
  }
}

try {
  await mkdir(release, { recursive: true });
  await rm(join(release, 'SHA256SUMS.txt'), { force: true });
  await mkdir(join(work, 'web'), { recursive: true });
  await copyFile(join(desktop, 'main.cjs'), join(work, 'main.cjs'));
  await Promise.all(webFiles.map(file => copyFile(join(source, file), join(work, 'web', file))));
  await writeFile(join(work, 'package.json'), JSON.stringify({
    name: metadata.name,
    productName: metadata.productName,
    version: metadata.version,
    author: metadata.author,
    license: metadata.license,
    main: 'main.cjs',
  }));

  const selected = requested.length ? requested : Object.keys(targets);
  const results = await Promise.allSettled(selected.map(async key =>
    buildTarget(key, key === 'macos' ? await makeMacIcon() : undefined)));
  const failures = results.flatMap((result, i) => result.status === 'rejected' ? [[selected[i], result.reason]] : []);
  for (const [key, error] of failures) console.error(key, error);
  if (failures.length) process.exitCode = 1;
  else await writeChecksums();
} finally {
  await rm(scratch, { recursive: true, force: true });
}
