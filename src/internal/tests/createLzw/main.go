package main

import (
	"compress/lzw"
	"os"
)

func main() {
	msg := "helloLzw"
	f, _ := os.Create("abc")
	w := lzw.NewWriter(f, lzw.LSB, 8)
	_, err := w.Write([]byte(msg))
	
	if err != nil {
		panic(err)
	}
	
	w.Close()
	f.Close()
}
