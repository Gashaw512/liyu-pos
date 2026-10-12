import { access } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, extname, resolve as resolvePath, sep } from 'node:path'

const sourceRoot = resolvePath(process.cwd(), 'src')

async function existingTsModule(path) {
  const candidates = extname(path)
    ? [path]
    : [`${path}.ts`, `${path}.tsx`, `${path}.js`, resolvePath(path, 'index.ts')]

  for (const candidate of candidates) {
    try {
      await access(candidate)
      return candidate
    } catch {
      // Try the next TypeScript/JavaScript module candidate.
    }
  }

  return null
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const path = await existingTsModule(resolvePath(sourceRoot, specifier.slice(2)))
    if (path) return nextResolve(pathToFileURL(path).href, context)
  }

  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    const parentPath = fileURLToPath(context.parentURL)
    if (parentPath.startsWith(`${sourceRoot}${sep}`)) {
      const path = await existingTsModule(resolvePath(dirname(parentPath), specifier))
      if (path) return nextResolve(pathToFileURL(path).href, context)
    }
  }

  return nextResolve(specifier, context)
}
