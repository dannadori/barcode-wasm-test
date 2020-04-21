
export const captureVideoImageToCanvas = (video:HTMLVideoElement, ratio:number):HTMLCanvasElement => {
    const videoCaptureCanvas    = document.createElement("canvas");
    if(ratio === -1){
        videoCaptureCanvas.width    = video.videoWidth
        videoCaptureCanvas.height   = video.videoHeight
    }else{
        videoCaptureCanvas.width    = video.videoWidth * ratio
        videoCaptureCanvas.height   = video.videoHeight * ratio
    }

    const tmpCtx                = videoCaptureCanvas.getContext('2d')!
    tmpCtx.drawImage(video, 0, 0, videoCaptureCanvas.width, videoCaptureCanvas.height);
    return videoCaptureCanvas
}
