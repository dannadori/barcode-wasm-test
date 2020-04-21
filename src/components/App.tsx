import * as React from 'react';
import { GlobalState } from '../reducers';
import { AppStatus } from '../const';



class App extends React.Component {
    parentRef = React.createRef<HTMLDivElement>()
    imageRef = React.createRef<HTMLImageElement>()
    monitorRef = React.createRef<HTMLDivElement>()
    render() {
        const gs = this.props as GlobalState
        const props = this.props as any

        console.log(gs.counter)
        if(gs.status === AppStatus.START || gs.status === AppStatus.NEXT){

            const canvas = document.createElement('canvas');
            canvas.width  = 300
            canvas.height = 150
            const ctx = canvas.getContext("2d")!
            ctx.drawImage(this.imageRef.current!, 0, 0, canvas.width, canvas.height)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const idd = imageData.data;

        }

        return (
            <div style={{ width: "100%", height: "100%", position: "fixed", top: 0, left: 0, }} ref={this.parentRef}>
                <div ref={this.monitorRef}></div>
                <button onClick={()=>{props.start()}} > START! </button>
            </div>
        )
    }
}


export default App;