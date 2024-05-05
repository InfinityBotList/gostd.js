import * as io from "../../io/io"
import { int64 } from "./baseTypes"

/**
 * A Buffer is a variable-sized buffer of bytes with Read and Write methods.
 * 
 * An implementation of Go's io.ByteReader interface
 */
export class Buffer implements io.ByteReader, io.Reader, io.ReaderAt, io.ReaderFrom, io.ByteWriter, io.Writer, io.WriterAt, io.WriterTo {
    private buf: Uint8Array
    private _readAllOnCopy: boolean

    constructor(buf: Uint8Array, readAllOnCopy: boolean = true) {
        this.buf = buf
        this._readAllOnCopy = readAllOnCopy
    }

    /**
     * Get the underlying Uint8Array
     */
    get underlyingArray (): Uint8Array {
        return this.buf
    }

    // readByte reads the next byte from the input buffer.
    // Equivalent to r.ReadByte() in io.ByteReader
    ReadByte(): [number, Error | null] {
        if (this.buf.length == 0) {
            return [0, new Error(io.Errors.EOF)]
        }

        let b = this.buf[0]
        this.buf = this.buf.subarray(1)
        return [b, null]
    }

    // Read reads data into p implementing the io.Reader interface
    Read(p: Uint8Array): [number, Error | null] {
        let n = this.buf.length
        if (n == 0) {
            return [0, new Error(io.Errors.EOF)]
        }

        if (n > p.length) {
            n = p.length
        }

        p.set(this.buf.subarray(0, n))
        this.buf = this.buf.subarray(n)
        return [n, null]
    }

    // ReadAt reads len(p) bytes into p starting at offset off in the underlying input source
    ReadAt(p: Uint8Array, off: int64): [int64, Error | null] {
        let n = this.buf.length
        if (n == 0) {
            return [0, new Error(io.Errors.EOF)]
        }

        if (n > p.length) {
            n = p.length
        }

        p.set(this.buf.subarray(0, n), off)
        this.buf = this.buf.subarray(n)
        return [n, null]
    }

    // ReadFrom reads data from r until EOF or error
    ReadFrom(r: io.Reader): [number, Error | null] {
        if(this._readAllOnCopy) {
            let [buf, err] = io.ReadAll(r)

            this.buf = buf

            return [buf.length, err]
        }

        let [n, err] = r.Read(this.buf)

        return [n, err]
    }

    // WriteByte writes a single byte to the buffer
    WriteByte(b: number): Error | null {
        this.buf = Uint8Array.from([...this.buf, b])
        return null
    }

    // Write writes len(p) bytes from p to the buffer
    Write(p: Uint8Array): [number, Error | null] {
        this.buf = Uint8Array.from([...this.buf, ...p])
        return [p.length, null]
    }

    // WriteAt writes len(p) bytes from p to the buffer starting at offset off
    WriteAt(p: Uint8Array, off: number): [number, Error | null] {
        this.buf = Uint8Array.from([...this.buf.subarray(0, off), ...p, ...this.buf.subarray(off)])
        return [p.length, null]
    }

    // WriteTo writes data to w until there's no more data to write or when an error occurs
    WriteTo(w: io.Writer): [number, Error | null] {
        let [n, err] = w.Write(this.buf)
        this.buf = this.buf.subarray(n)
        return [n, err]
    }
}
