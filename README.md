# Gostd

Gostd is a port of the unique parts Go standard library to JavaScript.

Note that this is a work in progress and is not ready for production use. Also note that this is not a complete port of the Go standard library, only the parts that are unique to Go and do not have easily available or as high-quality alternatives in JavaScript.

## Ported Packages

- `io` (excluding `Pipe` which is TODO)
- `bufio` (only `Reader`)
- `bytes` (only `IndexByte()` and `Clone()` that is needed for bufio, for all sakes and purposes, unimplemented)
- `compress/lzw` (only reading support. Writing support is a planned TODO)
- `sync` (only `Mutex` and `RWMutex`)

## Go porting rules

- `panic` = `throw new Error()`
- `byte` = `number`
- `[]byte` = `[]number` or `Uint8Array`
- `make([]byte, n)` = `new Uint8Array(n)`
- `copy([]byte)` = `uint8Copy`
- `[]byte(string)` = `bytesFromString`
- `array[i:]` = `array.subarray(i)`
- `array[:j]` = `array.subarray(0, j)`
- `array[i:j]` = `array.subarray(i, j)`
- `(1<<63)-1` = `Number.MAX_SAFE_INTEGER` (JS doesnt support numbers larger than this)

### Limitations

- Single-threaded (equivalent to `GOMAXPROCS=1`)
