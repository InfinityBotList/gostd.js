/**
 * Copies elements from src to dst returning a minimum of len(src) and len(dst)
 * 
 * @param dst The Uint8Array to copy to
 * @param src The source bytestream or Uint8Array to copy from
 */
export const uint8Copy = (dst: Uint8Array, src: number[] | Uint8Array) => {
    let i = 0;
    for(; i < dst.length; i++) {
        dst[i] = src[i];
    };

    // Return the number of bytes copied
    return Math.min(dst.length, src.length);
};

/**
 * 
 * @param arrays The arrays to merge
 * @returns A new Uint8Array containing the merged arrays
 */
export const mergeUint8Arrays = (arrays: Uint8Array[]): Uint8Array => {
    const totalSize = arrays.reduce((acc, e) => acc + e.length, 0);
    const merged = new Uint8Array(totalSize);
  
    for(let i = 0, offset = 0; i < arrays.length; i++) {
        merged.set(arrays[i], offset);
        offset += arrays[i].length;
    };
  
    return merged;
}  

export function bytesFromString(s: string): Uint8Array {
    return new TextEncoder().encode(s);
}
