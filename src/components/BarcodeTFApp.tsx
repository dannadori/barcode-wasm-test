import * as React from 'react';
import { GlobalState } from '../reducers';
import { WorkerResponse, DisplayConstraint, WorkerCommand, AIConfig, AppStatus, AppMode, AppModes } from '../const';
import { captureVideoImageToCanvas, splitCanvasToBoxes,  getBoxImageBitmap, drawBoxGrid, SplitCanvasMetaData } from '../AI/PreProcessing';
import { findOverlayLocation, } from '../utils'
import { worker } from 'cluster';

class BarcodeTFApp extends React.Component {
    ////////////////////
    // HTML Component //
    ////////////////////
    parentRef = React.createRef<HTMLDivElement>()
    imageRef1 = React.createRef<HTMLImageElement>()
    imageRef2 = React.createRef<HTMLImageElement>()
    videoRef  = React.createRef<HTMLVideoElement>()
    barcodeDisplayCanvasRef = React.createRef<HTMLCanvasElement>()
    controllerCanvasRef = React.createRef<HTMLCanvasElement>()
    workerSSMaskMonitorCanvasRef = React.createRef<HTMLCanvasElement>()
    workerAreaCVCanvasRef        = React.createRef<HTMLCanvasElement>()
    ////////////////////
    // Component Size //
    ////////////////////
    videoHeight = 0
    videoWidth = 0
    parentHeight = 0
    parentWidth = 0

    overlayWidth = 0
    overlayHeight = 0
    overlayXOffset = 0
    overlayYOffset = 0


    ///////////////
    // Worker!!  //
    ///////////////
    worker_num = 1
    workerSS:Worker|null = null
    workerSSMask:Worker|null = null
    workerCV:Worker|null = null

    workerSSInitialized = false
    workerSSMaskInitialized = false
    workerCVInitialized = false

    video_img:ImageData|null = null
    working_video_img:ImageData|null = null
    /**
       * FPS測定用
       */
    frame = 0
    fps   = 0.0
    frameCountStartTime = new Date().getTime()
    gameLoop() {
        this.frame++
        const thisTime = new Date().getTime()
        if (thisTime - this.frameCountStartTime > 1000) {
            const fps = (this.frame / (thisTime - this.frameCountStartTime)) * 1000
            this.frameCountStartTime = new Date().getTime()
            this.frame = 0
            this.fps = fps
        }
    }


    checkAndStart = () =>{
        if(this.workerSSInitialized      === true && 
            this.workerSSMaskInitialized === true && 
            this.workerCVInitialized     === true
            ){
            this.requestScanBarcode()
        }
    }

    previewMask = (maskImage:ImageData) =>{
        const offscreen = new OffscreenCanvas(maskImage.width, maskImage.height)
        const ctx = offscreen.getContext("2d")!
        ctx.putImageData(maskImage, 0, 0)

        const maskMonitor  = this.workerSSMaskMonitorCanvasRef.current!
        maskMonitor.width  = this.overlayWidth
        maskMonitor.height = this.overlayHeight
        const ctx2 = maskMonitor.getContext("2d")!
        ctx2.drawImage(offscreen, 0, 0, maskMonitor.width, maskMonitor.height)
    }
    previewAreas = (areas:number[][], barcodes:string[]) =>{
        const areaCV  = this.workerAreaCVCanvasRef.current!
        areaCV.width  = this.overlayWidth
        areaCV.height = this.overlayHeight
        const ctx2 = areaCV.getContext("2d")!
        ctx2.clearRect(0, 0, areaCV.width, areaCV.height)
        ctx2.strokeStyle  = "#DD3333FF";
        ctx2.lineWidth    = 1;
        const font       = "16px sans-serif";
        ctx2.font         = font;
        ctx2.textBaseline = "top";
        ctx2.fillStyle = "#DD3333FF";


        const area_num = areas.length
        ctx2.beginPath();
        for(let i = 0; i < area_num; i ++){
            const area = areas[i]
            // ctx2.moveTo(area[0] * areaCV.width, area[1] * areaCV.height)
            // ctx2.lineTo(area[2] * areaCV.width, area[3] * areaCV.height)
            // ctx2.lineTo(area[6] * areaCV.width, area[7] * areaCV.height)
            // ctx2.lineTo(area[4] * areaCV.width, area[5] * areaCV.height)
            // ctx2.lineTo(area[0] * areaCV.width, area[1] * areaCV.height)
            // ctx2.stroke();
            ctx2.fillText(barcodes[i], area[0] * areaCV.width, area[1] * areaCV.height)
        }
        ctx2.closePath();

    }    

    /**
     * ワーカーの初期化
     */
    async initWorker() {
        console.log("Worker initializing... ")

        // SemanticSegmentation 用ワーカー
        this.workerSS = new Worker('../workers/workerSS.ts', { type: 'module' })
        this.workerSS.onmessage = (event) => {
            if (event.data.message === WorkerResponse.INITIALIZED) {
                console.log("WORKERSS INITIALIZED")
                this.workerSSInitialized = true
                this.checkAndStart()
            }else if(event.data.message === WorkerResponse.PREDICTED_AREA){
                console.log("MASK PREDICTED", event)
                this.working_video_img = this.video_img //再キャプチャの前に処理中のimageをバックアップ
                // 再キャプチャ
                this.requestScanBarcode()

                // マスク作成
                const maskParts   = event.data.maskParts
                const boxMetadata = event.data.boxMetadata
                this.workerSSMask!.postMessage({ message: WorkerCommand.DRAW_MASK, boxMetadata: boxMetadata,maskParts: maskParts})
            }
        }

        // マスク作成 用ワーカー
        this.workerSSMask = new Worker('../workers/workerSSMask.ts', { type: 'module' })
        this.workerSSMaskInitialized = true
        this.workerSSMask.onmessage = (event) => {
            if (event.data.message === WorkerResponse.DREW_MASK) {
                console.log("DREW MASK", this.workerSSMaskMonitorCanvasRef.current!.width, this.workerSSMaskMonitorCanvasRef.current!.height)
                const maskImage:ImageData = event.data.mask_img
                this.previewMask(maskImage)

                const videoOffscreen = new OffscreenCanvas(this.working_video_img!.width, this.working_video_img!.height)
                videoOffscreen.getContext("2d")!.putImageData(this.working_video_img!, 0, 0)
                const videoBitmap = videoOffscreen.transferToImageBitmap()

                const maskOffscreen = new OffscreenCanvas(maskImage.width, maskImage.height)
                maskOffscreen.getContext("2d")!.putImageData(maskImage, 0, 0)
                const maskBitmap = maskOffscreen.transferToImageBitmap()

                console.log("worker_CV_Calling!!")
                this.workerCV!.postMessage({ message: WorkerCommand.SCAN_BARCODES, videoBitmap: videoBitmap, maskBitmap:maskBitmap}, [videoBitmap, maskBitmap])
            }
        }

        // バーコード読み取り用ワーカー
        this.workerCV = new Worker('../workers/workerCV.ts', { type: 'module' })
        this.workerCV.onmessage = (event) => {
            if (event.data.message === WorkerResponse.INITIALIZED) {
                console.log("WORKERCV INITIALIZED")
                this.workerCVInitialized = true
                this.checkAndStart()
            }else if(event.data.message === WorkerResponse.SCANNED_BARCODES){
                const barcodes = event.data.barcodes
                const areas    = event.data.areas
                console.log("SCANNED_BARCODES", areas, barcodes)
                this.previewAreas(areas, barcodes)
            }
        }




        return
    }

    /**
     * HTMLコンポーネントに位置計算
     */
    private checkParentSizeChanged(video: HTMLVideoElement) {
        // サイズ算出
        this.videoHeight = video.videoHeight
        this.videoWidth  = video.videoWidth
        const parentHeight = video.getBoundingClientRect().bottom - video.getBoundingClientRect().top
        const parentWidth  = video.getBoundingClientRect().right - video.getBoundingClientRect().left
        // console.log("--- checkParentSizeChanged ---")
        // console.log(video.getBoundingClientRect().left, video.getBoundingClientRect().top, video.getBoundingClientRect().right, video.getBoundingClientRect().bottom)
        // console.log(parentWidth, parentHeight)

        // サイズ変更の確認。 ※ TBD うまく動かないので、trueをつけている。
        //    if(this.parentHeight !== parentHeight || this.parentWidth !== parentWidth || true){
        if (this.parentHeight !== parentHeight || this.parentWidth !== parentWidth || this.overlayYOffset === 0) {
            this.parentHeight = parentHeight
            this.parentWidth = parentWidth
            const { overlayWidth, overlayHeight, overlayXOffset, overlayYOffset } = findOverlayLocation(this.parentRef.current!, this.videoWidth, this.videoHeight)
            this.overlayWidth = overlayWidth
            this.overlayHeight = overlayHeight
            this.overlayXOffset = overlayXOffset
            this.overlayYOffset = overlayYOffset
            //props.frameSizeChanged()
        }
    }

    /**
     * マウント時の処理
     * モデルのロード、カメラの準備ができたらイベント発行する
     */
    componentDidMount() {
        console.log('Initializing')
        const props = this.props as any

        const initWorkerPromise = this.initWorker()

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const webCamPromise = navigator.mediaDevices
                .getUserMedia({
                    audio: false,
                    video: DisplayConstraint.video
                })
                .then(stream => {
                    console.log(this.videoRef)
                    this.videoRef.current!.srcObject = stream;
                    return new Promise((resolve, reject) => {
                        this.videoRef.current!.onloadedmetadata = () => {
                            resolve();
                        };
                    });
                });
            
            Promise.all([initWorkerPromise, webCamPromise])
                .then((res) => {
                    console.log('Camera and model ready!')
                    props.initialized()
                })
                .catch(error => {
                    console.error(error);
                });
        }           
    }



    requestScanBarcode = async () => {
        console.log('requestScanBarcode')
        const video = this.videoRef.current!
        const controller = this.controllerCanvasRef.current!
        controller.width = this.overlayWidth
        controller.height = this.overlayHeight


        // if(video.width === 0 || video.height === 0){ // Videoが準備されていない場合スキップ
        //     window.requestAnimationFrame(this.execMainLoop);
        // }
        // if(this.overlayWidth === 0 || this.overlayHeight === 0){ // Videoが準備されていない場合スキップ
        //     window.requestAnimationFrame(this.execMainLoop);
        // }

        const captureCanvas = captureVideoImageToCanvas(video)
        const boxMetadata = splitCanvasToBoxes(captureCanvas)
        //drawBoxGrid(controller, boxMetadata)

        const images = getBoxImageBitmap(captureCanvas, boxMetadata)
        this.workerSS!.postMessage({ message: WorkerCommand.PREDICT_AREA, boxMetadata: boxMetadata, images: images}, images)
        
        this.video_img = captureCanvas.getContext("2d")!.getImageData(0, 0, captureCanvas.width, captureCanvas.height)
        captureCanvas.remove()

    }


    render() {
        const gs = this.props as GlobalState
        const video = this.videoRef.current!
        const controller = this.controllerCanvasRef.current!



        if(gs.status === AppStatus.INITIALIZED){
            console.log('initialized')
            this.checkParentSizeChanged(video)
        }



        return (
            <div style={{ width: "100%", height: "100%", position: "fixed", top: 0, left: 0, }} ref={this.parentRef} >
                <img src="imgs/barcode01.png" alt="barcode" ref={this.imageRef1} />
                <img src="imgs/barcode02.png" alt="barcode" ref={this.imageRef2} />
                <video
                    autoPlay
                    playsInline
                    muted
                    ref={this.videoRef}
                    style={{ width: "100%", height: "100%", position: "fixed", top: 0, left: 0, }}
                    width={this.videoWidth}
                    height={this.videoHeight}
                />
                <canvas
                    ref = {this.workerSSMaskMonitorCanvasRef}
                    style = {{ position: "fixed", top: this.overlayYOffset, left: this.overlayXOffset, }}
                    width = {this.overlayWidth}
                    height = {this.overlayHeight}
                />
                <canvas
                    ref = {this.workerAreaCVCanvasRef}
                    style = {{ position: "fixed", top: this.overlayYOffset, left: this.overlayXOffset, }}
                    width = {this.overlayWidth}
                    height = {this.overlayHeight}
                />
                <canvas
                    ref={this.barcodeDisplayCanvasRef}
                    style={{ position: "fixed", top: this.overlayYOffset, left: this.overlayXOffset, }}
                    width={this.overlayWidth}
                    height={this.overlayHeight}
                />

                <canvas
                    ref={this.controllerCanvasRef}
                    style={{ position: "fixed", top: this.overlayYOffset, left: this.overlayXOffset, }}
                    width={this.overlayWidth}
                    height={this.overlayHeight}
                />

            </div>
        )
    }

}


export default BarcodeTFApp;