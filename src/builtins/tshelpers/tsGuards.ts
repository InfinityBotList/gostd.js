export function is<T>(object: any, prop: string): object is T {
    return prop in object;
}