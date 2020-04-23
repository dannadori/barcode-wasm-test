import * as React from 'react';
import { GlobalState } from '../reducers';
import { WorkerResponse, DisplayConstraint, WorkerCommand, AIConfig, AppStatus } from '../const';
import { captureVideoImageToCanvas, splitCanvasToBoxes,  getBoxImageBitmap, drawBoxGrid, getBoxImages } from '../AI/PreProcessing';
import { findOverlayLocation, } from '../utils'
import { ToastProvider, useToasts } from 'react-toast-notifications'



const FormWithToasts = ({ ...props }) => {
    const { addToast } = useToasts()
    const barcode = props.barcode
    console.log("toast!!!! ", props, barcode)
    const toast = () => {
        console.log("!!!!!!!!!!!!!!!!!!!! TOAST")
        addToast('Saved Successfully', { appearance: 'success' })
    }
    if (barcode === "") {
        return <div >...</div>

    } else {
        addToast("AAAAABBB", { appearance: 'success' })
        return <div onLoad={() => toast()}   >!!!!</div>
    }
}


class App extends React.Component {
    ////////////////////
    // HTML Component //
    ////////////////////
    parentRef = React.createRef<HTMLDivElement>()
    imageRef1 = React.createRef<HTMLImageElement>()
    imageRef2 = React.createRef<HTMLImageElement>()
    videoRef  = React.createRef<HTMLVideoElement>()
    controllerCanvasRef = React.createRef<HTMLCanvasElement>()
    workerMonitorCanvasRef = React.createRef<HTMLCanvasElement>()
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
    workers:Worker[] = []
//    worker = new Worker('../workers/worker.ts', { type: 'module' })


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
        for(let i=0; i<this.worker_num;i++){
//            for(let i=0; i<AIConfig.SPLIT_COLS*AIConfig.SPLIT_ROWS;i++){
                const worker = new Worker('../workers/worker.ts', { type: 'module' })
            worker.onmessage = (event) => {
                const props = this.props as any
                if (event.data.message === WorkerResponse.SCANED_BARCODE) {
                    console.log(event)
                    const barcodes:string[] = event.data.barcodes
                    barcodes.map((x) =>{
                        if(x !== ""){
                            console.log(`BARCODE[worker${i}]: `, x)
                        }
                    } )
                    if(i === 0){
                        //window.requestAnimationFrame(this.execMainLoop);
                        props.initialized()
                    }
                }else if (event.data.message === WorkerResponse.NOT_PREPARED){
                    if(i === 0){
                        props.initialized()
                        //window.requestAnimationFrame(this.execMainLoop);
                    }
                }
            }
            const overlay = this.workerMonitorCanvasRef.current!
            const overlay_offscreen= overlay.transferControlToOffscreen()
            worker.postMessage({message:WorkerCommand.SET_OVERLAY, overlay:overlay_offscreen},[overlay_offscreen])
            this.workers.push(worker)
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
                    //this.execMainLoop()
                    props.initialized()
                })
                .catch(error => {
                    console.error(error);
                });
        }
    }

    execMainLoop = async () => {
        console.log('execMainLoop')

        const video = this.videoRef.current!
        const controller = this.controllerCanvasRef.current!

        this.gameLoop() 
        this.checkParentSizeChanged(video)
        this.requestScanBarcode()
    }

    drawBoxSampleImage(canvas:HTMLCanvasElement, image:ImageData){
        const ctx = canvas.getContext('2d')!
        ctx.putImageData(image, 0, 0)
    }

    requestScanBarcode = async () => {
        const props = this.props as any
        const gs = this.props as GlobalState
        console.log('requestScanBarcode')
        const video = this.videoRef.current!
        const controller = this.controllerCanvasRef.current!
        controller.width = this.overlayWidth
        controller.height = this.overlayHeight

        const img_elem1 = this.imageRef1.current!
        const img_elem2 = this.imageRef2.current!


        

        if(video.width === 0 || video.height === 0){ // Videoが準備されていない場合スキップ
            window.requestAnimationFrame(this.execMainLoop);
        }
        if(this.overlayWidth === 0 || this.overlayHeight === 0){ // Videoが準備されていない場合スキップ
            window.requestAnimationFrame(this.execMainLoop);
        }

        // if(this.load === false || gs.counter <20){
        //     window.requestAnimationFrame(this.execMainLoop);

        // }
        // drawGrid(controller, 100)

        console.log(video.width, video.height, this.overlayWidth ,this.overlayHeight)
        const captureCanvas = captureVideoImageToCanvas(video)
        const boxMetadata = splitCanvasToBoxes(captureCanvas)
        drawBoxGrid(controller, boxMetadata)

        //const images = getBoxImages(captureCanvas, boxMetadata)
        //this.drawBoxSampleImage(controller, images[5])


        //const images = getBoxImageBitmap(captureCanvas, boxMetadata)
        

        // for(let i = 0; i < AIConfig.SPLIT_COLS*AIConfig.SPLIT_ROWS; i++){
        //     this.workers[i].postMessage({ message: WorkerCommand.SCAN_BARCODE, image: images[i] })
        // }
        // this.workers[0].postMessage({ message: WorkerCommand.SCAN_BARCODE, images: images })
        //    this.workers[0].postMessage({ message: WorkerCommand.SCAN_BARCODE, images: images, angles:[0, 90, 5, 85] }, images)
        //this.workers[0].postMessage({ message: WorkerCommand.SCAN_BARCODE, images: images, angles:[0] })


        // const canvas = new OffscreenCanvas(img_elem.width, img_elem.height);
        // const ctx = canvas.getContext('2d')!
        // ctx.drawImage(img_elem, 0, 0, canvas.width, canvas.height)
        // const image = canvas.transferToImageBitmap()
        // console.log("[Image]", image)

//        const image = ctx.getImageData(0,0,canvas.width, canvas.height)
        
        // this.workers[0].postMessage({ message: WorkerCommand.SCAN_BARCODE, images: [image], angles:[0] }, [image])
//        this.workers[0].postMessage({ message: WorkerCommand.SCAN_BARCODE, images: [image], angles:[0] })


        // this.controllerCanvasRef.current!.width = this.overlayWidth
        // this.controllerCanvasRef.current!.height = this.overlayHeight
        // const ctx = this.controllerCanvasRef.current!.getContext('2d')!
        // ctx.putImageData(image, 0, 0, 0, 0, image.width, image.height)
        // ctx.fillText("AAAAAAAAAAAAAAAAAAAAAAAAAAa",100,100)
        // console.log(">>>>>", this.controllerCanvasRef.current!.width, this.controllerCanvasRef.current!.height, image.width, image.height)


        const t_canvas1 = new OffscreenCanvas(img_elem1.width, img_elem1.height)
        const t_ctx1 = t_canvas1.getContext("2d")!
        t_ctx1.drawImage(img_elem1, 0, 0, img_elem1.width, img_elem1.height)
        const image1 = t_canvas1.transferToImageBitmap()

        const t_canvas2 = new OffscreenCanvas(img_elem2.width, img_elem2.height)
        const t_ctx2 = t_canvas2.getContext("2d")!
        t_ctx2.drawImage(img_elem2, 0, 0, img_elem2.width, img_elem2.height)
        const image2 = t_canvas2.transferToImageBitmap()
        
        this.workers[0].postMessage({ message: WorkerCommand.SCAN_BARCODE, images: [image1,image2], angles:[0] }, [image1, image2])

        captureCanvas.remove()

    }

    load = false
    loaded = ()=>{
        this.load = true
        console.log("image loaded")
    }
    render() {
        const gs = this.props as GlobalState
        const props = this.props as any
        const video = this.videoRef.current!


        if(gs.status === AppStatus.INITIALIZED){
            console.log('initialized')
            this.checkParentSizeChanged(video)
            this.requestScanBarcode()
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
                    ref={this.controllerCanvasRef}
                    style={{ position: "fixed", top: this.overlayYOffset, left: this.overlayXOffset, }}
                    width={this.overlayWidth}
                    height={this.overlayHeight}
                />
                <canvas
                    ref={this.workerMonitorCanvasRef}
                    style={{ position: "fixed", top: this.overlayYOffset, left: this.overlayXOffset, }}
                    width={this.overlayWidth}
                    height={this.overlayHeight}
                />

                <ToastProvider>
                    <FormWithToasts {...props} />
                </ToastProvider>
            </div>
        )
    }

}


export default App;