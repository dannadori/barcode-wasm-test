
export const with_time = (name:string, func:any) =>{
    const start = performance.now();
    func();
    const end = performance.now();
    
    const elapsed = (end - start);
    const elapsedStr = elapsed.toFixed(3);
    console.log(`[WITH TIME] ${name}: ${elapsedStr} ms`);
}

export const with_time_async = async(name:string, func:any) =>{
    const start = performance.now();
    await func();
    const end = performance.now();
    
    const elapsed = (end - start);
    const elapsedStr = elapsed.toFixed(3);
    console.log(`[WITH TIME] ${name}: ${elapsedStr} ms`);
}




interface OverlayLocation {
    overlayWidth: number
    overlayHeight: number
    overlayXOffset: number
    overlayYOffset: number
}

export function findOverlayLocation(parent: HTMLDivElement, videoWidth: number, videoHeight: number): OverlayLocation {
    // Canvasの座標空間
    const parentLeft = parent.getBoundingClientRect().left
    const parentRight = parent.getBoundingClientRect().right
    const parentTop = parent.getBoundingClientRect().top
    const parentBottom = parent.getBoundingClientRect().bottom

    const parentWidth = parentRight - parentLeft
    const parentHeight = parentBottom - parentTop

    // Videoの表示座標の特定
    const parentAspect = parentWidth / parentHeight
    const videoAspect = videoWidth / videoHeight

    let overlayHeight = 0
    let overlayWidth = 0
    let overlayXOffset = 0
    let overlayYOffset = 0

    if (parentAspect > videoAspect) {
        //キャンバスのほうが横長　➔　キャンバスの縦で律速
        // 
        overlayHeight = parentHeight
        overlayYOffset = 0
        overlayWidth = overlayHeight * (videoWidth / videoHeight)
        overlayXOffset = (parentWidth - overlayWidth) / 2
    } else {
        //キャンバスのほうが縦長　➔　キャンバスの横で律速
        overlayWidth = parentWidth
        overlayXOffset = 0
        overlayHeight = overlayWidth * (videoHeight / videoWidth)
        overlayYOffset = (parentHeight - overlayHeight) / 2
    }
    //console.log('------------', overlayWidth, overlayHeight, overlayXOffset, overlayYOffset)
    return { overlayWidth, overlayHeight, overlayXOffset, overlayYOffset }

}