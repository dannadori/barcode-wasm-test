

export const AppStatus = {
    INITIALIZING: "initializing",
    INITIALIZED : "initialized",
    RUNNING     : "running",

}

export const AIConfig = {
    SPLIT_COLS: 2,
    SPLIT_ROWS: 6,
    // SPLIT_COLS: 2,
    // SPLIT_ROWS: 4,
    SPLIT_MERGIN: 0.2,
    SPLIT_WIDTH: 300,
    SPLIT_HEIGHT: 300,
    TRANSFORMED_WIDTH: 400,
    TRANSFORMED_HEIGHT: 400,
    CROP_MARGIN: 20,

    SS_MODEL_PATH: '/WEB_MODEL/icnet_0300x0300_0.10/model.json',

}


export const WorkerCommand = {
    SET_OVERLAY:  'set_overlay',
    SCAN_BARCODE: 'scan_barcode',
}

export const WorkerResponse = {
    NOT_PREPARED   : 'not_prepared',
    SCANED_BARCODE : 'scaned_barcode',
}

/////////////////////////////
////// ディスプレイ設定  ////
/////////////////////////////
export const qvgaConstraints = {
    video: {
        facingMode: "environment",
        width: { exact: 320 },
        height: { exact: 240 }
    }
};

export const vgaConstraints = {
    video: {
        facingMode: "environment",
        width: { exact: 640 },
        height: { exact: 480 }
    }
};

export const hdConstraints = {
    video: {
        facingMode: "environment",
        width: { exact: 1280 },
        height: { exact: 720 }
    }
};

export const fullHdConstraints = {
    video: {
        facingMode: "environment",
        width: { exact: 1920 },
        height: { exact: 1080 }
    }
};

export const fourKConstraints = {
    video: {
        facingMode: "environment",
        width: { ideal: 2500, max: 4096 },
        height: { ideal: 1600, max: 4096 }
    }
};

export const eightKConstraints = {
    video: {
        facingMode: "environment",
        width: { ideal: 7680 },
        height: { ideal: 4320 }
    }
};


export const DisplayConstraints = {
    QVGA:   qvgaConstraints,
    VGA:    vgaConstraints,
    HD:     hdConstraints,
    FULLHD: fullHdConstraints,
    FourK:  fourKConstraints,
    EightK: eightKConstraints,
} as const

export const DisplayConstraint = DisplayConstraints.HD
