import { encryptSecret } from '../src/lib/shift-reports/crypto.ts'

if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
  process.stderr.write('Run this command in an interactive terminal so the bot token is not echoed.\n')
  process.exit(1)
}

let token = ''
process.stdout.write('Telegram bot token (input hidden): ')
process.stdin.setRawMode(true)
process.stdin.setEncoding('utf8')
process.stdin.resume()
process.stdin.on('data', (key) => {
  if (key === '\u0003') {
    process.stdout.write('\nCancelled.\n')
    process.exit(1)
  }
  if (key === '\r' || key === '\n') {
    process.stdin.setRawMode(false)
    process.stdin.pause()
    process.stdout.write('\n')
    try {
      process.stdout.write(`${encryptSecret(token.trim())}\n`)
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.message : 'Could not encrypt token.'}\n`)
      process.exitCode = 1
    }
    return
  }
  if (key === '\u007f' || key === '\b') token = token.slice(0, -1)
  else if (key >= ' ') token += key
})
