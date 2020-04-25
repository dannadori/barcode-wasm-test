import { Dispatch } from 'redux';
import { connect } from 'react-redux'

import { Actions } from '../actions'
import { GlobalState } from '../reducers';
import BarcodeTFApp from '../components/BarcodeTFApp';

export interface Props {
}

function mapStateToProps(state:GlobalState) {
  return state
}

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    initialized:      (args:string) => {dispatch(Actions.initialized(args))},
    scanned    :      (args:string) => {dispatch(Actions.scanned(args))},
    startSelect:      (x:number,y:number) =>{dispatch(Actions.startSelect(x, y))},
    moveSelect:        (x:number,y:number) =>{dispatch(Actions.moveSelect(x, y))},
    endSelect:         (x:number,y:number) =>{dispatch(Actions.endSelect(x, y))},
  }
}

const ConnectorTF = connect(
  mapStateToProps,
  mapDispatchToProps
)(BarcodeTFApp);

export default ConnectorTF;
