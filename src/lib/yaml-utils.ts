import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse, stringify } from 'yaml';

export async function save<T extends object>(content: T, file: string) {
    try {
        await mkdir(path.dirname(file), { recursive: true })
        await writeFile(file, stringify(content), {encoding: 'utf8'})
    } catch (error) {
        throw new Error(`could not save data to file ${file} ${error}`)
    }
}

export async function load<T extends object>(file: string): Promise<{ data: T, found: boolean }> {
    let data: T = {} as T
    let found = false

    try {
        const content = await readFile(file, {encoding: 'utf8'})
        data = parse(content)
        found = true

    } catch (error: any) {
        if (error.code !== 'ENOENT') {
            throw new Error(`could not load file ${file}: ${error}`)
        }
    }

    return {data: data || {}, found}
}

