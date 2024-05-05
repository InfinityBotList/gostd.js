import { byte, int } from '../internal/core/baseTypes'
import { IndexByte as ib, IndexByteString as ibs } from '../internal/core/bytealg'

/**
 * IndexByte returns the index of the first instance of c in b, or -1 if c is not present in b.
 */
export function IndexByte(b: Uint8Array, c: byte): int {
    return ib(b, c)
}

/**
 * IndexByteString returns the index of the first instance of c in s, or -1 if c is not present in s.
 */
export function IndexByteString(s: string, c: byte): int {
    return ibs(s, c)
}

/**
 * Clone returns a copy of b[:len(b)]. The result may have additional unused capacity. Clone(nil) returns nil.
 */
export function Clone(b: Uint8Array | null): Uint8Array | null {
    if(b === null) {
        return null
    }

    return b.slice()
}