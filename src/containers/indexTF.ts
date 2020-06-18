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
  }
}

const ConnectorTF = connect(
  mapStateToProps,
  mapDispatchToProps
)(BarcodeTFApp);

export default ConnectorTF;
