import { WorkerCommand, WorkerResponse } from "../const";
import { with_time } from "../utils";


const ctx: Worker = self as any  // eslint-disable-line no-restricted-globals

const cv_asm = require('../resources/opencv.js');
cv_asm.onRuntimeInitialized = function () {
    console.log("initialized cv_asm")
    init_cv = true
}
const zxing_asm = require('../resources/zxing')
zxing_asm.onRuntimeInitialized = function () {
    console.log("initialized zxing_asm")
    init_zxing = true
}
let init_zxing = false
let init_cv = false

// let decodePtr: any = null
// let decodeCallback: any = null
// let result: any = null
//let barcode: string | void | null = ""
console.log("wasm", zxing_asm)
// WASM

const canvas = new OffscreenCanvas(0, 0)
let overlay: OffscreenCanvas | null = null


export const rotateImageByCV = (img: ImageData, angle: number): ImageData => {
    // if(angle === 0){
    //     return img
    // }
    const src = cv_asm.matFromImageData(img)
    let dst = new cv_asm.Mat();
    let dsize = new cv_asm.Size(src.cols, src.rows);
    let center = new cv_asm.Point(src.cols / 2, src.rows / 2);
    let M = cv_asm.getRotationMatrix2D(center, angle, 1);
    cv_asm.warpAffine(src, dst, M, dsize, cv_asm.INTER_LINEAR, cv_asm.BORDER_CONSTANT, new cv_asm.Scalar());

    let dst2 = new cv_asm.Mat();
    let dsize2 = new cv_asm.Size(src.cols / 1.5, src.rows / 1.5);
    cv_asm.resize(dst, dst2, dsize2, 0, 0, cv_asm.INTER_AREA);

    let imgData = new ImageData(new Uint8ClampedArray(dst2.data), dst2.cols, dst2.rows)
    dst.delete(); dst2.delete()
    // dsize.delete();
    // center.delete();
    return imgData

}



export const scanBarcode = (images: ImageBitmap[], angles: number[]): string[] => {
    let barcode =""
    const decodeCallback = function (ptr: any, len: any, resultIndex: any, resultCount: any) {
        const result = new Uint8Array(zxing_asm.HEAPU8.buffer, ptr, len);
        barcode = String.fromCharCode.apply(null, Array.from(result));
    };
    const decodePtr = zxing_asm.addFunction(decodeCallback, 'iiiiiffffffff');
    const res=[]
    for(let z = 0; z < images.length; z ++){
        const image = images[z]

        with_time("decode_multi", () => {
            canvas.width = image.width
            canvas.height = image.height
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            // overlay!.width  = canvas.width
            // overlay!.height = canvas.height
            // const tmp_ctx   = overlay!.getContext("2d")!
            // tmp_ctx.putImageData(imageData,0,0)
            // //console.log("", canvas.width, canvas.height, image.width, image.height)
            // //tmp_ctx.drawImage(image, 0, 0)
    
    
            let rotatedImage
            for (let a = 0; a < angles.length; a++) {
                const angle = angles[a]
                rotatedImage = rotateImageByCV(imageData, angle)
                const idd = rotatedImage.data;
                const input = zxing_asm._resize(canvas.width, canvas.height);
                console.log("target image:", canvas.width, canvas.height)
                for (let i = 0, j = 0; i < idd.length; i += 4, j++) {
                    zxing_asm.HEAPU8[input + j] = idd[i];
                }
                with_time("decode_multi per one angle", () => {
                    const err = zxing_asm._decode_multi(decodePtr);
                })
                if (barcode !== "") {
                    console.log(">>>>>>>>", barcode)
                    return
                }
    
    
                if (overlay !== null && angle === 90) {
                    console.log("TEMPIMG")
                    overlay.width = rotatedImage!.width
                    overlay.height = rotatedImage!.height
                    const tmp_ctx = overlay.getContext("2d")!
                    tmp_ctx.putImageData(rotatedImage!, 0, 0)
                    // //                tmp_ctx.putImageData(imageData,0,0)
                    //                 tmp_ctx.drawImage(image, 0, 0)
                }
            }
        })

        res.push(barcode)


    }


    return res
}


// export const scanBarcode_2 = (image:ImageBitmap, width: number, height: number, angle: number[]): string => {
//     barcode = ""
//     with_time("decode_multi_pre",()=>{
//         canvas.width = image.width
//         canvas.height = image.height
//         const ctx = canvas.getContext('2d')!
//         ctx.drawImage(image, 0, 0, width, height)
//         const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
//         const idd = imageData.data;
//         const input = zxing_asm._resize(canvas.width, canvas.height);
//         console.log("target image:", canvas.width, canvas.height)
//         for (let i = 0, j = 0; i < idd.length; i += 4, j++) {
//             zxing_asm.HEAPU8[input + j] = idd[i];
//         }
//     })

//     if(overlay !==null){
//         overlay.width = canvas.width
//         overlay.height = canvas.height
//         const tmp_ctx = overlay?.getContext("2d")!
//         tmp_ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
//     }

//     with_time("decode_multi",()=>{
//         const err = zxing_asm._decode_multi(decodePtr);
//     })
//     return barcode
// }

// export const scanBarcode_old = (image: ImageData, width: number, height: number, angle: number[]): string => {
//     barcode = ""
//     with_time("decode_multi_pre",()=>{

//         const canvas = new OffscreenCanvas(image.width, image.height)
//         const ctx = canvas.getContext('2d')!
//         ctx.putImageData(image, 0, 0)
//         const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
//         const idd = imageData.data;
//         const input = zxing_asm._resize(canvas.width, canvas.height);
//         for (let i = 0, j = 0; i < idd.length; i += 4, j++) {
//             zxing_asm.HEAPU8[input + j] = idd[i];
//         }
//     })

//     with_time("decode_multi",()=>{
//         const err = zxing_asm._decode_multi(decodePtr);
//     })
//     return barcode
// }

onmessage = (event) => {
    console.log('--------- Worker message ---------')
    console.log(event)

    if (event.data.message === WorkerCommand.SET_OVERLAY) {
        overlay = event.data.overlay
    } else if (event.data.message === WorkerCommand.SCAN_BARCODE) {
        const width = event.data.width
        const height = event.data.height
        const angles = event.data.angles
        const images: ImageBitmap[] = event.data.images
        //        const image = event.data.image
        if (init_zxing === false || init_cv === false) {
            console.log("not yet")
            ctx.postMessage({ message: WorkerResponse.NOT_PREPARED })
        } else {
            // const barcodes: string[] = []
            // for (let i = 0; i < images.length; i++) {
            //     //                const image = images[i]
            //     const image = images[i]
            //     with_time("SCAN BARCODE TIME", () => {
            //         const result = scanBarcode(image, angles)
            //         barcodes.push(result)
            //     })
            // }
            const barcodes = scanBarcode(images, angles)

            ctx.postMessage({ message: WorkerResponse.SCANED_BARCODE, barcodes: barcodes })
        }
    }
};

export default onmessage