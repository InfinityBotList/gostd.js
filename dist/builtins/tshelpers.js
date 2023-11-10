"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrowableUint8Array = exports.mergeUint8Arrays = exports.uint8Copy = exports.is = void 0;
function is(object, prop) {
    return prop in object;
}
exports.is = is;
/**
 * Copies elements from src to dst returning a minimum of len(src) and len(dst)
 *
 * @param dst The Uint8Array to copy to
 * @param src The source bytestream or Uint8Array to copy from
 */
function uint8Copy(dst, src) {
    let i = 0;
    for (; i < dst.length; i++) {
        dst[i] = src[i];
    }
    // Return the number of bytes copied
    return (src.length > dst.length) ? dst.length : src.length;
}
exports.uint8Copy = uint8Copy;
function mergeUint8Arrays(arrays) {
    const totalSize = arrays.reduce((acc, e) => acc + e.length, 0);
    const merged = new Uint8Array(totalSize);
    arrays.forEach((array, i, arrays) => {
        const offset = arrays.slice(0, i).reduce((acc, e) => acc + e.length, 0);
        merged.set(array, offset);
    });
    return merged;
}
exports.mergeUint8Arrays = mergeUint8Arrays;
/**
 * Growable Uint8Array with length and capacity
 */
class GrowableUint8Array {
    _array;
    _length;
    constructor(length, capacity) {
        this._array = new Uint8Array(capacity);
        this._length = length;
    }
    get capacity() {
        return this._array.length;
    }
    get length() {
        console.log("Length", this._length);
        return this._length;
    }
    get underlyingArray() {
        return this._array.subarray(0, this._array.length);
    }
    // From returns a new GrowableUint8Array from the given Uint8Array
    static from(array) {
        let ga = new GrowableUint8Array(array.length, array.length);
        ga.append(array);
        return ga;
    }
    /**
     * Grow the array to the given capacity
     * @param capacity The new capacity of the array
     */
    growCap(capacity) {
        if (capacity < this.capacity) {
            throw new Error("Cannot grow array to a smaller capacity");
        }
        console.log("Grow array to", capacity);
        let newArray = new Uint8Array(capacity);
        for (let i = 0; i < this._array.length; i++) {
            newArray[i] = this._array[i];
        }
        this._array = newArray;
    }
    /**
     * Set the array to the given length
     * @param length The new length of the array
     */
    setLength(length) {
        if (length > this.capacity) {
            throw new Error("Cannot set length to a value larger than the capacity");
        }
        if (length < this.length) {
            throw new Error("Cannot change array to a smaller length");
        }
        this._length = length;
    }
    /**
     * Grow the array to the given capacity and resize the length to the given length
     */
    grow(length) {
        this.growCap(length);
        this.setLength(length);
    }
    /**
     * Write the given bytes to the array at the given offset
     */
    write(bytes, offset) {
        let needed = (offset + bytes.length);
        if (needed > this.capacity) {
            this.growCap(needed + 8);
            this.setLength(needed);
        }
        this._array.set(bytes, offset);
    }
    /**
     * Append the given bytes to the array
     * @param bytes The bytes to append
     */
    append(bytes) {
        this.write(bytes, this.length);
    }
    /**
     * Read the given bytes from the array at the given offset
     */
    read(offset, length) {
        if ((offset + length) > this.length) {
            throw new Error("Cannot read past the end of the array");
        }
        return this._array.subarray(offset, offset + length);
    }
    /**
     * Subarray returns a new Uint8Array slice of the array
     */
    subarray(begin, end) {
        if (end === undefined) {
            end = this.length;
        }
        // Clamp the end to the length
        if (end > this.capacity) {
            this.grow(end);
        }
        return this._array.subarray(begin, end);
    }
    /**
     * Shrink the array to a subarray given by begin and end
     */
    shrink(begin, end) {
        this._array = this._array.subarray(begin, end);
    }
}
exports.GrowableUint8Array = GrowableUint8Array;
