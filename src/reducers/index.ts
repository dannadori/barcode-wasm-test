import { AppStatus, MAX_COUNT, ONE_TURN_COUNT, Type } from "../const"


export interface GlobalState {
    counter: number
    status: string
    count:  number
    start2: any
    end: any
    img_src: string
    type: string
}

export const initialState = {
    counter: 0,
    status: AppStatus.INITIALIZED,
    count:0,
    start2: null,
    end:null,
    img_src: "imgs/barcode01.png",
    type: Type.WASM
}


const reducer = (state: GlobalState=initialState, action:any) => {
    var gs: GlobalState = Object.assign({},state)
    gs.counter++
    console.log(action)    
    switch (action.type) {
        case 'START':
            console.log(action)
            gs.start2  = performance.now();
            gs.status  = AppStatus.START
            gs.count   = 0
            gs.type    = action.payload
            break

        case 'NEXT':
            gs.status = AppStatus.NEXT
            gs.count += ONE_TURN_COUNT
            if(gs.count  >= MAX_COUNT){
                gs.status = AppStatus.FIN
                gs.end   = performance.now();
            }
            break
    }
    return gs
}

export default reducer;
