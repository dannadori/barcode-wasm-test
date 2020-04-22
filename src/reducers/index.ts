import { AppStatus } from "../const"


export interface GlobalState {
    counter: number
    status: string
    barcode: string
    execScan: boolean
}

export const initialState = {
    counter: 0,
    status: AppStatus.INITIALIZING,
    barcode: "",
    execScan: false,
}

const reducer = (state: GlobalState=initialState, action:any) => {
    var gs: GlobalState = Object.assign({},state)
    gs.counter++
    gs.execScan = false
    console.log(action)    
    switch (action.type) {
        case 'INITIALIZED':
            gs.status   = AppStatus.INITIALIZED
            gs.execScan =  true
            break

        case 'SCANNED':
            gs.status   = AppStatus.RUNNING
            gs.execScan = true
            gs.barcode  = action.payload
            break
    
    }
    return gs
}

export default reducer;
