import { WorkerCommand, WorkerResponse } from "../const";
import { with_time } from "../utils";
import { AIConfig } from "../const";


const ctx: Worker = self as any  // eslint-disable-line no-restricted-globals

let init_zxing = false
let init_cv = false

const cv_asm = require('../resources/opencv.js');
const zxing_asm = require('../resources/zxing')

cv_asm.onRuntimeInitialized = function () {
    console.log("initialized cv_asm")
    init_cv = true
    initializationReport()
}
zxing_asm.onRuntimeInitialized = function () {
    console.log("initialized zxing_asm")
    init_zxing = true
    initializationReport()
}

export const initializationReport = () =>{
    if(init_zxing === true && init_cv === true){
        ctx.postMessage({ message: WorkerResponse.INITIALIZED})
    }
}

let decodePtr: any = null
let decodeCallback: any = null
let result: any = null
let barcode: string | void | null = ""
let point_x:number 
let point_y:number

//decodeCallback = function (ptr: any, len: any, resultIndex: any, resultCount: any) {
decodeCallback = function (ptr: any, len: any, resultIndex: any, resultCount: any,
    x0:any, y0:any,x1:any, y1:any,x2:any, y2:any,x3:any, y3:any,) {
    const result = new Uint8Array(zxing_asm.HEAPU8.buffer, ptr, len);
    barcode = String.fromCharCode.apply(null, Array.from(result));
    console.log("BARCODE_dETECT:", barcode, resultIndex, resultCount)
    console.log("BARCODE_dETECT:", x0, y0, x1, y1, x2, y2, x3, y3)
    point_x = x0 / AIConfig.TRANSFORMED_MAX
    point_y = y0 / AIConfig.TRANSFORMED_MAX

};
decodePtr = zxing_asm.addFunction(decodeCallback, 'iiiiiffffffff');


let overlay: OffscreenCanvas | null = null


export const rotateImageByCV = (img: ImageData, angle: number): ImageData => {
    if(angle === 0){
        return img
    }
    const src  = cv_asm.matFromImageData(img)
    let dst    = new cv_asm.Mat();
    let dsize  = new cv_asm.Size(src.cols, src.rows);
    let center = new cv_asm.Point(src.cols / 2, src.rows / 2);
    let M      = cv_asm.getRotationMatrix2D(center, angle, 1);
    cv_asm.warpAffine(src, dst, M, dsize, cv_asm.INTER_LINEAR, cv_asm.BORDER_CONSTANT, new cv_asm.Scalar());

    const imgData = new ImageData(new Uint8ClampedArray(dst.data), dst.cols, dst.rows)
    dst.delete();
    src.delete();
    // dsize.delete();
    // center.delete();
    return imgData
}

const canvas = new OffscreenCanvas(1024, 1024)
const canvas_for_overlay = new OffscreenCanvas(1024,1024)


export const scanBarcode_old = (image: ImageBitmap, angle: number[]): string => {
    barcode = ""
    point_x = 0
    point_y = 0
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const max_length = AIConfig.TRANSFORMED_MAX
    // const max_length = Math.max(image.width, image.height)
    ctx.drawImage(image, 0, 0, max_length, max_length)
    const imageData = ctx.getImageData(0, 0, max_length, max_length);

    for(let k=0; k<angle.length; k++){
        with_time("ONE SCAN BARCODE TIME 1: " + angle[k], () => {
            
            const rotatedData = rotateImageByCV(imageData, angle[k])
            //const rotatedData = imageData
            const idd = rotatedData.data;
            const input = zxing_asm._resize(rotatedData.width, rotatedData.height);
            for (let i = 0, j = 0; i < idd.length; i += 4, j++) {
                //zxing_asm.HEAPU8[input + j] = idd[i]; // これだと"R"しか見ていないのでは？
                zxing_asm.HEAPU8[input + j] = 0.2989 * idd[i + 0] + 0.5870 * idd[i + 1] + 0.1140 * idd[i + 2] //グレースケール 
            }    
            

            // if(overlay !==null && angle[k] === 45){
            //     const tmp_ctx  = canvas_for_overlay?.getContext("2d")!
            //     tmp_ctx.clearRect(0, 0, canvas_for_overlay.width, canvas_for_overlay.height)
            //     tmp_ctx.putImageData(rotatedData, 0, 0,)
            //     const overlay_x=Math.floor(rotatedData.width/3)
            //     const overlay_y=Math.floor(rotatedData.height/3)
            //     overlay.width  = overlay_x
            //     overlay.height = overlay_y
            //     const tmp_ctx2 = overlay.getContext("2d")!
            //     tmp_ctx2.drawImage(canvas_for_overlay, 0,0,rotatedData.width, rotatedData.height, 0,0, overlay_x, overlay_y)

            //     console.log("rotate size", rotatedData.width, rotatedData.height, angle[k])
            // }
            
            
        },false)
        const err = zxing_asm._decode_ean13(decodePtr);
        if (barcode !== ""){
            return barcode
        }
    }

    
    return barcode
}

onmessage = (event) => {
    console.log('--------- Worker message ---------')
    console.log(event)

    if (event.data.message === WorkerCommand.SET_OVERLAY) {
        overlay = event.data.overlay
    } else if (event.data.message === WorkerCommand.SCAN_BARCODE) {
        const width = event.data.width
        const height = event.data.height
        const angles = event.data.angles
        const boxMetadata = event.data.boxMetadata
//        const images: ImageBitmap[] = event.data.images
        const images: ImageBitmap[] = event.data.images
        //        const image = event.data.image
        if (init_zxing === false || init_cv === false) {
            console.log("not yet")
            ctx.postMessage({ message: WorkerResponse.NOT_PREPARED })
        } else {
            const barcodes: string[] = []
            const point_xs: number[] = []
            const point_ys: number[] = []
            for (let i = 0; i < images.length; i++) {
                const image = images[i]
                with_time("SCAN BARCODE TIME", () => {
                    const result = scanBarcode_old(image, angles)
                    barcodes.push(result)
                    point_xs.push(point_x)
                    point_ys.push(point_y)
                },true)
            }
            //const barcodes = scanBarcode(images, angles)

            ctx.postMessage({ message: WorkerResponse.SCANED_BARCODE, barcodes: barcodes, point_xs:point_xs, point_ys:point_ys ,boxMetadata:boxMetadata})
        }
    }
};

export default onmessage