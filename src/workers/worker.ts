import { WorkerCommand, WorkerResponse } from "../const";


const ctx: Worker = self as any  // eslint-disable-line no-restricted-globals

//const cv = require('../resources/opencv.js');
const zxing_asm = require('../resources/zxing')
zxing_asm.onRuntimeInitialized = function () {
    console.log("initialized zxing_asm")
    init_zxing = true
}
let init_zxing = false


let decodePtr: any = null
let decodeCallback: any = null
let result: any = null
let barcode: string | void | null = ""

// WASM
decodeCallback = function (ptr: any, len: any, resultIndex: any, resultCount: any) {
    result = new Uint8Array(zxing_asm.HEAPU8.buffer, ptr, len);
    console.log("barcode readed!!!", barcode)
    barcode = String.fromCharCode.apply(null, Array.from(result));
    console.log("barcode readed!!!", barcode)
};
decodePtr = zxing_asm.addFunction(decodeCallback, 'iiiiiffffffff');


export const scanBarcode = (image: ImageData, width: number, height: number, angle: number[]): string => {
    barcode = ""
    const canvas = new OffscreenCanvas(image.width, image.height)
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(image, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const idd = imageData.data;
    const input = zxing_asm._resize(canvas.width, canvas.height);
    for (let i = 0, j = 0; i < idd.length; i += 4, j++) {
        zxing_asm.HEAPU8[input + j] = idd[i];
    }
    const err = zxing_asm._decode_multi(decodePtr);
    console.log("---- BARCODE_SCANNNED -----", barcode)
    return barcode
}

onmessage = (event) => {
    console.log('--------- Worker message ---------')
    console.log(event)

    // const width = event.data.width
    // const height = event.data.height
    // const angles = event.data.angles
//        const images: ImageBitmap[] = event.data.images
    // const images: ImageData[] = event.data.images
    //        const image = event.data.image
    if (init_zxing === false ) {
        console.log("not yet")
        ctx.postMessage({ message: WorkerResponse.NOT_PREPARED })
    } else if(event.data.message === WorkerCommand.SCAN_BARCODE) {
        const width = event.data.width
        const height = event.data.height
        const angle = event.data.angle
        const image = event.data.image
        const result = scanBarcode(image, width, height, angle)        
        ctx.postMessage({message:WorkerResponse.SCANED_BARCODE, barcode:result})
    }
};

export default onmessage