import React from 'react';
import ReactDOM from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';

import createSagaMiddleware from 'redux-saga';
import rootSaga from './saga';
import reducer from './reducers';
import ConnectorTF from './containers/indexTF'


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
        return <ConnectorTF/>
      })()}

    </Provider>
    ,document.getElementById('root'));

