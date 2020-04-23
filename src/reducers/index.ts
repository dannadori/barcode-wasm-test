import { AppStatus } from "../const"


export interface GlobalState {
    counter: number
    status: string
    barcode: string
    execScan: boolean

    select_start_x: number
    select_start_y: number
    select_end_x: number
    select_end_y: number
    inSelect : boolean
    finSelect:boolean
}

export const initialState = {
    counter: 0,
    status: AppStatus.INITIALIZING,
    barcode: "",    
    execScan: false,


    select_start_x: 0,
    select_start_y: 0,
    select_end_x: 0,
    select_end_y: 0,
    inSelect : false,
    finSelect: false,

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

        case 'START_SELECT':
            gs.select_start_x = action.payload[0]
            gs.select_start_y = action.payload[1]
            break

        case 'MOVE_SELECT':
            gs.select_end_x = action.payload[0]
            gs.select_end_y = action.payload[1]
            gs.inSelect = true
            break

        case 'END_SELECT':
            gs.select_end_x = action.payload[0]
            gs.select_end_y = action.payload[1]
            gs.inSelect     = false
            gs.finSelect    = true
            break
                            
    }
    return gs
}

export default reducer;
