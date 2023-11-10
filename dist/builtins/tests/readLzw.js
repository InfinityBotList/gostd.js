"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("node:fs"));
const lzw_1 = require("../../compress/lzw");
const io = __importStar(require("../../io"));
const readLzwFile = (path) => {
    // Open the file
    let f = fs.readFileSync(path);
    let br = new io.Buffer(f);
    let reader = new lzw_1.LZWReader(br, lzw_1.Order.LSB, 8);
    let outputBuf = new io.Buffer(new Uint8Array());
    let [n, err] = io.Copy(outputBuf, reader);
    if (err) {
        throw err;
    }
    let abf = Array.from(outputBuf.jsUnderlyingBuffer);
    console.log("Output:", n, "written to buffer of length", abf.length);
};
readLzwFile('test.ibl');
