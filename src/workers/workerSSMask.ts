import { WorkerCommand, WorkerResponse } from '../const';
import { with_time } from '../utils';
import { drawMask } from '../AI/SemanticSegmentation';


const ctx: Worker = self as any  // eslint-disable-line no-restricted-globals


onmessage = async (event) => {
  console.log('--------- WorkerSSMask message ---------')
  console.log(event)

  if(event.data.message === WorkerCommand.DRAW_MASK){
    const maskParts   = event.data.maskParts
    const boxMetadata = event.data.boxMetadata
    let mask_img:ImageData|null
    with_time("Draw Mask Image",()=>{
      mask_img = drawMask(boxMetadata, maskParts)
    }, false)
    ctx.postMessage({message:WorkerResponse.DREW_MASK, mask_img:mask_img!})
    event.data.maskParts   = null
    event.data.boxMetadata = null
  }
};

export default onmessage
