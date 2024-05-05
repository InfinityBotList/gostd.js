/**
 * Provides io.Multi*
 */

import { bytesFromString } from "../internal/tshelpers/arrays";
import { error, int, int64 } from "../internal/tshelpers/baseTypes";
import { is } from "../internal/tshelpers/tsGuards";
import { CopyBuffer, Errors, Reader, StringWriter, Writer, WriterTo } from "./io";

class eofReader implements Reader {
  Read(p: Uint8Array): [int, error] {
    return [0, null];
  }
}

class multiReader implements Reader, WriterTo {
    __isInternalMultiReader = true
    private readers: Reader[];

    constructor(readers: Reader[]) {
        this.readers = readers;
    }

    Read(p: Uint8Array): [int, error] {
        while(this.readers.length > 0) {
            // Optimization to flatten nested multiReaders (Issue 13558).
            if(this.readers.length === 1) {
                if(is<multiReader>(this.readers[0], '__isInternalMultiReader')) {
                    this.readers = (this.readers[0]).readers;
                    continue;
                }
            }

            let [n, err] = this.readers[0].Read(p);
            if(err?.message === Errors.EOF) {
                // Use eofReader instead of nil to avoid nil panic
                // after performing flatten (Issue 18232).
                this.readers[0] = new eofReader();
                this.readers = this.readers.slice(1);
            }
            if(n > 0 || err?.message != Errors.EOF) {
                if(err?.message == Errors.EOF && this.readers.length > 0) {
                    // Don't return EOF yet. More readers remain.
                    err = null;
                }
                return [n, err];
            }
        }

        return [0, new Error(Errors.EOF)];
    }

    WriteTo(w: Writer): [number, error] {
        return this.writeToWithBuffer(w, new Uint8Array(1024*32))
    }

    private writeToWithBuffer(w: Writer, buf: Uint8Array): [int64, error] {
        let sum: int64 = 0
        let err: error = null

        for (let [i, r] of this.readers.entries()) {
            let n: int64 = 0;
            if(is<multiReader>(r, '__isInternalMultiReader')) {
                let subMr = r as multiReader;
                [n, err] = subMr.writeToWithBuffer(w, buf);
            } else {
                [n, err] = CopyBuffer(w, r, buf);
            }
            sum += n;
            if(err != null) {
                this.readers = this.readers.slice(i); // permit resume / retry after error
                return [sum, err];
            }            
        }
        this.readers = [];
        return [sum, null]
    }
}

/**
 * MultiReader returns a Reader that's the logical concatenation of
 * the provided input readers. They're read sequentially. Once all
 * inputs have returned EOF, Read will return EOF.  If any of the readers
 * return a non-nil, non-EOF error, Read will return that error.
 */
export function MultiReader(...readers: Reader[]): Reader {
    return new multiReader(readers);
}

class multiWriter implements Writer, StringWriter{
    private writers: Writer[];
    
    constructor(writers: Writer[]) {
        this.writers = writers;
    }

    Write(p: Uint8Array): [int, error] {
        let n: int = 0;
        let err: error = null;

        for(let w of this.writers) {
            [n, err] = w.Write(p);
            if(err != null) {
                return [n, err];
            }
            if(n != p.length) {
                return [n, new Error(Errors.ShortWrite)];
            }
        }

        return [p.length, err];
    }

    WriteString(s: string): [int, error] {
        let n: int = 0
        let err: error = null

        let p: Uint8Array | null = null; // lazily initialized when needed

        for(let w of this.writers) {
            if(is<StringWriter>(w, 'WriteString')) {
                [n, err] = w.WriteString(s);
            } else {
                if(p == null) {
                    p = bytesFromString(s);
                }
                [n, err] = w.Write(p);
            }

            if(err != null) {
                return [n, err];
            }

            if(n != s.length) {
                return [n, new Error(Errors.ShortWrite)];
            }
        }

        return [s.length, err];
    }

    get __writers() {
        return this.writers
    }
}

/**
 * MultiWriter creates a writer that duplicates its writes to all the
 * provided writers, similar to the Unix tee(1) command.
 * 
 * Each write is written to each listed writer, one at a time.
 * If a listed writer returns an error, that overall write operation
 * stops and returns the error; it does not continue down the list.
 */
export function MultiWriter(...writers: Writer[]): Writer & StringWriter {
    let w = []

    for(let writer of writers) {
        if(is<multiWriter>(writer, '__isInternalMultiWriter')) {
            w.push(...writer.__writers)
        } else {
            w.push(writer)
        }
    }
    
    return new multiWriter(writers);
}