import * as React from 'react';
import { GlobalState } from '../reducers';
import { AppStatus, MAX_COUNT, ONE_TURN_COUNT, Type } from '../const';
import { BrowserBarcodeReader } from '@zxing/library'

const zxing_asm = require('../resources/zxing')
let decodePtr: any = null
let decodeCallback: any = null
let result: any = null
let barcode: string | void | null = ""


// WASM
decodeCallback = function (ptr: any, len: any, resultIndex: any, resultCount: any) {
    result = new Uint8Array(zxing_asm.HEAPU8.buffer, ptr, len);
    barcode = String.fromCharCode.apply(null, Array.from(result));
};
decodePtr = zxing_asm.addFunction(decodeCallback, 'iiiiiffffffff');

// JS
const barcodeReader: BrowserBarcodeReader = new BrowserBarcodeReader()

class App extends React.Component {
    parentRef = React.createRef<HTMLDivElement>()
    imageRef = React.createRef<HTMLImageElement>()
    monitorRef = React.createRef<HTMLDivElement>()

    scanBarcode = async (img_elem: HTMLImageElement) => {
        const canvas = document.createElement('canvas');

        for (let i = 0; i < ONE_TURN_COUNT; i++) {
            canvas.width = img_elem.width
            canvas.height = img_elem.height
            const ctx = canvas.getContext("2d")!
            ctx.drawImage(img_elem, 0, 0, canvas.width, canvas.height)
            const url = canvas.toDataURL()
            const result = await barcodeReader.decodeFromImageUrl(url)
            barcode = result.getText()
            console.log(`${barcode} ${i} / ${ONE_TURN_COUNT}`)
        }
        canvas.remove()
    }

    createObjectURL = (window.URL || window.webkitURL).createObjectURL


    selectFile = (e: any) => {
        var files = e.target.files;
        var image_url = files.length === 0 ? "" : this.createObjectURL(files[0]);
        console.log("selected file", image_url)
        const img_elem = this.imageRef.current!
        img_elem.src = image_url
    }

    render() {
        const gs = this.props as GlobalState
        const props = this.props as any
        const img_elem = this.imageRef.current!
        const monitor_elem = this.monitorRef.current!

        console.log(gs.counter)
        if (gs.status === AppStatus.START || gs.status === AppStatus.NEXT) {

            // execute for WASM
            if (gs.type === Type.WASM) {
                const canvas = document.createElement('canvas');
                for (let done = 0; done < ONE_TURN_COUNT; done++) {
                    canvas.width = img_elem.width
                    canvas.height = img_elem.height
                    const ctx = canvas.getContext("2d")!
                    ctx.drawImage(img_elem, 0, 0, canvas.width, canvas.height)

                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const idd = imageData.data;
                    const image = zxing_asm._resize(canvas.width, canvas.height);
                    for (let i = 0, j = 0; i < idd.length; i += 4, j++) {
                        zxing_asm.HEAPU8[image + j] = idd[i];
                    }
                    const err = zxing_asm._decode_multi(decodePtr);
                    console.log(barcode, done, gs.count, gs.status)
                }
                canvas.remove()
                const button = document.createElement('button')
                button.onclick = props.next()
                monitor_elem.appendChild(button)
            } else {
                // execute for JS
                this.scanBarcode(img_elem).then(() => {
                    console.log('done js')
                    const button = document.createElement('button')
                    button.onclick = props.next()
                    monitor_elem.appendChild(button)
                })
            }
        } else if (gs.status === AppStatus.FIN) {
            const elem1 = document.createElement('div')
            elem1.textContent = `BARCODE: ${barcode}`
            const elem2 = document.createElement('div')
            elem2.textContent = `Time(${gs.type}): ${(gs.end - gs.start2).toFixed(2)}ms ${MAX_COUNT} barcodes`
            monitor_elem.appendChild(elem1)
            monitor_elem.appendChild(elem2)
        }
        return (
            <div style={{ width: "100%", height: "100%", position: "fixed", top: 0, left: 0, }} ref={this.parentRef}>
                <img src={gs.img_src} alt="barcode" ref={this.imageRef} />

                <div>
                    <button onClick={() => { props.start(Type.WASM) }} > START!(WASM) </button>

                </div>
                <div>
                    <button onClick={() => { props.start(Type.JS) }} > START!(JS) </button>
                </div>
                <div>
                    <input type="file" ref="file" onChange={this.selectFile} />
                </div>
                <div ref={this.monitorRef} ></div>
            </div>
        )
    }

}


export default App;