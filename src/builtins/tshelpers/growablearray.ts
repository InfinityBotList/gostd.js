/**
 * Growable Uint8Array with length and capacity
 */
export class GrowableUint8Array {
    private _array: Uint8Array;
    private _length: number;

    constructor(length: number, capacity: number) {
        this._array = new Uint8Array(capacity);
        this._length = length;
    }

    get capacity(): number {
        return this._array.length;
    }

    get length(): number {
        console.log("Length", this._length)
        return this._length;
    }

    get array(): Uint8Array {
        return this._array.subarray(0, this._array.length);
    }
    
    // From returns a new GrowableUint8Array from the given Uint8Array
    static from(array: Uint8Array): GrowableUint8Array {
        let ga = new GrowableUint8Array(array.length, array.length);
        ga.append(array);

        return ga;
    }

    /**
     * Grow the array to the given capacity
     * @param capacity The new capacity of the array
     */
    growCap(capacity: number) {
        if(capacity < this.capacity) {
            throw new Error("Cannot grow array to a smaller capacity");
        }

        console.log("Grow array to", capacity)

        let newArray = new Uint8Array(capacity);
    
        for(let i = 0; i < this._array.length; i++) {
            newArray[i] = this._array[i];
        }

        this._array = newArray;
    }

    /**
     * Set the array to the given length
     * @param length The new length of the array
     */
    setLength(length: number) {
        if(length > this.capacity) {
            throw new Error("Cannot set length to a value larger than the capacity");
        }
        
        if(length < this.length) {
            throw new Error("Cannot change array to a smaller length");
        }

        this._length = length;
    }

    /**
     * Grow the array to the given capacity and resize the length to the given length
     */
    grow(length: number) {
        this.growCap(length);
        this.setLength(length);
    }

    /**
     * Write the given bytes to the array at the given offset
     */
    write(bytes: Uint8Array, offset: number) {
        let needed = (offset + bytes.length)
        if(needed > this.capacity) {
            this.growCap(needed + 8);
            this.setLength(needed)
        }

        this._array.set(bytes, offset);
    }

    /**
     * Append the given bytes to the array
     * @param bytes The bytes to append
     */
    append(bytes: Uint8Array) {
        this.write(bytes, this.length)
    }    

    /**
     * Read the given bytes from the array at the given offset
     */
    read(offset: number, length: number): Uint8Array {
        if((offset + length) > this.length) {
            throw new Error("Cannot read past the end of the array");
        }

        return this._array.subarray(offset, offset + length);
    }

    /**
     * Subarray returns a new Uint8Array slice of the array
     */
    subarray(begin: number, end?: number): Uint8Array {
        if(end === undefined) {
            end = this.length;
        }

        // Clamp the end to the length
        if(end > this.capacity) {
            this.grow(end);
        }

        return this._array.subarray(begin, end);
    }

    /**
     * Shrink the array to a subarray given by begin and end
     */
    shrink(begin: number, end: number) {
        this._array = this._array.subarray(begin, end);
    }
}