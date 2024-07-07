export function mapObject(obj: object, fn: (key: string, value: any) => [string, any]): object {
    return Object.fromEntries(Object.entries(obj).map(([key, value]) => fn(key, value)))
}

export function arrayOfStringToObject(arr: string[], keyValueSeparator = '='): { [k: string]: string } {
    return Object.fromEntries(arr.map((item) => {
        const [key, value] = item.split(keyValueSeparator)
        return [key, value]
    }))
}

export function objectToBase64(obj: object): string {
    return Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=*$/, '')
}

export function base64ToJSONString(base64: string): string {
    const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=')
    return Buffer.from(paddedBase64, 'base64').toString('utf8')
}

export function tryBase64ToJSONString(base64: string): string {
    try {
        const value = base64ToJSONString(base64)
        if (typeof JSON.parse(value) === 'object') {
            return value
        }

        return base64
    } catch {
        return base64
    }
}
