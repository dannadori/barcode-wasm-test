import * as React from 'react';
import { GlobalState } from '../reducers';
import { WorkerResponse, WorkerCommand,AppStatus, DisplayConstraintOptions } from '../const';
import { captureVideoImageToCanvas, splitCanvasToBoxes,  getBoxImageBitmap, drawBoxGrid } from '../AI/PreProcessing';
import { findOverlayLocation, } from '../utils'
import { Dropdown, Label } from 'semantic-ui-react'

interface BarcodeTFAppState{
    videoResolution:string,
    colnum:number,
    rownum:number,
    showSS:boolean,
    showGrid:boolean,
}

class BarcodeTFApp2 extends React.Component {
    state: BarcodeTFAppState = {
        videoResolution: "VGA",
        colnum: 1,
        rownum: 1,
        showSS: false,
        showGrid: false,
    }


    ////////////////////
    // HTML Component //
    ////////////////////
    parentRef = React.createRef<HTMLDivElement>()
    imageRef1 = React.createRef<HTMLImageElement>()
    imageRef2 = React.createRef<HTMLImageElement>()
    videoRef  = React.createRef<HTMLVideoElement>()
    barcodeDisplayCanvasRef = React.createRef<HTMLCanvasElement>()
    controllerCanvasRef = React.createRef<HTMLCanvasElement>()
    statusCanvasRef     = React.createRef<HTMLCanvasElement>()
    controllerDivRef = React.createRef<HTMLDivElement>()
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
    workerCV:Worker|null = null

    workerSSInitialized = false
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
            this.workerCVInitialized     === true
            ){
            this.requestScanBarcode()
        }
    }

    previewMask = (maskImage:ImageBitmap) =>{
        // const offscreen = new OffscreenCanvas(maskImage.width, maskImage.height)
        // const ctx = offscreen.getContext("2d")!
        // ctx.putImageData(maskImage, 0, 0)

        const maskMonitor  = this.workerSSMaskMonitorCanvasRef.current!
        maskMonitor.width  = this.overlayWidth
        maskMonitor.height = this.overlayHeight
        const ctx2 = maskMonitor.getContext("2d")!
        ctx2.drawImage(maskImage, 0, 0, maskMonitor.width, maskMonitor.height)
    }
    clearMask = () =>{
        const maskMonitor  = this.workerSSMaskMonitorCanvasRef.current!
        maskMonitor.width  = this.overlayWidth
        maskMonitor.height = this.overlayHeight
        const ctx2 = maskMonitor.getContext("2d")!
        ctx2.clearRect(0, 0, maskMonitor.width, maskMonitor.height)
    }
    previewAreas = (areas:number[][], barcodes:string[]) =>{
        const areaCV  = this.workerAreaCVCanvasRef.current!
        areaCV.width  = this.overlayWidth
        areaCV.height = this.overlayHeight
        const ctx2 = areaCV.getContext("2d")!
        ctx2.clearRect(0, 0, areaCV.width, areaCV.height)
        ctx2.strokeStyle  = "#DD3333FF";
        ctx2.lineWidth    = 1;
        const font       = "32px sans-serif";
        ctx2.font         = font;
        ctx2.textBaseline = "top";
        ctx2.fillStyle = "#DD3333FF";


        const area_num = areas.length
        ctx2.beginPath();
        for(let i = 0; i < area_num; i ++){
            if(barcodes[i] === ""){
                continue
            }
            const area = areas[i]
            ctx2.moveTo(area[0] * areaCV.width + 10, area[1] * areaCV.height + 10)
            ctx2.lineTo(area[2] * areaCV.width - 10, area[3] * areaCV.height + 10)
            ctx2.lineTo(area[6] * areaCV.width - 10, area[7] * areaCV.height - 10)
            ctx2.lineTo(area[4] * areaCV.width + 10, area[5] * areaCV.height - 10)
            ctx2.lineTo(area[0] * areaCV.width + 10, area[1] * areaCV.height + 10)
            ctx2.stroke();
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

                const maskBitmap = event.data.maskBitmap 
                if(this.state.showSS){
                    this.previewMask(maskBitmap)
                }else{
                    this.clearMask()
                }


                const videoOffscreen = new OffscreenCanvas(this.working_video_img!.width, this.working_video_img!.height)
                videoOffscreen.getContext("2d")!.putImageData(this.working_video_img!, 0, 0)
                const videoBitmap = videoOffscreen.transferToImageBitmap()

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
                event.data.barcodes = null
                event.data.areas    = null
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

        let parentHeight = video.getBoundingClientRect().bottom - video.getBoundingClientRect().top
        const parentWidth  = video.getBoundingClientRect().right - video.getBoundingClientRect().left
        // console.log("--- checkParentSizeChanged ---")
        // console.log(video.getBoundingClientRect().left, video.getBoundingClientRect().top, video.getBoundingClientRect().right, video.getBoundingClientRect().bottom)
        // console.log(parentWidth, parentHeight)

        if(parentHeight === 0){
            parentHeight = 500
        }

        this.parentHeight = parentHeight
        this.parentWidth = parentWidth
        const { overlayWidth, overlayHeight, overlayXOffset, overlayYOffset } = findOverlayLocation(this.parentRef.current!, this.videoWidth, this.videoHeight)
        this.overlayWidth = overlayWidth
        this.overlayHeight = overlayHeight
        this.overlayXOffset = overlayXOffset
        this.overlayYOffset = overlayYOffset

        // const status = this.statusCanvasRef.current!
        // const ctx = status.getContext("2d")!
        // ctx.clearRect(0,0,status.width, status.height)
        // ctx.fillText(`${this.videoWidth}, ${this.videoHeight}, `,100,30)
        // ctx.fillText(`${video.width}, ${video.height}, `,100,45)
        // ctx.fillText(`${parentWidth}, ${parentHeight}, `,100,60)
        // ctx.fillText(`${this.overlayXOffset}, ${this.overlayYOffset}, `,100,90)
        // ctx.fillText(`${this.overlayWidth}, ${this.overlayHeight}, `,100,120)

        // console.log(`>>>>1   ${this.videoWidth}, ${this.videoHeight}, `)
        // console.log(`>>>>2   ${video.width}, ${video.height}, `)
        // console.log(`>>>>3   ${parentWidth}, ${parentHeight}, `)
        // console.log(`>>>>4   ${this.overlayXOffset}, ${this.overlayYOffset}, `)
        // console.log(`>>>>5   ${this.overlayWidth}, ${this.overlayHeight}, `)
        
        // console.log(`>>>> 6  ${video.getBoundingClientRect().bottom} - ${video.getBoundingClientRect().top}`)
        // console.log(`>>>> 6  ${video.getBoundingClientRect().right} - ${video.getBoundingClientRect().left}`)

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
                    video: DisplayConstraintOptions[this.state.videoResolution]
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

    changeCameraResolution = (resolution:string) =>{
        (this.videoRef.current!.srcObject as MediaStream ).getTracks().map(s=>s.stop())
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const webCamPromise = navigator.mediaDevices
                .getUserMedia({
                    audio: false,
                    video: DisplayConstraintOptions[resolution]
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
            
            Promise.all([webCamPromise])
                .then((res) => {
                    console.log('Camera and model ready!')
                    const video = this.videoRef.current!
                    this.checkParentSizeChanged(video)
                    this.setState({})
                })
                .catch(error => {
                    console.error(error);
                });
        }           

        this.setState({videoResolution:resolution})
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
        if(captureCanvas.width === 0){
            captureCanvas.remove()
            window.requestAnimationFrame(this.requestScanBarcode);
            return
        }
        const boxMetadata   = splitCanvasToBoxes(captureCanvas, this.state.colnum, this.state.rownum)
        if(this.state.showGrid){
            drawBoxGrid(controller, boxMetadata)
        }

        const images = getBoxImageBitmap(captureCanvas, boxMetadata)

        this.workerSS!.postMessage({ message: WorkerCommand.PREDICT_AREA, boxMetadata: boxMetadata, images: images}, images)
        
        this.video_img = captureCanvas.getContext("2d")!.getImageData(0, 0, captureCanvas.width, captureCanvas.height)
        captureCanvas.remove()

    }


    render() {
        const gs = this.props as GlobalState
        const video = this.videoRef.current!

        if(gs.status === AppStatus.INITIALIZED){
            console.log('initialized')
            this.checkParentSizeChanged(video)
        }

        const constraints = Object.keys(DisplayConstraintOptions)
        const constraintOptions = constraints.map(v =>{
            return {key:v, text:v, value:v}
        })

        const colnumOptionList = [1,2,3]
        const colnumOptions = colnumOptionList.map(v =>{
            return {key:v, text:v, value:v}
        })
        const rownumOptionList = [1,2,3]
        const rownumOptions = rownumOptionList.map(v =>{
            return {key:v, text:v, value:v}
        })

        return (
            <div style={{ width: "100%", height: "100%", position: "relative", top: 0, left: 0, }} ref={this.parentRef} >
                {/* <img src="imgs/barcode01.png" alt="barcode" ref={this.imageRef1} />
                <img src="imgs/barcode02.png" alt="barcode" ref={this.imageRef2} /> */}
                <video
                    autoPlay
                    playsInline
                    muted
                    ref={this.videoRef}
                    //style={{ position: "absolute", top: this.overlayYOffset, left: this.overlayXOffset, width:this.overlayWidth, height:this.overlayHeight}}
                    
                    style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0, }}
                />
                <canvas
                    ref = {this.workerSSMaskMonitorCanvasRef}
                    style={{ position: "absolute", top: this.overlayYOffset, left: this.overlayXOffset, width:this.overlayWidth, height:this.overlayHeight}}
                />
                <canvas
                    ref = {this.workerAreaCVCanvasRef}
                    style={{ position: "absolute", top: this.overlayYOffset, left: this.overlayXOffset, width:this.overlayWidth, height:this.overlayHeight}}
                />
                <canvas
                    ref={this.barcodeDisplayCanvasRef}
                    style={{ position: "absolute", top: this.overlayYOffset, left: this.overlayXOffset, width:this.overlayWidth, height:this.overlayHeight}}
                />

                <canvas
                    ref={this.controllerCanvasRef}
                    style={{ position: "absolute", top: this.overlayYOffset, left: this.overlayXOffset, width:this.overlayWidth, height:this.overlayHeight}}
                />

                <canvas
                    ref={this.statusCanvasRef}
                    style={{ position: "absolute", top: this.overlayYOffset, left: this.overlayXOffset, width:this.overlayWidth, height:this.overlayHeight}}
                />


                <div 
                    ref={this.controllerDivRef}
                    style={{ position: "absolute", top: this.overlayYOffset, left: this.overlayXOffset, width:this.overlayWidth, height:this.overlayHeight}}
                >
                    <Dropdown text='Resolution' options={constraintOptions } simple item onChange={(e, { value }) => {
                        this.changeCameraResolution(value as string)
                    }}/>
                    <Dropdown text='col' options={colnumOptions} simple item  onChange={(e, { value }) => {
                        this.setState({colnum:value as number})
                    }}/>
                    <Dropdown text='row' options={rownumOptions} simple item onChange={(e, { value }) => {
                        this.setState({rownum:value as number})
                    }}/>
                    <Label basic size="tiny" color={this.state.showSS?"red":"grey"} onClick={()=>{
                        this.setState({showSS:!this.state.showSS})
                    }}>ss</Label>
                    <Label basic size="tiny" color={this.state.showGrid?"red":"grey"} onClick={()=>{
                        this.setState({showGrid:!this.state.showGrid})
                    }}>grid</Label>

                </div>
            </div>

        )
    }

}



class BarcodeTFApp extends React.Component {
    render() {
        return(
            // <div style={{ width: "100%", height: "500px", position: "relative", top: 0, left: 0, }}>
            <div>
                <Label>
                    A
                </Label>
                <br />
                <Label>
                    b
                </Label>
                <BarcodeTFApp2 {...this.props} />
            </div>
        )
    }
}

export default BarcodeTFApp;