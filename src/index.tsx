import React from 'react';
import ReactDOM from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';

import createSagaMiddleware from 'redux-saga';
import rootSaga from './saga';
import reducer from './reducers';
import Connector from './containers';
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
        console.log("RENDLER")
        if(AppMode == AppModes.AUTO || AppMode == AppModes.CROP){
          return <Connector />
        }else{

        }
      })()}

    </Provider>
    ,document.getElementById('root'));

