// A set of core IO primitizes commonly used in Go

import { bytesFromString, mergeUint8Arrays } from "../internal/tshelpers/arrays"
import { byte, int, int64, nil, error } from '../internal/tshelpers/baseTypes';
import { rune } from "../internal/tshelpers/rune"
import { is } from "../internal/tshelpers/tsGuards"

// Seek whence values.
export const SeekStart = 0 // seek relative to the origin of the file
export const SeekCurrent = 1 // seek relative to the current offset
export const SeekEnd = 2 // seek relative to the end

// IO Errors
export enum Errors {
    // ErrShortWrite means that a write accepted fewer bytes than requested
    // but failed to return an explicit error.
    ShortWrite = "short write",

    // ErrShortBuffer means that a read required a longer buffer than was provided.
    ShortBuffer = "short buffer",
    
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

    // ErrNoProgress is returned by some clients of a [Reader] when
    // many calls to Read have failed to return any data or error,
    // usually the sign of a broken [Reader] implementation.
    ErrNoProgress = "multiple Read calls return no data or error",

    // errInvalidWrite means that a write returned an impossible count.
    InvalidWrite = "invalid write result",
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
    Read(p: Uint8Array): [int, error]
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
    Write(p: Uint8Array): [int, error]
}

/**
 * Closer is the interface that wraps the basic Close method.
 * 
 * The behavior of Close after the first call is undefined.
 * Specific implementations may document their own behavior.
 */
export interface Closer {
	Close(): error
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
    Seek(offset: int64, whence: number): [int64, error]
}

// ReadWriter is the interface that groups the basic Read and Write methods.
export interface ReadWriter extends Reader, Writer {}

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
 * ReadSeeker is the interface that groups the basic Read and Seek methods.
 */
export interface ReadSeeker extends Reader, Seeker {}

/**
 * ReadSeekCloser is the interface that groups the basic Read, Seek and Close methods.
 */
export interface ReadSeekCloser extends Reader, Seeker, Closer {}

/**
 * WriteSeeker is the interface that groups the basic Write and Seek methods.
 */
export interface WriteSeeker extends Writer, Seeker {}

/**
 * ReadWriteSeeker is the interface that groups the basic Read, Write and Seek methods.
 */
export interface ReadWriteSeeker extends Reader, Writer, Seeker {}

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
    ReadFrom(r: Reader): [int64, error]
}

/**
 * io.WriterTo from Golang
 * 
 * WriteTo writes data to w until there's no more data to write or when an error occurs. The return value n is the number of bytes written. Any error encountered during the write is also returned.
 *
 * The Copy function uses WriterTo if available.
 */
export interface WriterTo {
    WriteTo(w: Writer): [int64, error]
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
    ReadAt(p: Uint8Array, off: int64): [int64, error]
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
    WriteAt(p: Uint8Array, off: int64): [int64, error]
}

/**
 * io.ByteReader from Golang 
 * 
 * ByteReader is the interface that wraps the ReadByte method
 * 
 * ReadByte reads and returns the next byte from the input or any error encountered. If ReadByte returns an error, no input byte was consumed, and the returned byte value is undefined.
 */
export interface ByteReader {
    ReadByte(): [byte, error]
}

/**
 * ByteScanner is the interface that adds the UnreadByte method to the
 * basic ByteReader interface.
 * 
 * UnreadByte causes the next call to ReadByte to return the last byte read.
 * If the last operation was not a successful call to ReadByte, UnreadByte may
 * return an error, unread the last byte read (or the byte prior to the last
 * unread byte, or (in implementations that support the [Seeker] interface),
 * seek to one byte before the current offset.
 */
export interface ByteScanner extends ByteReader {
    UnreadByte(): error
}

/**
 * io.ByteWriter from Golang
 * 
 * ByteWriter is the interface that wraps the WriteByte method
 */
export interface ByteWriter {
    WriteByte(b: byte): error
}

/**
 * RuneReader is the interface that wraps the ReadRune method.
 * 
 * ReadRune reads a single encoded Unicode character
 * and returns the rune and its size in bytes. If no character is
 * available, err will be set.
 */
export interface RuneReader {
    ReadRune(): [rune, int, error]
}

/**
 * RuneScanner is the interface that adds the UnreadRune method to the
 * basic ReadRune method.
 * 
 * UnreadRune causes the next call to ReadRune to return the last rune read.
 * If the last operation was not a successful call to ReadRune, UnreadRune may
 * return an error, unread the last rune read (or the rune prior to the
 * last-unread rune), or (in implementations that support the [Seeker] interface)
 * seek to the start of the rune before the current offset.
 */
export interface RuneScanner extends RuneReader {
    UnreadRune(): error
}

/**
 * StringWriter is the interface that wraps the WriteString method.
 */
export interface StringWriter {
    WriteString(s: string): [number, error]
}

/**
 * WriteString writes the contents of the string s to w, which accepts a slice of bytes.
 * If w implements [StringWriter], [StringWriter.WriteString] is invoked directly.
 * Otherwise, [Writer.Write] is called exactly once.
 */
export function WriteString(w: Writer, s: string): [number, error] {
    if(is<StringWriter>(w, "WriteString")) {
        return w.WriteString(s)
    }
    return w.Write(bytesFromString(s))
}

/**
 * ReadAtLeast reads from r into buf until it has read at least min bytes.
 * It returns the number of bytes copied and an error if fewer bytes were read.
 * The error is EOF only if no bytes were read.
 * If an EOF happens after reading fewer than min bytes,
 * ReadAtLeast returns [ErrUnexpectedEOF].
 * If min is greater than the length of buf, ReadAtLeast returns [ErrShortBuffer].
 * On return, n >= min if and only if err == null.
 * If r returns an error having read at least min bytes, the error is dropped.
 */
export function ReadAtLeast(r: Reader, buf: Uint8Array, min: number): [number, error] {
    if(buf.length < min) {
        return [0, new Error(Errors.ShortBuffer)]
    }

    let n = 0
    let err: error = null
    while(n < min && err == null) {
        let nn: number
        [nn, err] = r.Read(buf.subarray(n))
        n += nn
    }

    if(n >= min) {
        err = null
    } else if(n > 0 && err?.message != Errors.EOF) {
        err = new Error(Errors.UnexpectedEOF)
    }

    return [n, err]
}

// ReadFull reads exactly len(buf) bytes from r into buf.
// It returns the number of bytes copied and an error if fewer bytes were read.
// The error is EOF only if no bytes were read.
// If an EOF happens after reading some but not all the bytes,
// ReadFull returns [ErrUnexpectedEOF].
// On return, n == len(buf) if and only if err == nil.
// If r returns an error having read at least len(buf) bytes, the error is dropped.

/**
 * ReadFull reads exactly len(buf) bytes from r into buf.
 * It returns the number of bytes copied and an error if fewer bytes were read.
 * The error is EOF only if no bytes were read.
 * If an EOF happens after reading some but not all the bytes,
 * ReadFull returns [ErrUnexpectedEOF].
 * On return, n == len(buf) if and only if err == nil.
 * If r returns an error having read at least len(buf) bytes, the error is dropped.
 */
export function ReadFull(r: Reader, buf: Uint8Array): [number, error] {
    return ReadAtLeast(r, buf, buf.length)
}

/**
 * CopyN copies n bytes (or until an error) from src to dst.
 * It returns the number of bytes copied and the earliest
 * error encountered while copying.
 * On return, written == n if and only if err == nil.
 * 
 * If dst implements [ReaderFrom], the copy is implemented using it.
 * @param dst Writer to copy to
 * @param src Reader to copy from
 * @param n Number of bytes to copy
 * @returns
 */
export function CopyN(dst: Writer, src: Reader, n: number): [number, error] {
    let [written, err] = Copy(dst, LimitReader(src, n))
    if(written == n) {
        return [n, null]
    }
    if(written < n && err == null) {
        // src stopped early; must have been EOF.
        err = new Error(Errors.EOF)
    }
    return [written, err]
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
export function Copy(dst: Writer, src: Reader): [number, error] {
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
export function CopyBuffer(dst: Writer, src: Reader, buf: Uint8Array): [number, error] {
    if (buf != null && buf.length == 0) {
        throw new Error("empty buffer in CopyBuffer")
    }
    return copyBuffer(dst, src, buf)
}

// copyBuffer is the actual implementation of Copy and CopyBuffer.
// if buf is nil, one is allocated.
function copyBuffer(dst: Writer, src: Reader, buf?: Uint8Array | null): [number, error] {
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
        if(is<LimitedReader>(src, "__isLimitedReader") && size > src.n) {
            if(src.n < 1) {
                size = 1
            } else {
                size = src.n
            }
        }

        // https://cs.opensource.google/go/go/+/master:src/io/io.go;l=419
        buf = new Uint8Array(size)
    }

    let written = 0 // This is defined in the go function declration, but JS doesn't support this: https://cs.opensource.google/go/go/+/master:src/io/io.go;l=407
    let err: error = null // This is defined in the go function declration, but JS doesn't support this: https://cs.opensource.google/go/go/+/master:src/io/io.go;l=407

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
 * LimitReader returns a Reader that reads from r
 * but stops with EOF after n bytes.
 * The underlying implementation is a *LimitedReader.
 */
export function LimitReader(r: Reader, n: number): Reader {
    return new LimitedReader(r, n)
}

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

    Read(p: Uint8Array): [number, error] {
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
 * NewSectionReader returns a [SectionReader] that reads from r
 * starting at offset off and stops with EOF after n bytes.
 */
export function NewSectionReader(r: ReaderAt, off: number, n: number): SectionReader {
    let remaining: int64;
    const maxint64 = Number.MAX_SAFE_INTEGER
	if(off <= maxint64-n) {
		remaining = n + off
	} else {
		// Overflow, with no way to return error.
		// Assume we can read up to an offset of Number.MAX_SAFE_INTEGER.
		remaining = maxint64
	}
    return new SectionReader(r, off, off, remaining, n)
}

// Internal errors for the SectionReader.
let errWhence = new Error("Seek: invalid whence")
let errOffset = new Error("Seek: invalid offset")

/**
 * SectionReader implements Read, Seek, and ReadAt on a section of an underlying
 * ReaderAt.
 */
export class SectionReader implements Reader, Seeker, ReaderAt {
    private r: ReaderAt // constant after creation
    private base: number = 0 // constant after creation
    private off: number = 0 // current offset in the section
    private limit: number = 0 // max offset in the section
    private n: number = 0 // number of bytes remaining in the section

    constructor(r: ReaderAt, base: number, off: number, limit: number, n: number) {
        this.r = r
        this.base = base
        this.off = off
        this.limit = limit
        this.n = n
    }

    Read(p: Uint8Array): [number, error] {
        if (this.off >= this.limit) {
            return [0, new Error(Errors.EOF)]
        }

        let max = this.limit - this.off
        if (p.length > max) {
            p = p.subarray(0, max)
        }

        let [n, err] = this.r.ReadAt(p, this.off)

        this.off += n
        return [n, err]
    }

    Seek(offset: number, whence: number): [number, error] {
        switch (whence) {
            default:
                return [0, errWhence]
            case SeekStart:
                offset += this.base
                break
            case SeekCurrent:
                offset += this.off
                break
            case SeekEnd:
                offset += this.limit
                break
        }

        if (offset < this.base) {
            return [0, errOffset]
        }
        this.off = offset
        return [offset - this.base, null]
    }

    ReadAt(p: Uint8Array, off: number): [number, error] {
        if(off < 0 || off >= this.Size()) {
            return [0, new Error(Errors.EOF)]
        }

        off += this.base
        let max = this.limit - off
        if(p.length > max) {
            p = p.subarray(0, max)
            let [n, err] = this.r.ReadAt(p, off)
            if(err == null) {
                err = new Error(Errors.EOF)
            }
            return [n, err]
        }
        return this.r.ReadAt(p, off)
    }

    /**
     * Size returns the size of the section in bytes.
     */
    Size(): int64 {
        return this.limit - this.base
    }

    /**
     * Outer returns the underlying [ReaderAt] and offsets for the section.
     * 
     * The returned values are the same that were passed to [NewSectionReader]
     * when the [SectionReader] was created.
     */
    Outer(): [ReaderAt, number, number] {
        return [this.r, this.base, this.n]
    }
}

/**
 * An OffsetWriter maps writes at offset base to offset base+off in the underlying writer.
 */
export class OffsetWriter implements Writer, WriterAt, Seeker {
    private w: WriterAt
    private base: int64 // the original offset
    private off: int64 // the current offset

    constructor(w: WriterAt, base: int64, off: int64) {
        this.w = w
        this.base = base
        this.off = off
    }

    Write(p: Uint8Array): [number, error] {
        let [n, err] = this.w.WriteAt(p, this.off)
        this.off += n
        return [n, err]
    }

    WriteAt(p: Uint8Array, off: number): [number, error] {
        if(off < 0) {
            return [0, errOffset]
        }
    
        off += this.base
        return this.w.WriteAt(p, off)
    }
    
    Seek(offset: number, whence: number): [number, error] {
        switch (whence) {
        default:
            return [0, errWhence]
        case SeekStart:
            offset += this.base
        case SeekCurrent:
            offset += this.off
        }
        if (offset < this.base) {
            return [0, errOffset]
        }
        this.off = offset
        return [offset - this.base, null]
    }
}

/**
 * TeeReader returns a [Reader] that writes to w what it reads from r.
 * All reads from r performed through it are matched with
 * corresponding writes to w. There is no internal buffering -
 * the write must complete before the read completes.
 * Any error encountered while writing is reported as a read error.
 */
export function TeeReader(r: Reader, w: Writer): Reader {
    return new teeReader(r, w)
}

class teeReader implements Reader {
    private r: Reader
    private w: Writer

    constructor(r: Reader, w: Writer) {
        this.r = r
        this.w = w
    }

    Read(p: Uint8Array): [number, error] {
        let [n, err] = this.r.Read(p)
        if(n > 0) {
            let [n2, err2] = this.w.Write(p.subarray(0, n))
            
            if(err2 != null) {
                return [n2, err]
            }
        }
        return [n, err]
    }
}


const _blackholeArray = new Uint8Array(8192)
class discard implements Writer, StringWriter, ReaderFrom {
    Write(p: Uint8Array): [int, error] {
        return [p.length, null]
    }

    WriteString(s: string): [int, error] {
        return [s.length, null]
    }
    
    /**
     * discard implements ReaderFrom as an optimization so Copy to io.Discard can avoid doing unnecessary work.
     */
    ReadFrom(r: Reader): [int64, error] {
        let n = 0 // This is in function params in Go (line 662)
        let readSize = 0
        let err: error = null
        while(true) {
            [readSize, err] = r.Read(_blackholeArray)
            n += readSize
            if(err != null) {
                if(err.message == Errors.EOF) {
                    return [n, null]
                }
                return [n, err]
            }
        }
    }
}

/**
 * Discard is a [Writer] on which all Write calls succeed
 * without doing anything.
 * 
 * **SEMANTIC DIFFERENCES TO GO:**
 * 
 * The go implementation uses a sync.Pool to make up for GC overhead.
 * This is not needed in JS
 */
export const Discard: Writer = new discard()

/**
 * NopCloser returns a [ReadCloser] with a no-op Close method wrapping
 * the provided [Reader] r.
 * If r implements [WriterTo], the returned [ReadCloser] will implement [WriterTo]by forwarding calls to r.
 */
export function NopCloser(r: Reader): ReadCloser | (ReadCloser & WriterTo) {
    if(is<WriterTo>(r, "WriteTo")) {
        return new nopWriteCloser(r)
    }
    return new nopCloser(r)
}

export class nopCloser implements ReadCloser {
    private r: Reader

    constructor(r: Reader) {
        this.r = r
    }

    Close(): error {
        return null
    }

    Read(p: Uint8Array): [int, error] {
        return this.r.Read(p)
    }
}

export class nopWriteCloser implements ReadCloser, WriterTo {
    private r: Reader & WriterTo

    constructor(r: Reader & WriterTo) {
        this.r = r
    }

    Close(): error {
        return null
    }

    Read(p: Uint8Array): [int, error] {
        return this.r.Read(p)
    }

    WriteTo(w: Writer): [int64, error] {
        return this.r.WriteTo(w)
    }
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
 * and JS specific optimizations
 * 
 * @param r Reader to read from
 * @returns Uint8Array of data read and error
 */
export function ReadAll(r: Reader): [Uint8Array, error] {
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