import { byte, int } from "../baseTypes"

export function IndexByte(b: Uint8Array, c: byte): int {
    return b.indexOf(c) || -1
}

export function IndexByteString(s: string, c: byte): int {
    return s.indexOf(String.fromCharCode(c)) || -1
}