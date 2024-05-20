export function mapObject(obj: object, fn: (key: string, value: any) => [string, any]): object {
    return Object.fromEntries(Object.entries(obj).map(([key, value]) => fn(key, value)))
}

export function arrayOfStringToObject(arr: string[], keyValueSeparator = '='): { [k: string]: string } {
    return Object.fromEntries(arr.map((item) => {
        const [key, value] = item.split(keyValueSeparator)
        return [key, value]
    }))
}
