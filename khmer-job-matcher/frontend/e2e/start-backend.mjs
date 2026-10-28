import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const backend = fileURLToPath(new URL('../../backend', import.meta.url))
const child = spawn(process.env.E2E_PYTHON || 'python', ['tests/e2e_server.py'], { cwd: backend, stdio: 'inherit', shell: false })
child.on('error', error => { console.error('Cannot start the isolated test backend:', error.message); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
