
import * as tf from '@tensorflow/tfjs';
import { predictByImageBitmaps, drawMask } from '../AI/SemanticSegmentation';
import { AIConfig, WorkerCommand, WorkerResponse } from '../const';


const ctx: Worker = self as any  // eslint-disable-line no-restricted-globals

let model:tf.GraphModel|null
tf.loadGraphModel(AIConfig.SS_MODEL_PATH).then((res)=>{
  model=res
  console.log("tf model loaded")
  ctx.postMessage({ message: WorkerResponse.INITIALIZED})
})


onmessage = async (event) => {
  console.log("event", event)
  //// セマンティックセグメンテーション設定
  if(event.data.message === WorkerCommand.PREDICT_AREA){
    console.log("requested predict area")
    const boxMetadata = event.data.boxMetadata
    const images:ImageBitmap[] = event.data.images
    const maskParts = await predictByImageBitmaps(model!, images)
    const maskImageData = drawMask(boxMetadata, maskParts!)
    const offscreen = new OffscreenCanvas(maskImageData.width, maskImageData.height)
    offscreen.getContext("2d")!.putImageData(maskImageData, 0, 0)
    const maskBitmap = offscreen.transferToImageBitmap()
   ctx.postMessage({message:WorkerResponse.PREDICTED_AREA, maskBitmap:maskBitmap}, [maskBitmap])

//    ctx.postMessage({message:WorkerResponse.PREDICTED_AREA, maskParts:maskParts, boxMetadata:boxMetadata})
//    ctx.postMessage({message:WorkerResponse.PREDICTED_AREA})

    for(let i =0;i<images.length;i++){
      images[i].close()
    }
    event.data.boxMetadata = null
    event.data.images      = null
  }
} 

export default onmessage
