import * as fs from 'node:fs'
import { LZWReader, Order } from '../../compress/lzw/reader'
import * as io from '../../io/io'
import { Buffer as GoBuffer } from '../core/buffer'

const readLzwFile = (path: string) => {
    // Open the file
    let f = fs.readFileSync(path)
    let br = new GoBuffer(f)
    let reader = new LZWReader(br, Order.LSB, 8)
    let outputBuf = new GoBuffer(new Uint8Array())

    let [n, err] = io.Copy(outputBuf, reader)

    if(err) {
        throw err
    }

    let abf = Array.from(outputBuf.underlyingArray)

    console.log("Output:", n, "written to buffer of length", abf.length)
    console.log(abf)

    // Convert to string
    let str = String.fromCharCode(...abf)

    console.log("Output string:", str)
}

readLzwFile('test.lzw')