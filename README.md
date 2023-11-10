# Gostd

Gostd is a port of the unique parts Go standard library to JavaScript.

Note that this is a work in progress and is not ready for production use. Also note that this is not a complete port of the Go standard library, only the parts that are unique to Go and do not have easily available or as high-quality alternatives in JavaScript.

## Ported Packages

- `io` (partially, only io.Reader* and io.Writer* interfaces have been ported)
- `compress/lzw` (only reading support. Writing support is a planned TODO)


## Go porting rules

- `panic` = `throw new Error()`
- `byte` = `number`
- `[]byte` = `[]number` or `Uint8Array`