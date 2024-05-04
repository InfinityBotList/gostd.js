// A set of core IO primitizes commonly used in Go

import { mergeUint8Arrays } from "../builtins/tshelpers/arrays"
import { is } from "../builtins/tshelpers/tsGuards"

// IO Errors
export enum Errors {
    // EOF is the error returned by Read when no more input is available.
    // (Read must return EOF itself, not an error wrapping EOF,
    // because callers will test for EOF using ==.)
    // Functions should return EOF only to signal a graceful end of input.
    // If the EOF occurs unexpectedly in a structured data stream,
    // the appropriate error is either [ErrUnexpectedEOF] or some other error
    // giving more detail.
    EOF = "EOF",

    // ErrUnexpectedEOF means that EOF was encountered in the
    // middle of reading a fixed-size block or data structure.
    UnexpectedEOF = "unexpected EOF",

    // errInvalidWrite means that a write returned an impossible count.
    InvalidWrite = "invalid write result",

    // ErrShortWrite means that a write accepted fewer bytes than requested
    // but failed to return an explicit error.
    ShortWrite = "short write"
}

/**
 * io.Reader from Golang 
 * 
 * Reader is the interface that wraps the basic Read method
 * 
 * Read reads up to len(p) bytes into p. It returns the number of bytes read (0 <= n <= len(p)) and any error encountered. Even if Read returns n < len(p), it may use all of p as scratch space during the call. If some data is available but not len(p) bytes, Read conventionally returns what is available instead of waiting for more.
 * 
 * *SEMANTIC DIFFERENCES TO GO:*
 * 
 * Instead of a []byte, the JS implementation uses a Uint8Array of size len(p)
 * 
 * This is done to avoid mutability issues with JS arrays
 */
export interface Reader {
    Read(p: Uint8Array): [number, Error | null]
}

/**
 * io.ByteReader from Golang 
 * 
 * ByteReader is the interface that wraps the ReadByte method
 * 
 * ReadByte reads and returns the next byte from the input or any error encountered. If ReadByte returns an error, no input byte was consumed, and the returned byte value is undefined.
 */
export interface ByteReader {
    ReadByte(): [number, Error | null]
}

/**
 * io.ReaderAt from Golang
 * 
 * ReaderAt is the interface that wraps the basic ReadAt method.
 *
 * ReadAt reads len(p) bytes into p starting at offset off in the underlying input source. It returns the number of bytes read (0 <= n <= len(p)) and any error encountered.
 *
 * When ReadAt returns n < len(p), it returns a non-nil error explaining why more bytes were not returned. In this respect, ReadAt is stricter than Read.
 *
 * Even if ReadAt returns n < len(p), it may use all of p as scratch space during the call. If some data is available but not len(p) bytes, ReadAt blocks until either all the data is available or an error occurs. In this respect ReadAt is different from Read.
 *
 * If the n = len(p) bytes returned by ReadAt are at the end of the input source, ReadAt may return either err == EOF or err == nil.
 *
 * If ReadAt is reading from an input source with a seek offset, ReadAt should not affect nor be affected by the underlying seek offset.
 *
 * Clients of ReadAt can execute parallel ReadAt calls on the same input source.
 *
 * Implementations must not retain p.
 *
 * *SEMANTIC DIFFERENCES TO GO:*
 *
 * Instead of a []byte, the JS implementation uses a Uint8Array of size len(p)
 *
 * This is done to avoid mutability issues with JS arrays
 */
export interface ReaderAt {
    ReadAt(p: Uint8Array, off: number): [number, Error | null]
}

/** 
 * io.ReaderFrom from Golang
 * 
 * ReaderFrom is the interface that wraps the ReadFrom method
 * 
 * ReadFrom reads data from r until EOF or error. The return value n is the number of bytes read. Any error except EOF encountered during the read is also returned.
 *
 * The Copy function uses ReaderFrom if available.
 */
export interface ReaderFrom {
    ReadFrom(r: Reader): [number, Error | null]
}

/**
 * io.ByteWriter from Golang
 * 
 * ByteWriter is the interface that wraps the WriteByte method
 */
export interface ByteWriter {
    WriteByte(b: number): Error | null
}

/**
 * io.Writer from Golang
 * 
 * Writer is the interface that wraps the basic Write method
 * 
 * Write writes len(p) bytes from p to the underlying data stream. It returns the number of bytes written from p (0 <= n <= len(p)) and any error encountered that caused the write to stop early. Write must return a non-nil error if it returns n < len(p). Write must not modify the slice data, even temporarily.
 *
 * Implementations must not retain p.
 * 
 * *SEMANTIC DIFFERENCES TO GO:*
 * 
 * Instead of a []byte, the JS implementation uses a Uint8Array of size len(p). This is done for performance purposes (avoiding Array.from)
 */
export interface Writer {
    Write(p: Uint8Array): [number, Error | null]
}

/**
 * io.WriterAt from Golang
 * 
 * WriterAt is the interface that wraps the basic WriteAt method
 * 
 * WriteAt writes len(p) bytes from p to the underlying data stream at offset off. It returns the number of bytes written from p (0 <= n <= len(p)) and any error encountered that caused the write to stop early. WriteAt must return a non-nil error if it returns n < len(p). WriteAt must not modify the slice data, even temporarily.
 * 
 * *SEMANTIC DIFFERENCES TO GO:*
 * 
 * Instead of a []byte/TS number[], the JS implementation uses a Uint8Array of size len(p). This is done for performance purposes (avoiding Array.from)
 */
export interface WriterAt {
    WriteAt(p: Uint8Array, off: number): [number, Error | null]
}

/**
 * io.WriterTo from Golang
 * 
 * WriteTo writes data to w until there's no more data to write or when an error occurs. The return value n is the number of bytes written. Any error encountered during the write is also returned.
 *
 * The Copy function uses WriterTo if available.
 */
export interface WriterTo {
    WriteTo(w: Writer): [number, Error | null]
}

/**
 * ReadCloser is the interface that groups the basic Read and Close methods.
 */
export interface ReadCloser extends Reader, Closer {}

/**
 * WriteCloser is the interface that groups the basic Write and Close methods.
 */
export interface WriteCloser extends Writer, Closer {}

/**
 * ReadWriteCloser is the interface that groups the basic Read, Write and Close methods.
 */
export interface ReadWriteCloser extends Reader, Writer, Closer {}

/**
 * A LimitedReader reads from R but limits the amount of
 * data returned to just N bytes. Each call to Read
 * updates N to reflect the new amount remaining.
 * Read returns EOF when N <= 0 or when the underlying R returns EOF.
 */
export class LimitedReader implements Reader {
    __isLimitedReader: boolean = true // JS doesn't support typecases: https://cs.opensource.google/go/go/+/master:src/io/io.go;l=407
    private r: Reader
    n: number

    constructor(r: Reader, n: number) {
        this.r = r
        this.n = n
    }

    Read(p: Uint8Array): [number, Error | null] {
        if (this.n <= 0) {
            return [0, new Error(Errors.EOF)]
        }

        if (p.length > this.n) {
            p = p.subarray(0, this.n)
        }

        let [n, err] = this.r.Read(p)
        this.n -= n
        return [n, err]
    }
}

/**
 * Copy copies from src to dst until either EOF is reached
 * on src or an error occurs. It returns the number of bytes
 * copied and the first error encountered while copying, if any.
 * 
 * A successful Copy returns err == null, not err == EOF.
 * Because Copy is defined to read from src until EOF, it does
 * not treat an EOF from Read as an error to be reported.
 * 
 * If src implements [WriterTo],
 * the copy is implemented by calling src.WriteTo(dst).
 * Otherwise, if dst implements [ReaderFrom],
 * the copy is implemented by calling dst.ReadFrom(src).
 * 
 * @param dst Writer to copy to
 * @param src Reader to copy from
 * @returns 
 */
export function Copy(dst: Writer, src: Reader): [number, Error | null] {
    return copyBuffer(dst, src, null)
}
/** 
 * CopyBuffer is identical to Copy except that it stages through the
 * provided buffer (if one is required) rather than allocating a
 * temporary one. If buf is null, one is allocated; otherwise if it has
 * zero length, CopyBuffer panics.
 * 
 * If either src implements [WriterTo] or dst implements [ReaderFrom],
 * buf will not be used to perform the copy.
 * 
 * @param dst Writer to copy to
 * @param src Reader to copy from
 * @param buf Buffer to use
*/
export function CopyBuffer(dst: Writer, src: Reader, buf: Uint8Array): [number, Error | null] {
    if (buf != null && buf.length == 0) {
        throw new Error("empty buffer in CopyBuffer")
    }
    return copyBuffer(dst, src, buf)
}

// copyBuffer is the actual implementation of Copy and CopyBuffer.
// if buf is nil, one is allocated.
function copyBuffer(dst: Writer, src: Reader, buf?: Uint8Array | null): [number, Error | null] {
    // If the reader has a WriteTo method, use it to do the copy.
	// Avoids an allocation and a copy.
    if(is<WriterTo>(src, "WriteTo")) {
        return src.WriteTo(dst)
    }

    // Similarly, if the writer has a ReadFrom method, use it to do the copy.
    if(is<ReaderFrom>(dst, "ReadFrom")) {
        return dst.ReadFrom(src)
    }

    if(buf == null) {
        let size = 32 * 1024 

        // Check if LimitedReader [https://cs.opensource.google/go/go/+/master:src/io/io.go;l=419]
        if(is<LimitedReader>(src, "__isLimitedReader")) {
            if(src.n < 1) {
                size = 1
            } else {
                size = src.n
            }
        }

        // TODO: There is a extra 'LimitedReader' here. IO port here does not have a limited reader
        // https://cs.opensource.google/go/go/+/master:src/io/io.go;l=419
        buf = new Uint8Array(size)
    }

    let written = 0 // This is defined in the go function declration, but JS doesn't support this: https://cs.opensource.google/go/go/+/master:src/io/io.go;l=407
    let err: Error | null = null // This is defined in the go function declration, but JS doesn't support this: https://cs.opensource.google/go/go/+/master:src/io/io.go;l=407

    while(true) { // for {}, https://cs.opensource.google/go/go/+/master:src/io/io.go;l=428
        let [nr, er] = src.Read(buf)

        if(nr > 0) {
            let [nw, ew] = dst.Write(buf.subarray(0, nr)) // nw, ew := dst.Write(buf[0:nr])

            if(nw < 0 || nr < nw) {
                nw = 0
                if(ew == null) {
                    ew = new Error(Errors.InvalidWrite)
                }
            }
            written += nw // written += int64(nw)

            if(ew != null) {
                err = ew
                break
            }

            if(nr != nw) {
                err = new Error(Errors.ShortWrite)
                break
            }
        }

        if(er != null) {
            if(er.message != Errors.EOF) {
                err = er
            }
            break
        }
    }

    return [written, err]
}

/**
 * ReadAll reads from r until an error or EOF and returns the data it read.
 * A successful call returns err == null, not err == EOF. Because ReadAll is
 * defined to read from src until EOF, it does not treat an EOF from Read
 * as an error to be reported.
 * 
 * *SEMANTIC DIFFERENCES TO GO:*
 * 
 * The internal implementation of this is slightly different to Go's due to language differences
 * 
 * @param r Reader to read from
 * @returns Uint8Array of data read and error
 */
export function ReadAll(r: Reader): [Uint8Array, Error | null] {
    const perStream = 512 // 512 bits per stream

    let b: Uint8Array[] = []
    while(true) { // for {}
        let _buf = new Uint8Array(perStream)
        let [n, err] = r.Read(_buf)

        b.push(_buf.subarray(0, n))

        if(err != null) {
            if(err.message == Errors.EOF) {
                err = null
            }
            
            let arr = mergeUint8Arrays(b)

            return [arr, err]
        }
    }
}

/**
 * Closer is the interface that wraps the basic Close method.
 * 
 * The behavior of Close after the first call is undefined.
 * Specific implementations may document their own behavior.
 */
export interface Closer {
	Close(): Error | null
}

/**
 * Seeker is the interface that wraps the basic Seek method.
 * 
 * Seek sets the offset for the next Read or Write to offset,
 * interpreted according to whence:
 * [SeekStart] means relative to the start of the file,
 * [SeekCurrent] means relative to the current offset, and
 * [SeekEnd] means relative to the end
 * (for example, offset = -2 specifies the penultimate byte of the file).
 * Seek returns the new offset relative to the start of the
 * file or an error, if any.
 * 
 * Seeking to an offset before the start of the file is an error.
 * Seeking to any positive offset may be allowed, but if the new offset exceeds
 * the size of the underlying object the behavior of subsequent I/O operations
 * is implementation-dependent.
 */
export interface Seeker {
    Seek(offset: number, whence: number): [number, Error]
}