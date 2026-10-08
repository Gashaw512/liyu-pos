import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

register('./node-resolve-loader.mjs', pathToFileURL('./tests/'))
