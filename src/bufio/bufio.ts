/**
 * Package bufio implements buffered I/O. It wraps an io.Reader or io.Writer
 * object, creating another object (Reader or Writer) that also implements
 * the interface but provides buffering and some help for textual I/O.
 */

import { Reader as ioReader, Writer as ioWriter, Errors as ioError, ByteReader, RuneScanner, RuneReader, WriterTo, ReaderFrom } from '../io/io';
import { uint8Copy } from "../internal/core/arrays"
import { is } from "../internal/core/tsGuards";
import { RuntimeErrors, byte, error, int, int64, max } from "../internal/core/baseTypes";
import { rune } from '../internal/core/rune';
import * as bytes from '../bytes/bytes';

// default buf size
const defaultBufSize = 4096;

// Bufio errors
export enum Errors {
    InvalidUnreadByte = "bufio: invalid use of UnreadByte",
    InvalidUnreadRune = "bufio: invalid use of UnreadRune",
    BufferFull = "bufio: buffer full",
    NegativeCount = "bufio: negative count",
    errNegativeRead = "bufio: reader returned negative count from Read",
    errNehativeWrite = "bufio: writer returned negative count from Write"
}

const minReadBufferSize = 16
const maxConsecutiveEmptyReads = 100

/**
 * NewReaderSize returns a new [Reader] whose buffer has at least the specified
 * size. If the argument io.Reader is already a [Reader] with large enough
 * size, it returns the underlying [Reader].
 */
export function NewReaderSize(rd: ioReader, size: number): Reader {
    // Is it already a Reader?
    if(is<Reader>(rd, "__isBufioReader") && rd.__buf.length >= size) {
        return rd;
    }

    let r = new Reader(new Uint8Array(max(size, minReadBufferSize)), rd);
    return r;
}

/**
 * NewReader returns a new [Reader] whose buffer has the default size.
 */
export function NewReader(rd: ioReader): Reader {
    return NewReaderSize(rd, defaultBufSize);
}

// Buffered input
//
// Reader implements buffering for an io.Reader object.
export class Reader implements ioReader, ByteReader, RuneReader, RuneScanner, WriterTo {
    __isBufioReader: boolean = true // JS doesn't support typecases
    private buf: Uint8Array;
    private rd: ioReader;
    
    // buf read and write positions
    private r: number = 0;
    private w: number = 0;
    private err: error = null;
    private lastByte: number = -1; // last byte read for UnreadByte; -1 means invalid
    private lastRuneSize: number = -1; // size of last rune read for UnreadRune; -1 means invalid

    constructor(buf: Uint8Array, rd: ioReader) {        
        this.rd = rd;
        this.buf = buf;
        this.lastByte = -1;
        this.lastRuneSize = -1;
    }

    // Workaround js class private rules
    get __buf() {
        return this.buf;
    }

    /**
     * Size returns the size of the underlying buffer in bytes.
     */
    Size(): number {
        return this.buf.length;
    }
    
    /**
     * Reset discards any buffered data, resets all state, and switches
     * the buffered reader to read from r.
     * Calling Reset on the zero value of [Reader] initializes the internal buffer
     * to the default size.
     * Calling b.Reset(b) (that is, resetting a [Reader] to itself) does nothing.
     */
    Reset(r: ioReader) {
        // If a Reader r is passed to NewReader, NewReader will return r.
        // Different layers of code may do that, and then later pass r
        // to Reset. Avoid infinite recursion in that case.
        
        if(this == r) {
            return;
        }

        if(this.buf == null) {
            this.buf = new Uint8Array(defaultBufSize);
        }

        this.reset(this.buf, r);
    }

    private reset(buf: Uint8Array, r: ioReader) {
        this.buf = buf;
        this.rd = r;
        this.r = 0;
        this.w = 0;
        this.err = null;
        this.lastByte = -1;
        this.lastRuneSize = -1;
    }

    // fill reads a new chunk into the buffer.
    private fill() {
        if(this.r > 0) {
            // Slide existing data to beginning.
            uint8Copy(this.buf, this.buf.subarray(this.r, this.w))
            this.w -= this.r
            this.r = 0
        }

        if(this.w >= this.buf.length) {
            throw new Error("bufio: tried to fill full buffer")
        }

        // Read new data: try a limited number of times.
        for(let i = maxConsecutiveEmptyReads; i > 0; i--) {
            let [n, err] = this.rd.Read(this.buf.subarray(this.w))
            if(n < 0) {
                throw new Error(Errors.errNegativeRead)
            }
            
            this.w += n

            if(err != null) {
                this.err = err
                return
            }

            if(n > 0) {
                return
            }
        }

        this.err = new Error("io.ErrNoProgress")
    }

    private readErr(): error {
        let err = this.err;
        this.err = null;
        return err;
    }

    /**
     * Peek returns the next n bytes without advancing the reader. The bytes stop
     * being valid at the next read call. If Peek returns fewer than n bytes, it
     * also returns an error explaining why the read is short. The error is
     * [ErrBufferFull] if n is larger than b's buffer size.
     * 
     * Calling Peek prevents a [Reader.UnreadByte] or [Reader.UnreadRune] call from succeeding
     * until the next read operation.
     */
    Peek(n: int): [Uint8Array, error] {
        if(n < 0) {
            return [new Uint8Array(), new Error(Errors.NegativeCount)]
        }

        this.lastByte = -1;
        this.lastRuneSize = -1;

        while(this.w - this.r < n && this.w - this.r < this.buf.length && this.err == null) {
            this.fill(); // b.w-b.r < len(b.buf) => buffer is not full
        }

        if(n > this.buf.length) {
            return [this.buf.subarray(this.r, this.w), new Error(Errors.BufferFull)]
        }

        // 0 <= n <= len(b.buf)
        let err: error = null;
        let avail = this.w - this.r;
        if(avail < n) {
            // not enough data in buffer
            n = avail;
            err = this.readErr();
            if(err == null) {
                err = new Error(Errors.BufferFull);
            }
        }

        return [this.buf.subarray(this.r, this.r + n), err];
    }

    /**
     * Discard skips the next n bytes, returning the number of bytes discarded.
     * 
     * If Discard skips fewer than n bytes, it also returns an error.
     * If 0 <= n <= b.Buffered(), Discard is guaranteed to succeed without
     * reading from the underlying io.Reader.
     */
    Discard(n: int): [int, error] {
        if(n < 0) {
            return [0, new Error(Errors.NegativeCount)]
        }

        if(n == 0) {
            return [0, null]
        }

        this.lastByte = -1;
        this.lastRuneSize = -1;

        let remain = n;
        while(true) {
            let skip = this.Buffered();
            if(skip == 0) {
                this.fill();
                skip = this.Buffered();
            }
            if(skip > remain) {
                skip = remain;
            }
            this.r += skip;
            remain -= skip;
            if(remain == 0) {
                return [n, null]
            }
            if(this.err != null) {
                return [n - remain, this.readErr()]
            }
        }
    }

    /**
     * Read reads data into p.
     * It returns the number of bytes read into p.
     * The bytes are taken from at most one Read on the underlying [Reader],
     * hence n may be less than len(p).
     * To read exactly len(p) bytes, use io.ReadFull(b, p).
     * If the underlying [Reader] can return a non-zero count with io.EOF,
     * then this Read method can do so as well; see the [io.Reader] docs.
     */
    Read(p: Uint8Array): [number, error] {
        let n = p.length
        let err: error
        if(n == 0) {
            if(this.Buffered() > 0) {
                return [0, null]
            }
            return [0, this.readErr()]
        }
        if(this.r == this.w) {
            if(this.err != null) {
                return [0, this.readErr()]
            }
            if(p.length >= this.buf.length) {
                // Large read, empty buffer.
                // Read directly into p to avoid copy.
                [n, this.err] = this.rd.Read(p)
                if(n < 0) {
                    throw new Error(Errors.errNegativeRead)
                }
                if(n > 0) {
                    this.lastByte = p[n-1]
                    this.lastRuneSize = -1
                }
                return [n, this.readErr()]
            }

            // One read.
            // Do not use b.fill, which will loop.
            this.r = 0
            this.w = 0

            let terr: error // [n, this.err] is not supported in js so we need to use a temp variable
            [n, terr] = this.rd.Read(this.buf)
            this.err = terr

            if(n < 0) {
                throw new Error(Errors.errNegativeRead)
            }

            if(n == 0) {
                return [0, this.readErr()]
            }

            this.w += n
        }

        // copy as much as we can
        // Note: if the slice panics here, it is probably because
        // the underlying reader returned a bad count. See issue 49795.
        n = uint8Copy(p, this.buf.subarray(this.r, this.w))
        this.r += n
        this.lastByte = this.buf[this.r-1]
        this.lastRuneSize = -1
        return [n, null]
    }

    /**
     * ReadByte reads and returns a single byte.
     * If no byte is available, returns an error.
     */
    ReadByte(): [byte, error] {
        this.lastRuneSize = -1
        while(this.r == this.w) {
            if(this.err != null) {
                return [0, this.readErr()]
            }
            this.fill() // buffer is empty
        }
        let c = this.buf[this.r]
        this.r++
        this.lastByte = c
        return [c, null]
    }

    /**
     * UnreadByte unreads the last byte. Only the most recently read byte can be unread.
     * 
     * UnreadByte returns an error if the most recent method called on the
     * [Reader] was not a read operation. Notably, [Reader.Peek], [Reader.Discard], and [Reader.WriteTo] are not
     * considered read operations.
     */
    UnreadByte(): error {
        if(this.lastByte < 0 || this.r == 0 && this.w > 0) {
            return new Error(Errors.InvalidUnreadByte)
        }
        // b.r > 0 || b.w == 0
        if(this.r > 0) {
            this.r--
        } else {
            // b.r == 0 && b.w == 0
            this.w = 1
        }
        this.buf[this.r] = this.lastByte
        this.lastByte = -1
        this.lastRuneSize = -1
        return null
    }

    /**
     * ReadRune reads a single UTF-8 encoded Unicode character and returns the
     * rune and its size in bytes. If the encoded rune is invalid, it consumes one byte
     * and returns unicode.ReplacementChar (U+FFFD) with a size of 1.
     */
    ReadRune(): [rune, int, error] {
        // TODO: Wait for proper go `utf8` support
        return [new rune(0), 0, new Error(RuntimeErrors.NotImplemented)]
    }

    /**
     * UnreadRune unreads the last rune. If the most recent method called on
     * the [Reader] was not a [Reader.ReadRune], [Reader.UnreadRune] returns an error. (In this
     * regard it is stricter than [Reader.UnreadByte], which will unread the last byte
     * from any read operation.)
     */
    UnreadRune(): error {
        if(this.lastRuneSize < 0 || this.r < this.lastRuneSize) {
            return new Error(Errors.InvalidUnreadRune)
        }
        this.r -= this.lastRuneSize
        this.lastByte = -1
        this.lastRuneSize = -1
        return null
    }

    /**
     * Buffered returns the number of bytes that can be read from the current buffer.
     */
    Buffered(): int {
        return this.w - this.r;
    }

    /**
     * ReadSlice reads until the first occurrence of delim in the input,
     * returning a slice pointing at the bytes in the buffer.
     * The bytes stop being valid at the next read.
     * If ReadSlice encounters an error before finding a delimiter,
     * it returns all the data in the buffer and the error itself (often io.EOF).
     * ReadSlice fails with error [ErrBufferFull] if the buffer fills without a delim.
     * Because the data returned from ReadSlice will be overwritten
     * by the next I/O operation, most clients should use
     * [Reader.ReadBytes] or ReadString instead.
     * ReadSlice returns err != nil if and only if line does not end in delim.
     */
    ReadSlice(delim: byte): [Uint8Array, error] {
        let line: Uint8Array;
        let err: error;
        let s = 0; // search start index
        while(true) {
            // Search buffer.
            let i = bytes.IndexByte(this.buf.subarray(this.r + s, this.w), delim);
            if(i >= 0) {
                i += s;
                line = this.buf.subarray(this.r, this.r + i + 1);
                this.r += i + 1;
                return [line, null];
            }

            // Pending error?
            if(this.err != null) {
                line = this.buf.subarray(this.r, this.w);
                this.r = this.w;
                err = this.readErr();
                break
            }

            // Buffer full?
            if(this.Buffered() >= this.buf.length) {
                this.r = this.w;
                line = this.buf;
                err = new Error(Errors.BufferFull);
                break
            }

            s = this.w - this.r; // do not rescan area we scanned before

            this.fill(); // buffer is not full
        }

        // Handle last byte, if any.
        let i = line.length - 1;
        if(i >= 0) {
            this.lastByte = line[i];
            this.lastRuneSize = -1;
        }

        return [line, err];
    }

    /**
     * ReadLine is a low-level line-reading primitive. Most callers should use
     * [Reader.ReadBytes]('\n') or [Reader.ReadString]('\n') instead or use a [Scanner].
     * 
     * ReadLine tries to return a single line, not including the end-of-line bytes.
     * If the line was too long for the buffer then isPrefix is set and the
     * beginning of the line is returned. The rest of the line will be returned
     * from future calls. isPrefix will be false when returning the last fragment
     * of the line. The returned buffer is only valid until the next call to
     * ReadLine. ReadLine either returns a non-nil line or it returns an error,
     * never both.
     * 
     * The text returned from ReadLine does not include the line end ("\r\n" or "\n").
     * No indication or error is given if the input ends without a final line end.
     * Calling [Reader.UnreadByte] after ReadLine will always unread the last byte read
     * (possibly a character belonging to the line end) even if that byte is not
     * part of the line returned by ReadLine.
     */
    ReadLine(): [Uint8Array | null, boolean, error] {
        let line: Uint8Array | null = null;
        let isPrefix: boolean = false
        let err: error = null;
        
        [line, err] = this.ReadSlice('\n'.charCodeAt(0));
        if(err?.message == Errors.BufferFull) {
            // Handle the case where "\r\n" straddles the buffer.
            if(line?.length > 0 && line[line.length-1] == '\r'.charCodeAt(0)) {
                // Put the '\r' back on buf and drop it from line.
                // Let the next call to ReadLine check for "\r\n".
                if(this.r == 0) {
                    // should be unreachable
                    throw new Error("bufio: tried to rewind past start of buffer")
                }
                this.r--
                line = line.subarray(0, line.length-1)
            }
            return [line, true, null]
        }
    
        if(line.length == 0) {
            if(err != null) {
                line = null
            }
            return [line, isPrefix, err]
        }
        err = null
    
        if(line[line.length-1] == '\n'.charCodeAt(0)) {
            let drop = 1
            if(line.length > 1 && line[line.length-2] == '\r'.charCodeAt(0)) {
                drop = 2
            }
            line = line.subarray(0, line.length-drop)
        }
        return [line, isPrefix, err]
    }

    /**
     * collectFragments reads until the first occurrence of delim in the input. It
     * returns (slice of full buffers, remaining bytes before delim, total number
     * of bytes in the combined first two elements, error).
     * The complete result is equal to
     * `bytes.Join(append(fullBuffers, finalFragment), nil)`, which has a
     * length of `totalLen`. The result is structured in this way to allow callers
     * to minimize allocations and copies.
     */
    private collectFragments(delim: byte): [Uint8Array[], Uint8Array | null, int, error] {
        let fullBuffers: Uint8Array[] = [];
        let frag: Uint8Array | null = null;
        let totalLen: int = 0
        let err: error = null;
        // Use ReadSlice to look for delim, accumulating full buffers.
        while(true) {
            let e: error = null;
            [frag, e] = this.ReadSlice(delim)
            if(e == null) { // got final fragment
                break
            }
            if(e?.message != Errors.BufferFull) { // unexpected error
                err = e
                break
            }
    
            // Make a copy of the buffer.
            let buf = bytes.Clone(frag)
            fullBuffers.push(buf as Uint8Array)
            totalLen += buf?.length || 0
        }
    
        totalLen += frag.length
        return [fullBuffers, frag, totalLen, err]
    }

    /**
     * ReadBytes reads until the first occurrence of delim in the input,
     * returning a slice containing the data up to and including the delimiter.
     * If ReadBytes encounters an error before finding a delimiter,
     * it returns the data read before the error and the error itself (often io.EOF).
     * ReadBytes returns err != nil if and only if the returned data does not end in
     * delim.
     * For simple uses, a Scanner may be more convenient.
     */
    ReadBytes(delim: byte): [Uint8Array, error] {
        let full: Uint8Array[], frag: Uint8Array | null, n: int, err: error;
        [full, frag, n, err] = this.collectFragments(delim)
        // Allocate new buffer to hold the full pieces and the fragment.
        let buf = new Uint8Array(n);
        n = 0;
        // Copy full pieces and fragment in.
        for(let i = 0; i < full.length; i++) {
            n += uint8Copy(buf, full[i])
        }
        uint8Copy(buf, frag as Uint8Array)
        return [buf, err]
    }

    /**
     * ReadString reads until the first occurrence of delim in the input,
     * returning a string containing the data up to and including the delimiter.
     * If ReadString encounters an error before finding a delimiter,
     * it returns the data read before the error and the error itself (often io.EOF).
     * ReadString returns err != nil if and only if the returned data does not end in
     * delim.
     * For simple uses, a Scanner may be more convenient.
     */
    ReadString(delim: byte): [string, error] {
        // TODO: Wait for proper go `strings.Builder` support
        return ["", new Error(RuntimeErrors.NotImplemented)]
    }
    
    /**
     * WriteTo implements io.WriterTo.
     * This may make multiple calls to the [Reader.Read] method of the underlying [Reader].
     * If the underlying reader supports the [Reader.WriteTo] method,
     * this calls the underlying [Reader.WriteTo] without buffering.
     */
    WriteTo(w: ioWriter): [int64, error] {
        let n: int64 = 0;
        let err: error = null;
        
        this.lastByte = -1
        this.lastRuneSize = -1
    
        let b = this.writeBuf(w)

        n = b[0]
        err = b[1]

        if (err != null) {
            return [n, err]
        }
        
        if(is<WriterTo>(this.rd, "WriteTo")) {
            let m: int64 = 0;
            [m, err] = this.rd.WriteTo(w)
            n += m
            return [n, err]
        }

        if(is<ReaderFrom>(w, "ReadFrom")) {
            let m: int64 = 0;
            [m, err] = w.ReadFrom(this.rd)
            n += m
            return [n, err]
        }
    
        if(this.w-this.r < this.buf.length) {
            this.fill() // buffer not full
        }
    
        while(this.r < this.w) {
            // b.r < b.w => buffer is not empty
            let [m, err] = this.writeBuf(w)
            n += m
            if(err != null) {
                return [n, err]
            }
            this.fill() // buffer is empty
        }
    
        if(this.err?.message == ioError.EOF) {
            this.err = null
        }
    
        return [n, this.readErr()]
    }

    /**
     * writeBuf writes the [Reader]'s buffer to the writer.
     */
    private writeBuf(w: ioWriter): [int64, error] {
        let [n, err] = w.Write(this.buf.subarray(this.r, this.w))
        if(n < 0) {
            throw new Error(Errors.errNehativeWrite)
        }
        this.r += n
        return [n, err]
    }
}