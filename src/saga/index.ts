import { fork } from 'redux-saga/effects';

function* handleSomething() {
}

export default function* rootSaga() {
    yield fork(handleSomething)
    
}

