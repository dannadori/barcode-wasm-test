import * as React from 'react';
import { GlobalState } from '../reducers';
import { WorkerResponse, DisplayConstraint, AppStatus, WorkerCommand } from '../const';
import { captureVideoImageToCanvas } from '../AI/PreProcessing';
import { findOverlayLocation } from '../utils'


class App extends React.Component {
    ////////////////////
    // HTML Component //
    ////////////////////
    parentRef = React.createRef<HTMLDivElement>()
    videoRef = React.createRef<HTMLVideoElement>()
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
    worker     = new Worker('./worker/worker.ts', { type: 'module' })


    /**
     * ワーカーの初期化
     */
    async initWorker(){

        this.worker.onmessage = (event) => {
            if(event.data.message === WorkerResponse.SCANED_BARCODE){
                console.log(event)
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
        const video = this.videoRef.current!
        const canvas = captureVideoImageToCanvas(video, 1)
        const image = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)
        this.worker.postMessage({message:WorkerCommand.SCAN_BARCODE, image:image})
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