import * as React from 'react';
import { GlobalState } from '../reducers';
import { AppStatus, DisplayConstraintOptions, AIConfig } from '../const';
import { findOverlayLocation, } from '../utils'
import { Dropdown, Label } from 'semantic-ui-react'
import { MultiBarcodeReader } from '../MultiBarcodeReader';

interface BarcodeTFAppState{
    count: number,
    videoResolution:string,
    colnum:number,
    rownum:number,
    showRect:boolean,
    showSS:boolean,
    showGrid:boolean,
}

const captureVideoImageToCanvas = (video:HTMLVideoElement):HTMLCanvasElement => {
    const videoCaptureCanvas    = document.createElement("canvas");
    videoCaptureCanvas.width = video.videoWidth
    videoCaptureCanvas.height = video.videoHeight

    const tmpCtx                = videoCaptureCanvas.getContext('2d')!
    tmpCtx.drawImage(video, 0, 0, videoCaptureCanvas.width, videoCaptureCanvas.height);
    return videoCaptureCanvas
}

class BarcodeTFApp2 extends React.Component {
    state: BarcodeTFAppState = {
        count: 0,
        videoResolution: "VGA",
        colnum: 1,
        rownum: 1,
        showRect: true,
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



    multiBarcodReader = new MultiBarcodeReader()


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

    /**
     * ワーカーの初期化
     */
    async initWorker() {
        this.multiBarcodReader.addInitializedListener(()=>{
            const props = this.props as any
            props.initialized()
            this.requestScanBarcode()
        })
        this.multiBarcodReader.addWaitNextFrameListeners(()=>{this.requestScanBarcode()})
        this.multiBarcodReader.addScanedBarcordListeners(()=>{
            console.log("SCANNED!!!")
        })
//        this.multiBarcodReader.barcodePreviewCanvas = this.workerAreaCVCanvasRef.current!
        this.multiBarcodReader.init()
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

        
        // if(parentHeight === 0){
            parentHeight = (parentWidth/this.videoWidth) * this.videoHeight
        // }

        this.parentHeight = parentHeight
        this.parentWidth = parentWidth
        // const { overlayWidth, overlayHeight, overlayXOffset, overlayYOffset } = findOverlayLocation(this.parentRef.current!, this.videoWidth, this.videoHeight)
        const { overlayWidth, overlayHeight, overlayXOffset, overlayYOffset } = findOverlayLocation(this.parentWidth, this.parentHeight, this.videoWidth, this.videoHeight)
        this.overlayWidth = overlayWidth
        this.overlayHeight = overlayHeight
        this.overlayXOffset = overlayXOffset
        this.overlayYOffset = overlayYOffset


        this.workerAreaCVCanvasRef.current!.width  = this.overlayWidth
        this.workerAreaCVCanvasRef.current!.height = this.overlayHeight
        this.workerSSMaskMonitorCanvasRef.current!.width  = this.overlayWidth
        this.workerSSMaskMonitorCanvasRef.current!.height = this.overlayHeight
        this.controllerCanvasRef.current!.width  = this.overlayWidth
        this.controllerCanvasRef.current!.height = this.overlayHeight


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
                    this.setState({videoResolution:resolution})
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

        const captureCanvas = captureVideoImageToCanvas(video)
        if(captureCanvas.width === 0){
            captureCanvas.remove()
            window.requestAnimationFrame(this.requestScanBarcode);
            return
        }

        this.multiBarcodReader.requestScanBarcode(captureCanvas, this.state.colnum, this.state.rownum, AIConfig.SPLIT_MARGIN)
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
            <div style={{ width: "100%", height: this.parentHeight, position: "relative", top: 0, left: 0, }} ref={this.parentRef} >
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
                    style={{ position: "absolute", top: this.overlayYOffset, left: this.overlayXOffset, width:this.parentWidth, height:this.parentHeight}}
                />
                <canvas
                    ref = {this.workerAreaCVCanvasRef}
                    style={{ position: "absolute", top: this.overlayYOffset, left: this.overlayXOffset, width:this.parentWidth, height:this.parentHeight}}
                />
                <canvas
                    ref={this.barcodeDisplayCanvasRef}
                    style={{ position: "absolute", top: this.overlayYOffset, left: this.overlayXOffset, width:this.parentWidth, height:this.parentHeight}}
                />

                <canvas
                    ref={this.controllerCanvasRef}
                    style={{ position: "absolute", top: this.overlayYOffset, left: this.overlayXOffset, width:this.parentWidth, height:this.parentHeight}}
                />

                <canvas
                    ref={this.statusCanvasRef}
                    style={{ position: "absolute", top: this.overlayYOffset, left: this.overlayXOffset, width:this.parentWidth, height:this.parentHeight}}
                />


                <div 
                    ref={this.controllerDivRef}
                    style={{ position: "absolute", top: this.overlayYOffset, left: this.overlayXOffset, width:this.parentWidth, height:this.parentHeight}}
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
                    <Label basic size="tiny" color={this.state.showRect?"red":"grey"} onClick={()=>{
                        const newValue = !this.state.showRect
                        // this.workerAreaCVCanvasRef.current!.width  = this.overlayWidth
                        // this.workerAreaCVCanvasRef.current!.height = this.overlayHeight
                        this.multiBarcodReader.barcodePreviewCanvas = newValue ? this.workerAreaCVCanvasRef.current! : null
                        this.setState({showRect:newValue})
                    }}>rect</Label>
                    <Label basic size="tiny" color={this.state.showSS?"red":"grey"} onClick={()=>{
                        const newValue = !this.state.showSS
                        // this.workerSSMaskMonitorCanvasRef.current!.width  = this.overlayWidth
                        // this.workerSSMaskMonitorCanvasRef.current!.height = this.overlayHeight
                        this.multiBarcodReader.previewCanvas = newValue ? this.workerSSMaskMonitorCanvasRef.current! : null
                        this.setState({showSS:newValue})
                    }}>ss</Label>
                    <Label basic size="tiny" color={this.state.showGrid?"red":"grey"} onClick={()=>{
                        const newValue = !this.state.showGrid
                        // this.controllerCanvasRef.current!.width  = this.overlayWidth
                        // this.controllerCanvasRef.current!.height = this.overlayHeight
                        this.multiBarcodReader.girdDrawCanvas = newValue ? this.controllerCanvasRef.current! : null
                        this.setState({showGrid:!this.state.showGrid})
                    }}>grid</Label>

                </div>
            </div>

        )
    }

}



class BarcodeTFApp extends React.Component {
    render() {
        const props = this.props as any
        return(
            <div>
                {/* <Label>
                    A
                </Label>
                <br />
                <Label>
                    b
                </Label> */}
                <BarcodeTFApp2 {...props}/>
            </div>
        )
    }
}

export default BarcodeTFApp;