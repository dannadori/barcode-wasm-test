import React from 'react';
import ReactDOM from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';

import createSagaMiddleware from 'redux-saga';
import rootSaga from './saga';
import reducer from './reducers';
import Connector from './containers';
import ConnectorTF from './containers/indexTF'

import { AppMode, AppModes } from './const';

const sagaMiddleware = createSagaMiddleware();
const store = createStore(
  reducer,
  applyMiddleware(
    sagaMiddleware
  )
);
sagaMiddleware.run(rootSaga);


ReactDOM.render(
    <Provider store={store}>
      {(()=>{
        if(AppMode === AppModes.AUTO || AppMode === AppModes.CROP){
          return <Connector />
        }else if(AppMode === AppModes.AUTO_WITH_TF){
          return <ConnectorTF/>
        }
      })()}

    </Provider>
    ,document.getElementById('root'));

