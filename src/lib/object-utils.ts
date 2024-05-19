export function mapObject(obj: object, fn: (key: string, value: any) => [string, any]): object {
    return Object.fromEntries(Object.entries(obj).map(([key, value]) => fn(key, value)))
}
