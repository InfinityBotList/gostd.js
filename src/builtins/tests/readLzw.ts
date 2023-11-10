import * as fs from 'node:fs'
import { LZWReader, Order } from '../../compress/lzw'
import * as io from '../../io'

const readLzwFile = (path: string) => {
    // Open the file
    let f = fs.readFileSync(path)

    let br = new io.Buffer(f)

    let reader = new LZWReader(br, Order.LSB, 8)

    let outputBuf = new io.Buffer(new Uint8Array())

    let [n, err] = io.Copy(outputBuf, reader)

    if(err) {
        throw err
    }

    let abf = Array.from(outputBuf.jsUnderlyingBuffer)

    console.log("Output:", n, "written to buffer of length", abf.length)
}

readLzwFile('test.ibl')