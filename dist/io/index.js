"use strict";
// A set of core IO primitizes commonly used in Go
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadAll = exports.CopyBuffer = exports.Copy = exports.LimitedReader = exports.Buffer = exports.Errors = void 0;
const tshelpers_1 = require("../builtins/tshelpers"); // Some extra typescript guards
// IO Errors
var Errors;
(function (Errors) {
    // EOF is the error returned by Read when no more input is available.
    // (Read must return EOF itself, not an error wrapping EOF,
    // because callers will test for EOF using ==.)
    // Functions should return EOF only to signal a graceful end of input.
    // If the EOF occurs unexpectedly in a structured data stream,
    // the appropriate error is either [ErrUnexpectedEOF] or some other error
    // giving more detail.
    Errors["EOF"] = "EOF";
    // ErrUnexpectedEOF means that EOF was encountered in the
    // middle of reading a fixed-size block or data structure.
    Errors["UnexpectedEOF"] = "unexpected EOF";
    // errInvalidWrite means that a write returned an impossible count.
    Errors["InvalidWrite"] = "invalid write result";
    // ErrShortWrite means that a write accepted fewer bytes than requested
    // but failed to return an explicit error.
    Errors["ShortWrite"] = "short write";
})(Errors || (exports.Errors = Errors = {}));
/**
 * An implementation of Go's io.ByteReader interface
 *
 * JS specific functions are defined with the prefix js
 */
class Buffer {
    buf;
    _readAllOnCopy;
    constructor(buf, readAllOnCopy = true) {
        this.buf = buf;
        this._readAllOnCopy = readAllOnCopy;
    }
    // getBuffer returns the buffer
    // Not present in Go
    get jsUnderlyingBuffer() {
        return this.buf;
    }
    // readByte reads the next byte from the input buffer.
    // Equivalent to r.ReadByte() in io.ByteReader
    ReadByte() {
        if (this.buf.length == 0) {
            return [0, new Error(Errors.EOF)];
        }
        let b = this.buf[0];
        this.buf = this.buf.subarray(1);
        return [b, null];
    }
    // Read reads data into p implementing the io.Reader interface
    Read(p) {
        let n = this.buf.length;
        if (n == 0) {
            return [0, new Error(Errors.EOF)];
        }
        if (n > p.length) {
            n = p.length;
        }
        p.set(this.buf.subarray(0, n));
        this.buf = this.buf.subarray(n);
        return [n, null];
    }
    // ReadAt reads len(p) bytes into p starting at offset off in the underlying input source
    ReadAt(p, off) {
        let n = this.buf.length;
        if (n == 0) {
            return [0, new Error(Errors.EOF)];
        }
        if (n > p.length) {
            n = p.length;
        }
        p.set(this.buf.subarray(0, n), off);
        this.buf = this.buf.subarray(n);
        return [n, null];
    }
    // ReadFrom reads data from r until EOF or error
    ReadFrom(r) {
        if (this._readAllOnCopy) {
            let [buf, err] = ReadAll(r);
            this.buf = buf;
            return [buf.length, err];
        }
        let [n, err] = r.Read(this.buf);
        return [n, err];
    }
    // WriteByte writes a single byte to the buffer
    WriteByte(b) {
        this.buf = Uint8Array.from([...this.buf, b]);
        return null;
    }
    // Write writes len(p) bytes from p to the buffer
    Write(p) {
        this.buf = Uint8Array.from([...this.buf, ...p]);
        return [p.length, null];
    }
    // WriteAt writes len(p) bytes from p to the buffer starting at offset off
    WriteAt(p, off) {
        this.buf = Uint8Array.from([...this.buf.subarray(0, off), ...p, ...this.buf.subarray(off)]);
        return [p.length, null];
    }
    // WriteTo writes data to w until there's no more data to write or when an error occurs
    WriteTo(w) {
        let [n, err] = w.Write(this.buf);
        this.buf = this.buf.subarray(n);
        return [n, err];
    }
}
exports.Buffer = Buffer;
/**
 * A LimitedReader reads from R but limits the amount of
 * data returned to just N bytes. Each call to Read
 * updates N to reflect the new amount remaining.
 * Read returns EOF when N <= 0 or when the underlying R returns EOF.
 */
class LimitedReader {
    __isLimitedReader = true; // JS doesn't support typecases: https://cs.opensource.google/go/go/+/master:src/io/io.go;l=407
    r;
    n;
    constructor(r, n) {
        this.r = r;
        this.n = n;
    }
    Read(p) {
        if (this.n <= 0) {
            return [0, new Error(Errors.EOF)];
        }
        if (p.length > this.n) {
            p = p.subarray(0, this.n);
        }
        let [n, err] = this.r.Read(p);
        this.n -= n;
        return [n, err];
    }
}
exports.LimitedReader = LimitedReader;
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
function Copy(dst, src) {
    return copyBuffer(dst, src, null);
}
exports.Copy = Copy;
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
function CopyBuffer(dst, src, buf) {
    if (buf != null && buf.length == 0) {
        throw new Error("empty buffer in CopyBuffer");
    }
    return copyBuffer(dst, src, buf);
}
exports.CopyBuffer = CopyBuffer;
// copyBuffer is the actual implementation of Copy and CopyBuffer.
// if buf is nil, one is allocated.
function copyBuffer(dst, src, buf) {
    // If the reader has a WriteTo method, use it to do the copy.
    // Avoids an allocation and a copy.
    if ((0, tshelpers_1.is)(src, "WriteTo")) {
        return src.WriteTo(dst);
    }
    // Similarly, if the writer has a ReadFrom method, use it to do the copy.
    if ((0, tshelpers_1.is)(dst, "ReadFrom")) {
        return dst.ReadFrom(src);
    }
    if (buf == null) {
        let size = 32 * 1024;
        // Check if LimitedReader [https://cs.opensource.google/go/go/+/master:src/io/io.go;l=419]
        if ((0, tshelpers_1.is)(src, "__isLimitedReader")) {
            if (src.n < 1) {
                size = 1;
            }
            else {
                size = src.n;
            }
        }
        // TODO: There is a extra 'LimitedReader' here. IO port here does not have a limited reader
        // https://cs.opensource.google/go/go/+/master:src/io/io.go;l=419
        buf = new Uint8Array(size);
    }
    let written = 0; // This is defined in the go function declration, but JS doesn't support this: https://cs.opensource.google/go/go/+/master:src/io/io.go;l=407
    let err = null; // This is defined in the go function declration, but JS doesn't support this: https://cs.opensource.google/go/go/+/master:src/io/io.go;l=407
    while (true) { // for {}, https://cs.opensource.google/go/go/+/master:src/io/io.go;l=428
        let [nr, er] = src.Read(buf);
        if (nr > 0) {
            let [nw, ew] = dst.Write(buf.subarray(0, nr)); // nw, ew := dst.Write(buf[0:nr])
            if (nw < 0 || nr < nw) {
                nw = 0;
                if (ew == null) {
                    ew = new Error(Errors.InvalidWrite);
                }
            }
            written += nw; // written += int64(nw)
            if (ew != null) {
                err = ew;
                break;
            }
            if (nr != nw) {
                err = new Error(Errors.ShortWrite);
                break;
            }
        }
        if (er != null) {
            if (er.message != Errors.EOF) {
                err = er;
            }
            break;
        }
    }
    return [written, err];
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
function ReadAll(r) {
    const perStream = 512; // 512 bits per stream
    let b = [];
    while (true) { // for {}
        let _buf = new Uint8Array(perStream);
        let [n, err] = r.Read(_buf);
        b.push(_buf.subarray(0, n));
        if (err != null) {
            if (err.message == Errors.EOF) {
                err = null;
            }
            let arr = (0, tshelpers_1.mergeUint8Arrays)(b);
            return [arr, err];
        }
    }
}
exports.ReadAll = ReadAll;
