"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeoutError = void 0;
const ansi_regex_1 = require("ansi-regex");
class TimeoutError extends Error {
    constructor(reason) {
        super(reason || 'Confirmation prompt timed out');
    }
}
exports.TimeoutError = TimeoutError;
Object.defineProperty(TimeoutError.prototype, 'name', {
    value: TimeoutError.name,
    enumerable: false,
    writable: true,
    configurable: true,
});
/**
 * Make sure we can detect things like /dev/null input streams.
 * Reading 0 bytes triggers the flipping of the
 * [Readable#readable](https://nodejs.org/docs/latest-v18.x/api/stream.html#readablereadable) flag,
 * but leaves whatever is in the buffer
 * for the rest of the program to consume.
 */
function onReadableInit() {
    process.stdin.read(0);
    // Remove the listener, if this isn't done,
    // we will block any flow of data from stdin.
    process.stdin.off('readable', onReadableInit);
}
process.stdin.on('readable', onReadableInit);
/**
 *
 * @param {string} prompt
 * @param {boolean | null | undefined} defaultResponse
 * @param {number | null | undefined} timeout
 * @param {number | null | undefined} currentTimer
 * @returns
 */
function makePrompt(prompt, defaultResponse, timeout, currentTimer) {
    let timeoutString = null;
    if (timeout != null) {
        if (timeout <= 0)
            timeoutString = '';
        else {
            // eslint-disable-next-line no-param-reassign
            currentTimer = currentTimer ?? timeout;
            const maxTimerLength = timeout.toFixed(0).length;
            timeoutString = currentTimer.toFixed(0).padStart(maxTimerLength, ' ');
        }
    }
    return `${timeoutString != null
        ? (timeoutString && `[Automatic abort in ${timeoutString} seconds]\n`) ||
            '\n'
        : ''}${prompt} [${defaultResponse === true ? 'Y' : 'y'}/${defaultResponse === false ? 'N' : 'n'}] `.split('\n');
}
function printPrompt(lines, outputStream, isUpdate = false) {
    if (outputStream.isTTY && isUpdate) {
        return;
    }
    if (outputStream.isTTY) {
        outputStream.cork();
        if (isUpdate) {
            outputStream.write('\x1b[s');
            outputStream.cursorTo(0);
            for (let i = 0; i < lines.length - 1; i++) {
                outputStream.moveCursor(0, -1);
                outputStream.clearLine(0);
            }
        }
    }
    else {
        outputStream.write;
    }
    outputStream.write(lines.join('\n'));
    if (outputStream.isTTY) {
        if (isUpdate) {
            outputStream.write('\x1b[u');
        }
        outputStream.uncork();
    }
}
const ignored = [
    0x08, // backspace
];
const codeMap = {
    0x00: '^@',
    0x01: '^A',
    0x02: '^B',
    0x03: '^C',
    0x04: '^D',
    0x05: '^E',
    0x06: '^F',
    0x07: '^G',
    0x08: null,
    0x09: null,
    0x0a: null,
    0x0b: null,
    0x0c: null,
    0x0d: null,
    0x0e: '^N',
    0x0f: '^O',
    0x10: '^P',
    0x11: '^Q',
    0x12: '^R',
    0x13: '^S',
    0x14: '^T',
    0x15: '^U',
    0x16: '^V',
    0x17: '^W',
    0x18: '^X',
    0x19: '^Y',
    0x1a: '^Z',
    0x1b: '^[',
    0x1c: '^\\',
    0x1d: '^]',
    0x1e: '^^',
    0x1f: '^_',
    0x7f: '^?',
};
function getChunk(data, encoding) {
    if (data instanceof Buffer)
        return data;
    if (typeof data === 'string') {
        return Buffer.from(data, encoding ?? 'binary');
    }
    if (data instanceof Uint8Array || Array.isArray(data)) {
        Buffer.from(data);
    }
    if (data instanceof ArrayBuffer || data instanceof SharedArrayBuffer) {
        Buffer.from(data);
    }
    throw new TypeError('Unexpected data type');
}
function omitEscapeSequence(inputStream) {
    return new Promise((resolve, reject) => {
        let isListening = false;
        function onEnd() {
            reject(new Error('Unexpected end of input stream'));
        }
        function onReadable() {
            const read = inputStream.read();
            if (read == null && !isListening) {
                isListening = true;
                inputStream.on('readable', onReadable);
                return;
            }
            const chunk = getChunk(read, inputStream.readableEncoding);
            inputStream.off('readable', onReadable);
            inputStream.off('end', onEnd);
            const string = `\x1b${chunk.toString('binary')}`;
            const match = string.match((0, ansi_regex_1.default)({ onlyFirst: true }));
            let offset = 0;
            let ret = false;
            if (match && match.index === 0) {
                offset = match[0].length;
                ret = true;
            }
            if (offset < string.length) {
                const substr = string.substring(offset);
                inputStream.unshift(Buffer.from(substr, 'binary'));
            }
            resolve(ret);
        }
        inputStream.on('end', onEnd);
        onReadable();
    });
}
function isCodemappedNumber(byte) {
    return Object.prototype.hasOwnProperty.call(codeMap, byte);
}
function writeByte(byte, outputStream) {
    if (ignored.includes(byte))
        return false;
    if (isCodemappedNumber(byte)) {
        const toPrint = codeMap[byte];
        if (toPrint == null)
            return false;
        outputStream.write(toPrint, 'ascii');
    }
    else if (byte >= 0x20 && byte < 0x7f) {
        outputStream.write(String.fromCharCode(byte), 'ascii');
    }
    else if (outputStream.isTTY) {
        outputStream.write(`\\x${byte.toString(16).padStart(2, '0')}`, 'ascii');
    }
    return true;
}
function Confirm(prompt, defaultResponse = null, timeout = null, outputStream = process.stderr, inputStream = process.stdin) {
    const originalRawMode = inputStream.isRaw;
    if (inputStream.isTTY && !originalRawMode) {
        inputStream.setRawMode(true);
    }
    return new Promise((resolve, reject) => {
        let fullPrompt = makePrompt(prompt, defaultResponse, timeout, timeout);
        printPrompt(fullPrompt, outputStream);
        const isPaused = inputStream.isPaused();
        inputStream.pause();
        const orgEncoding = inputStream.readableEncoding;
        inputStream.setEncoding('hex');
        let fulfilled = false;
        let timerInterval = null;
        if (timeout != null) {
            let currentTimer = timeout - 1;
            timerInterval = setInterval(() => {
                fullPrompt = makePrompt(prompt, defaultResponse, timeout, currentTimer);
                currentTimer -= 1;
                printPrompt(fullPrompt, outputStream, true);
                if (currentTimer < 0) {
                    outputStream.write('TIME OUT\n');
                    // eslint-disable-next-line @typescript-eslint/no-use-before-define
                    fulfill(new TimeoutError());
                }
            }, 1000);
        }
        function onResume() {
            if (inputStream.isTTY) {
                inputStream.setRawMode(false);
                inputStream.setRawMode(true);
            }
        }
        function fulfill(err, value) {
            if (fulfilled)
                return;
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            fulfilled = true;
            if (err)
                reject(err);
            else if (value == null)
                reject(new Error('Unexpected null value'));
            else
                resolve(value);
            process.off('SIGCONT', onResume);
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            inputStream.off('end', onEnd);
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            inputStream.off('readable', onReadable);
            inputStream.setEncoding(orgEncoding ?? 'binary');
            if (isPaused)
                inputStream.pause();
            else
                inputStream.resume();
        }
        function onEnd() {
            outputStream.write('INPUT STREAM GONE\n');
            fulfill(new TimeoutError('Input stream has ended, no further input will be provided.'));
        }
        process.on('SIGCONT', onResume);
        inputStream.on('end', onEnd);
        /**
         * @param {boolean} retryingEscapeSequence
         */
        function onReadable(retryingEscapeSequence = false) {
            // There is some data to read now.
            const chunk = inputStream.read(2);
            if (chunk === null) {
                return;
            }
            if (chunk.length !== 2) {
                throw new Error('Unexpected chunk length');
            }
            const asciiCode = Number.parseInt(chunk, 16);
            if (ignored.includes(asciiCode)) {
                onReadable();
                return;
            }
            if (asciiCode === 0x1b && !retryingEscapeSequence) {
                // Escape sequence
                inputStream.off('readable', onReadable);
                omitEscapeSequence(inputStream)
                    .then((ret) => {
                    if (!fulfilled) {
                        onReadable(!ret);
                        inputStream.on('readable', onReadable);
                    }
                })
                    .catch((err) => {
                    fulfill(err);
                });
                return;
            }
            writeByte(asciiCode, outputStream);
            if (asciiCode === 0x03 && outputStream.isTTY) {
                fulfill(null, false);
                process.kill(process.pid, 'SIGINT');
                return;
            }
            if (asciiCode === 0x79 || asciiCode === 0x59) {
                fullPrompt = makePrompt(prompt, defaultResponse, timeout && 0, 0);
                printPrompt(fullPrompt, outputStream, true);
                outputStream.write('\n');
                fulfill(null, true);
                return;
            }
            if (asciiCode === 0x6e || asciiCode === 0x4e) {
                fullPrompt = makePrompt(prompt, defaultResponse, timeout && 0, 0);
                printPrompt(fullPrompt, outputStream, true);
                outputStream.write('\n');
                fulfill(null, false);
                return;
            }
            if ((asciiCode === 0x0a || asciiCode === 0x0d) &&
                defaultResponse != null) {
                fullPrompt = makePrompt(prompt, defaultResponse, timeout && 0, 0);
                printPrompt(fullPrompt, outputStream, true);
                outputStream.write(`${defaultResponse ? 'y' : 'n'}\n`);
                fulfill(null, defaultResponse);
                return;
            }
            outputStream.write('\n');
            outputStream.write(`Please enter 'y' or 'n'${defaultResponse != null
                ? ` or press enter to accept the default of '${defaultResponse === true ? 'y' : 'n'}'`
                : ''}`);
            if (outputStream.isTTY) {
                outputStream.write('\n');
            }
            printPrompt(fullPrompt, outputStream);
            // If we get here, rerun in case there's another character in the buffer.
            onReadable();
        }
        inputStream.on('readable', onReadable);
        onReadable();
    }).finally(() => {
        if (inputStream.isTTY && !originalRawMode)
            inputStream.setRawMode(false);
    });
}
exports.default = Confirm;
