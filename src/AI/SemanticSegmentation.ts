

import * as tf from '@tensorflow/tfjs'
import {  with_time_async } from '../utils'
import { AIConfig } from '../const'
import { SplitCanvasMetaData } from './PreProcessing'


export const predictByImageBitmaps = async (model:tf.GraphModel, bms:ImageBitmap[]) : Promise<number[][][] | null> =>{
    let mapDatas:number[][][]|null = null
    await with_time_async("Predict local",async ()=>{
        //console.log('Prediction start ...')
        const res = tf.tidy(  () => {
            const bm_num = bms.length

            const canvasTensors = []
            for(let i =0;i<bm_num;i++){
                const offscreen = new OffscreenCanvas(bms[i].width, bms[i].height)
                const ctx = offscreen.getContext('2d')!
                ctx.drawImage(bms[i], 0, 0, bms[i].width, bms[i].height)
                const img = ctx.getImageData(0, 0, bms[i].width, bms[i].height)

                const box_tensor = tf.browser.fromPixels(img).resizeNearestNeighbor([AIConfig.SPLIT_WIDTH,AIConfig.SPLIT_WIDTH])
                canvasTensors.push(box_tensor)
            }

            const inputTensor = tf.stack(canvasTensors)
            //推論実行
            console.log('execute')
            let res = tf.squeeze(model.execute(inputTensor) as tf.Tensor)
            if(bm_num===1){
                res = res.expandDims()
            }
            return res
        }) as tf.Tensor<tf.Rank>

        // console.log('Prediction is done. Map drawing...')
        mapDatas = await res.array() as number[][][]
        res.dispose()
    }, false)

    return mapDatas!
}


export const drawMask = (boxMetadata:SplitCanvasMetaData[] , maskParts: number[][][]): ImageData =>{
    const col_num = AIConfig.SPLIT_COLS
    const row_num = AIConfig.SPLIT_ROWS
    const sizeWithMergin = 1.0 + AIConfig.SPLIT_MERGIN


    const mergedMapWidth  = Math.ceil((maskParts[0].length    * col_num) / sizeWithMergin)
    const mergedMapHeight = Math.ceil((maskParts[0][0].length * row_num) / sizeWithMergin)
    const pixelData = new Uint8ClampedArray(mergedMapWidth * mergedMapHeight * 4)

    const canvas_num = maskParts.length

    for (let i = 0; i < canvas_num; i++) {
        const maskPart  = maskParts[i]
        const box       = boxMetadata[i]

        const width     = maskPart.length
        const height    = maskPart[0].length

        const x_offset = Math.ceil(mergedMapWidth  * box.minX)
        const y_offset = Math.ceil(mergedMapHeight * box.minY)
        // マスクビットマップ作成
        for (let rowIndex = 0; rowIndex < height; ++rowIndex) {
            for (let columnIndex = 0; columnIndex < width; ++columnIndex) {
                const pix_offset = ( (rowIndex + y_offset) * mergedMapWidth + (columnIndex + x_offset)) * 4
                if(pixelData[pix_offset + 0] !== 0){
                    continue
                }

                let color = 0
                if (maskPart![rowIndex][columnIndex] === 0) {
                    color = 0
                } else {
                    color = 128
                }

                pixelData[pix_offset + 0] = color
                pixelData[pix_offset + 1] = color
                pixelData[pix_offset + 2] = color
                pixelData[pix_offset + 3] = 128
            }
        }
    }
    const imageData = new ImageData(pixelData, mergedMapWidth, mergedMapHeight);
    return imageData
}



