export function run(ocx) {
    const {
        video,
        canvas,
        angle,
        alpha0,
        alpha1,
        op,
    } = ocx.create_child_mapping({
        children: [{
            _key: 'video',
            tag:  'video',
        }, {
            _key: 'canvas',
            tag:  'canvas',
        }, {
            style: {
                display: 'grid',
                'grid-template-columns': 'auto auto',
                'justify-content': 'start',
                gap: '0.1em',
            },
            children: [{
                tag: 'label',
                children: [ 'angle' ],
                attrs: { for: 'angle' },
            }, {
                _key: 'angle',
                tag:  'input',
                attrs: {
                    id:    'angle',
                    type:  'number',
                    min:   0,
                    max:   2*Math.PI - 1e-14,
                    value: Math.PI/3,
                    step:  Math.PI/24,
                },
            }, {
                tag: 'label',
                children: [ 'scale' ],
                attrs: { for: 'scale' },
            }, {
                _key: 'scale',
                tag:  'input',
                attrs: {
                    id:    'scale',
                    type:  'number',
                    min:   0.5,
                    max:   2,
                    value: 1,
                    step:  0.1,
                },
            }, {
                tag: 'label',
                children: [ 'alpha0' ],
                attrs: { for: 'alpha0' },
            }, {
                _key: 'alpha0',
                tag:  'input',
                attrs: {
                    id:    'alpha0',
                    type:  'number',
                    min:   0,
                    max:   1,
                    value: 1,
                    step:  0.1,
                },
            }, {
                tag: 'label',
                children: [ 'alpha1' ],
                attrs: { for: 'alpha1' },
            }, {
                _key: 'alpha1',
                tag:  'input',
                attrs: {
                    id:    'alpha1',
                    type:  'number',
                    min:   0,
                    max:   1,
                    value: 1,
                    step:  0.1,
                },
            }, {
                tag: 'label',
                children: [ 'op' ],
                attrs: { for: 'op' },
            }, {
                _key: 'op',
                tag:  'select',
                attrs: {
                    id: 'op',
                },
                children: [  // put one element in an array to mark it as the default selected item
                    'source-over', 'source-in', 'source-out', 'source-atop',
                    'destination-over', 'destination-in', 'destination-out', 'destination-atop',
                    'lighter', 'copy', 'xor', 'multiply', 'screen', 'overlay',
                    'darken', 'lighten', 'color-dodge', 'color-burn', ['hard-light'], 'soft-light',
                    'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity',
                ].map(op => {
                    const selected = (typeof op !== 'string');
                    if (selected) {
                        op = op[0];
                    }
                    return {
                        tag: 'option',
                        attrs: {
                            value: op,
                            ...(selected ? { selected: '' } : {}),
                        },
                        children: [ op ],
                    };
                }),
            }],
        }],
    });

    let width, height;

    function render() {
        const context = canvas.getContext('2d');

        context.globalAlpha = +alpha0.value;
        context.globalCompositeOperation = op.value;
        context.resetTransform();
        context.drawImage(video, 0, 0, width, height);

        const buffer = new OffscreenCanvas(width, height);
        {
            const bc = buffer.getContext('2d');
            const image = context.getImageData(0, 0, width, height);
            bc.putImageData(image, 0, 0);
        }

        context.globalAlpha = +alpha1.value;
        context.globalCompositeOperation = 'source-over';
        context.resetTransform();
        context.translate(width/2, height/2);
        context.scale(+scale.value, +scale.value);
        context.rotate(+angle.value);
        context.translate(-width/2, -height/2);
        context.drawImage(buffer, 0, 0, width, height);
    }

    navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((stream) => {
            video.srcObject = stream;
            video.play();
        })
        .catch((error) => {
            console.error(`An error occurred: ${error}`);
        });

    video.addEventListener('canplay', (event) => {
        video.style.width  = `${video.videoWidth/4}px`;
        video.style.height = `${video.videoHeight/4}px`;
        canvas.style.width  = `${video.videoWidth}px`;
        canvas.style.height = `${video.videoHeight}px`;
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        width  = video.videoWidth;
        height = video.videoHeight;

        setInterval(render, 50);
    }, {
        once: true,
    });
}
