import { AppStatus } from "../const"


export interface GlobalState {
    counter: number
    status: string
}

export const initialState = {
    counter: 0,
    status: AppStatus.INITIALIZED
}


const reducer = (state: GlobalState=initialState, action:any) => {
    var gs: GlobalState = Object.assign({},state)
    gs.counter++
    console.log(action)
    switch (action.type) {
        case 'START':
            console.log('start!!')
            gs.status = AppStatus.START
            break
    }
    return gs
}

export default reducer;
