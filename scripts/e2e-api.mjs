import { spawn } from 'node:child_process';
import { cp, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

if (!process.env.E2E_DATABASE) throw new Error('E2E_DATABASE must point to a dedicated PostgreSQL test database.');
const projectRoot = process.cwd();
const dotnet = process.env.DOTNET_ROOT ? join(process.env.DOTNET_ROOT, process.platform === 'win32' ? 'dotnet.exe' : 'dotnet') : 'dotnet';
const output = join(projectRoot, 'artifacts', 'e2e', 'api');
const env = { ...process.env, ASPNETCORE_ENVIRONMENT: 'Testing', ASPNETCORE_URLS: 'http://127.0.0.1:5081',
  ConnectionStrings__Database: process.env.E2E_DATABASE,
  Bootstrap__AdminEmail: 'e2e-admin@example.org', Bootstrap__AdminPassword: 'E2e-Initial-Password-123!',
  Storage__Root: join(projectRoot, 'artifacts', 'e2e', 'files'),
  DataProtection__KeyDirectory: join(projectRoot, 'artifacts', 'e2e', 'keys') };
function run(executable, args, cwd = projectRoot) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { env, cwd, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Build/migration exited ${code}`)));
  });
}
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
// Use Node to invoke npm on Windows so no shell escaping is needed.
if (process.platform === 'win32') {
  const npmCli = join(process.execPath, '..', 'node_modules', 'npm', 'bin', 'npm-cli.js');
  await run(process.execPath, [npmCli, 'run', 'build']);
} else await run(npmCommand, ['run', 'build']);
await run(dotnet, ['publish', 'backend/Kurum360.Api', '-c', 'Release', '-o', output]);
await mkdir(join(output, 'wwwroot'), { recursive: true });
await cp(join(projectRoot, 'dist'), join(output, 'wwwroot'), { recursive: true });
await run(dotnet, ['Kurum360.Api.dll', '--migrate'], output);
const server = spawn(dotnet, ['Kurum360.Api.dll'], { env, cwd: output, stdio: 'inherit' });
server.on('exit', code => process.exit(code ?? 0));
process.on('SIGINT', () => server.kill()); process.on('SIGTERM', () => server.kill());
