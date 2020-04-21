

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


export const AppStatus = {
    INITIALIZING: "initializing",
    INITIALIZED : "initialized",

}


export const WorkerCommand = {
    SCAN_BARCODE: 'scan_barcode',
}

export const WorkerResponse = {
    SCANED_BARCODE: 'scaned_barcode',
}
