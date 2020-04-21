import { AppStatus } from "../const"


export interface GlobalState {
    counter: number
    status: string
}

export const initialState = {
    counter: 0,
    status: AppStatus.INITIALIZING,
}


const reducer = (state: GlobalState=initialState, action:any) => {
    var gs: GlobalState = Object.assign({},state)
    gs.counter++
    console.log(action)    
    switch (action.type) {
        case 'INITIALIZED':
            console.log(action)
            gs.status  = AppStatus.INITIALIZED
            break

    }
    return gs
}

export default reducer;
