import { createActions } from 'redux-actions';

export const Actions = createActions(
    {
        'INITIALIZED' : (args) => (args),
        'SCANNED'     : (args) => (args),
        'START_SELECT'     : (...args) => (args),
        'MOVE_SELECT'      : (...args) => (args),
        'END_SELECT'       : (...args) => (args),
    },
)

