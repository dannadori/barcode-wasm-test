import * as React from 'react';
import { GlobalState } from '../reducers';
import { WorkerResponse, DisplayConstraint, WorkerCommand, AIConfig, AppStatus, AppMode, AppModes } from '../const';
import { captureVideoImageToCanvas, splitCanvasToBoxes,  getBoxImageBitmap, drawBoxGrid, getBoxImages, SplitCanvasMetaData } from '../AI/PreProcessing';
import { findOverlayLocation, } from '../utils'
import { ToastProvider, useToasts } from 'react-toast-notifications'



const FormWithToasts = ({ ...props }) => {
    const { addToast } = useToasts()
    const barcode = props.barcode
    // console.log("toast!!!! ", props, barcode)
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
    barcodeDisplayCanvasRef = React.createRef<HTMLCanvasElement>()
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
        //for(let i=0; i<AIConfig.SPLIT_COLS*AIConfig.SPLIT_ROWS;i++){
            console.log("Worker initializing... ",i)
            const worker = new Worker('../workers/worker.ts', { type: 'module' })
            worker.onmessage = (event) => {

                const barcodeDisplay = this.barcodeDisplayCanvasRef.current!

                const ctx = barcodeDisplay.getContext("2d")!

                ctx.strokeStyle  = "#DD3333FF";
                ctx.lineWidth    = 1;
                const font       = "16px sans-serif";
                ctx.font         = font;
                ctx.textBaseline = "top";
                ctx.fillStyle = "#DD3333FF";
                ctx.clearRect(0,0,barcodeDisplay.width,barcodeDisplay.height)


                if (event.data.message === WorkerResponse.SCANED_BARCODE) {
                    console.log("RECEIVED:",event)
                    const boxMetadata:SplitCanvasMetaData[] = event.data.boxMetadata
                    const barcodes:string[] = event.data.barcodes
                    const point_xs:number[] = event.data.point_xs
                    const point_ys:number[] = event.data.point_ys
                    
                    const box_num = boxMetadata.length
                    for(let j=0; j<box_num; j++){
                        const barcode = barcodes[j]
                        if(barcode !== ""){
                            const metadata = boxMetadata[j]
                            const box_offset_x = barcodeDisplay.width * metadata.minX
                            const box_offset_y = barcodeDisplay.height * metadata.minY
                            const point_offset_x = AIConfig.TRANSFORMED_MAX * point_xs[j]
                            const point_offset_y = AIConfig.TRANSFORMED_MAX * point_ys[j]
                            ctx.fillRect(box_offset_x+point_offset_x, box_offset_y+point_offset_y, 10, 10)
                            ctx.fillText(barcode, box_offset_x+point_offset_x+15, box_offset_y+point_offset_y,)
                        }
                    }

                    if(i === 0){
                        if(AppMode == AppModes.AUTO){
                            window.requestAnimationFrame(this.execMainLoop);
                        }
                    }
                }else if (event.data.message === WorkerResponse.NOT_PREPARED){
                    if(i === 0){
                        if(AppMode == AppModes.AUTO){
                            window.requestAnimationFrame(this.execMainLoop);
                        }
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
                    window.requestAnimationFrame(this.execMainLoop);
                    //this.execMainLoop()
                    props.initialized()
                })
                .catch(error => {
                    console.error(error);
                });
        }


        if(AppMode == AppModes.CROP){
            this.controllerCanvasRef.current!.addEventListener("touchstart", (e)=>{
                e.preventDefault(); 
                props.startSelect(e.changedTouches[0].pageX, e.changedTouches[0].pageY)
            }, { passive: false })
            this.controllerCanvasRef.current!.addEventListener("touchmove", (e)=>{
                e.preventDefault(); 
                props.moveSelect(e.changedTouches[0].pageX, e.changedTouches[0].pageY)
            }, { passive: false })
            this.controllerCanvasRef.current!.addEventListener("touchend", (e)=>{
                e.preventDefault(); 
                props.endSelect(e.changedTouches[0].pageX, e.changedTouches[0].pageY)
            }, { passive: false })
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


        // if(video.width === 0 || video.height === 0){ // Videoが準備されていない場合スキップ
        //     window.requestAnimationFrame(this.execMainLoop);
        // }
        // if(this.overlayWidth === 0 || this.overlayHeight === 0){ // Videoが準備されていない場合スキップ
        //     window.requestAnimationFrame(this.execMainLoop);
        // }

        // // drawGrid(controller, 100)

        const captureCanvas = captureVideoImageToCanvas(video)
        const boxMetadata = splitCanvasToBoxes(captureCanvas)
        drawBoxGrid(controller, boxMetadata)

        //const images = getBoxImages(captureCanvas, boxMetadata)
        //this.drawBoxSampleImage(controller, images[5])


        const images = getBoxImageBitmap(captureCanvas, boxMetadata)
        
        // for(let i = 0; i < AIConfig.SPLIT_COLS*AIConfig.SPLIT_ROWS; i++){
        //     this.workers[i].postMessage({ message: WorkerCommand.SCAN_BARCODE, images: [images[i]], angles:[0, 90, 5, 85] }, [images[i]])
        // }
        this.workers[0].postMessage({ message: WorkerCommand.SCAN_BARCODE, boxMetadata: boxMetadata, images: images, angles:[0, 90, 45] }, images)


        // ///////////////////////////////
        // ///// for scaning test  ///////
        // ///////////////////////////////
        // const img_elem1 = this.imageRef1.current!
        // const img_elem2 = this.imageRef2.current!
        // const t_canvas1 = new OffscreenCanvas(img_elem1.width, img_elem1.height)
        // const t_ctx1 = t_canvas1.getContext("2d")!
        // t_ctx1.drawImage(img_elem1, 0, 0, img_elem1.width, img_elem1.height)
        // const image1 = t_canvas1.transferToImageBitmap()

        // const t_canvas2 = new OffscreenCanvas(img_elem2.width, img_elem2.height)
        // const t_ctx2 = t_canvas2.getContext("2d")!
        // t_ctx2.drawImage(img_elem2, 0, 0, img_elem2.width, img_elem2.height)
        // const image2 = t_canvas2.transferToImageBitmap()
        // this.workers[0].postMessage({ message: WorkerCommand.SCAN_BARCODE, images: [image1,image2], angles:[0] }, [image1, image2])

        captureCanvas.remove()

    }

    cropRectAndScan = (start_x:number, start_y:number, end_x:number, end_y:number) => {
        const video = this.videoRef.current!
        const controller = this.controllerCanvasRef.current!

        const start_xr = (start_x / controller.width)  * video.width
        const end_xr   = (end_x / controller.width)    * video.width
        const start_yr = (start_y / controller.height) * video.height
        const end_yr   = (end_y / controller.height)   * video.height

        if((end_xr - start_xr < 1) ||  (end_yr - start_yr < 1)){ // 選択範囲が小さい場合。瞬間的なタップなど。
            return 
        }

        const captureCanvas = captureVideoImageToCanvas(video)
        const ctx = captureCanvas.getContext("2d")!
        const image = ctx.getImageData(start_xr, start_yr, end_xr - start_xr, end_yr - start_yr)

        // const ctx2 = controller.getContext("2d")!
        // ctx2.putImageData(image,0,0)


        const offscreen = new OffscreenCanvas(image.width, image.height)
        const ctx3 = offscreen.getContext("2d")!
        ctx3.putImageData(image,0,0)
        const input = offscreen.transferToImageBitmap()


        let box: SplitCanvasMetaData = {
            minY: (start_y / controller.height),
            minX: (start_x / controller.width), // 割合
            maxY: (end_y   / controller.height), // 割合
            maxX: (end_x   / controller.width), // 割合
        }


        this.workers[0].postMessage({ message: WorkerCommand.SCAN_BARCODE, boxMetadata: [box], images: [input], angles:[0, 90, 45] }, [input])
        
    }


    render() {
        const gs = this.props as GlobalState
        const props = this.props as any
        const video = this.videoRef.current!
        const controller = this.controllerCanvasRef.current!



        if(gs.status === AppStatus.INITIALIZED){
            console.log('initialized')
            this.checkParentSizeChanged(video)
            if(AppMode == AppModes.AUTO){
                this.requestScanBarcode()
            }
        }


        if(AppMode == AppModes.CROP){
            if(gs.inSelect===true){
                const ctx = controller.getContext("2d")!
                ctx.strokeStyle  = "#DD3333FF";
                ctx.lineWidth    = 2;
                
                ctx.clearRect(0, 0, controller.width, controller.height)
                ctx.strokeRect(gs.select_start_x, gs.select_start_y, gs.select_end_x-gs.select_start_x, gs.select_end_y-gs.select_start_y)
            }else if(gs.finSelect===true){
                const ctx = controller.getContext("2d")!
                ctx.strokeStyle  = "#DD3333FF";
                ctx.lineWidth    = 2;
                ctx.clearRect(0, 0, controller.width, controller.height)
                console.log("rect selected", gs.select_start_x, gs.select_start_y, gs.select_end_x, gs.select_end_y)
                this.cropRectAndScan(gs.select_start_x, gs.select_start_y, gs.select_end_x, gs.select_end_y)
            }
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
                    ref = {this.workerMonitorCanvasRef}
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

                <ToastProvider>
                    <FormWithToasts {...props} />
                </ToastProvider>
            </div>
        )
    }

}


export default App;