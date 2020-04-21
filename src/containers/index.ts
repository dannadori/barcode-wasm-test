import { Dispatch } from 'redux';
import { connect } from 'react-redux'

import { Actions } from '../actions'
import App from '../components/App'
import { GlobalState } from '../reducers';

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

const Connector = connect(
  mapStateToProps,
  mapDispatchToProps
)(App);

export default Connector;
