import * as React from 'react';
import { GlobalState } from '../reducers';
import { WorkerResponse, DisplayConstraint, AppStatus, WorkerCommand } from '../const';
import { captureVideoImageToCanvas } from '../AI/PreProcessing';
import { findOverlayLocation } from '../utils'


// const zxing_asm = require('../resources/zxing')
// zxing_asm.onRuntimeInitialized = function () {
//     console.log("initialized zxing_asm")
//     init_zxing = true
// }
// let init_zxing = false
// let decodePtr: any = null
// let decodeCallback: any = null
// let result: any = null
// let barcode: string | void | null = ""

// // WASM
// decodeCallback = function (ptr: any, len: any, resultIndex: any, resultCount: any) {
//     result = new Uint8Array(zxing_asm.HEAPU8.buffer, ptr, len);
//     barcode = String.fromCharCode.apply(null, Array.from(result));
// };
// decodePtr = zxing_asm.addFunction(decodeCallback, 'iiiiiffffffff');



class App extends React.Component {
    ////////////////////
    // HTML Component //
    ////////////////////
    parentRef = React.createRef<HTMLDivElement>()
    videoRef = React.createRef<HTMLVideoElement>()
    imageRef = React.createRef<HTMLImageElement>()
    controllerCanvasRef = React.createRef<HTMLCanvasElement>()


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
    worker     = new Worker('../workers/worker.ts', { type: 'module' })


    /**
     * ワーカーの初期化
     */
    async initWorker(){
        const props          = this.props as any
        this.worker.onmessage = (event) => {
            if(event.data.message === WorkerResponse.SCANED_BARCODE){
                console.log(event)
                props.initialized()
            }else{
                props.initialized()
            }
        }
        return
    }

    /**
     * HTMLコンポーネントに位置計算
     */
    private checkParentSizeChanged(video: HTMLVideoElement, props: any) {
        // サイズ算出
        this.videoHeight = video.videoHeight
        this.videoWidth = video.videoWidth
        const parentHeight = video.getBoundingClientRect().bottom - video.getBoundingClientRect().top
        const parentWidth = video.getBoundingClientRect().right - video.getBoundingClientRect().left
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
        const props          = this.props as any

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


    requestScanBarcode = ()=> {
        const img_elem = this.imageRef.current!
        const t_canvas = document.createElement('canvas');
        t_canvas.width = img_elem.width
        t_canvas.height = img_elem.height
        const t_ctx = t_canvas.getContext("2d")!
        t_ctx.drawImage(img_elem, 0, 0, t_canvas.width, t_canvas.height)
        const imageData = t_ctx.getImageData(0, 0, t_canvas.width, t_canvas.height);
        const idd = imageData.data;
        // const t_image = zxing_asm._resize(t_canvas.width, t_canvas.height);
        // for (let i = 0, j = 0; i < idd.length; i += 4, j++) {
        //     zxing_asm.HEAPU8[t_image + j] = idd[i];
        // }
        // const err = zxing_asm._decode_multi(decodePtr);
        // console.log("SCANNRESULT!: ",barcode)



        // const video = this.videoRef.current!
        // const controller = this.controllerCanvasRef.current!
        // const canvas = captureVideoImageToCanvas(video, 1)
        // const image = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)
        // console.log("IMAGE SIZE2:",canvas.width,canvas.height)
        // const ctx = controller.getContext("2d")!
        // ctx.putImageData(image,100,100)
        this.worker.postMessage({message:WorkerCommand.SCAN_BARCODE, image:imageData})
    }

    
    render() {
        const gs = this.props as GlobalState
        const props = this.props as any
        const video = this.videoRef.current!

        if(gs.status === AppStatus.INITIALIZED){
            console.log('initialized')
            this.checkParentSizeChanged(video, props)
            this.requestScanBarcode()
        }

        return (
            <div style={{ width: "100%", height: "100%", position: "fixed", top: 0, left: 0, }} ref={this.parentRef} >
                <img src="imgs/barcode01.png" alt="barcode" ref={this.imageRef} />
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

            </div>
        )
    }

}


export default App;