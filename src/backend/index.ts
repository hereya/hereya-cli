import {Backend} from './common.js'
import {LocalBackend} from './local.js'

export const localBackend = new LocalBackend()

export async function getBackend(): Promise<Backend> {
  return localBackend
}
