import { AIConfig } from "../const";


export interface SplitCanvasMetaData {
    minX   : number // 画像全体での開始位置X (ratio)
    minY   : number // 画像全体での開始位置Y (ratio)
    maxX   : number // 画像全体での終了位置X (ratio)
    maxY   : number // 画像全体での終了位置Y (ratio)
}


export const captureVideoImageToCanvas = (video:HTMLVideoElement):HTMLCanvasElement => {
    const videoCaptureCanvas    = document.createElement("canvas");
    videoCaptureCanvas.width = video.width
    videoCaptureCanvas.height = video.height

    const tmpCtx                = videoCaptureCanvas.getContext('2d')!
    tmpCtx.drawImage(video, 0, 0, videoCaptureCanvas.width, videoCaptureCanvas.height);
    return videoCaptureCanvas
}


export const splitCanvasToBoxes = (originaCanvas: HTMLCanvasElement): SplitCanvasMetaData[] => {
    const col_num = AIConfig.SPLIT_COLS
    const row_num = AIConfig.SPLIT_ROWS
    const tile_num = col_num * row_num
    const sizeWithMergin = 1.0 + AIConfig.SPLIT_MERGIN
    const mergin = AIConfig.SPLIT_MERGIN

    const resultBoxes = []
    for (let i = 0; i < tile_num; i++) {
        const col = i % col_num
        const row = Math.floor(i / col_num)


        const minX = (sizeWithMergin / col_num) * col - (mergin / col_num) * col
        const minY = (sizeWithMergin / row_num) * row - (mergin / row_num) * row
        const maxX = minX + (sizeWithMergin / col_num)
        const maxY = minY + (sizeWithMergin / row_num)

        let box: SplitCanvasMetaData = {
            minY: minY, // 割合
            minX: minX, // 割合
            maxY: maxY, // 割合
            maxX: maxX, // 割合
        }
        resultBoxes.push(box)
    }
    return resultBoxes
}

export const drawGrid = (canvas:HTMLCanvasElement, interval:number) =>{
    const ctx = canvas.getContext('2d')!
    ctx.strokeStyle  = "#aaaaaa";
    ctx.lineWidth    = 1;
    const font       = "16px sans-serif";
    ctx.font         = font;
    ctx.textBaseline = "top";
    ctx.fillStyle = "#00CCCCCC";

    ctx.beginPath()
    for(let i =0; i < canvas.width; i += 100){
        ctx.moveTo(i , 0)
        ctx.lineTo(i, canvas.height)
    }
    for(let i =0; i < canvas.height; i += 100){
        ctx.moveTo(0, i )
        ctx.lineTo(canvas.width, i)
    }
    ctx.closePath()
    ctx.stroke()
}

export const drawBoxGrid = (canvas:HTMLCanvasElement, boxMetadata:SplitCanvasMetaData[]) =>{
    const ctx = canvas.getContext('2d')!
    ctx.strokeStyle  = "#aaaaaa";
    ctx.lineWidth    = 1;
    const font       = "16px sans-serif";
    ctx.font         = font;
    ctx.textBaseline = "top";
    ctx.fillStyle = "#00ccccee";
    for(let i = 0; i < boxMetadata.length; i++){
        const box = boxMetadata[i]
        ctx.strokeRect(
            Math.floor(box.minX * canvas.width), 
            Math.floor(box.minY * canvas.height), 
            Math.floor(box.maxX * canvas.width  - box.minX * canvas.width), 
            Math.floor(box.maxY * canvas.height - box.minY * canvas.height))
    }
}


export const getBoxImages = (canvas:HTMLCanvasElement, boxMetadata:SplitCanvasMetaData[]) =>{
    const ctx = canvas.getContext('2d')!
    const res = []
    for(let i = 0; i < boxMetadata.length; i++){
        const box = boxMetadata[i]
        const start_x = Math.floor(box.minX * canvas.width)
        const start_y = Math.floor(box.minY * canvas.height)
        const width   = Math.floor(box.maxX * canvas.width  - box.minX * canvas.width) 
        const height  = Math.floor(box.maxY * canvas.height - box.minY * canvas.height)
        const image = ctx.getImageData(start_x, start_y, width, height)
        res.push(image)
    }
    return res
}


export const getBoxImageBitmap = (canvas:HTMLCanvasElement,  boxMetadata:SplitCanvasMetaData[]): ImageBitmap[] => {
    const res = []
    for(let i = 0; i < boxMetadata.length; i++){
        const box = boxMetadata[i]
        const start_x = Math.floor(box.minX * canvas.width)
        const start_y = Math.floor(box.minY * canvas.height)
        const width   = Math.floor(box.maxX * canvas.width  - box.minX * canvas.width) 
        const height  = Math.floor(box.maxY * canvas.height - box.minY * canvas.height)

        if (width === 0 || height === 0){ // イメージがまだ準備しきれていない段階。
            return []
        }
        const offscreen = new OffscreenCanvas(width, height)

        const offctx    = offscreen.getContext("2d")!
        offctx.drawImage(canvas, start_x, start_y, width, height, 0, 0, width, height)
        const imageBitmap = offscreen.transferToImageBitmap()
        res.push(imageBitmap)
    }
    return res
}

