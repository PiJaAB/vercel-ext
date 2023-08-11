"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Vercel = exports.NONINTERACTIVE = exports.YES = exports.INTERACTIVE = exports.VercelMultiError = exports.VercelError = exports.VercelBaseError = exports.NonNormalExitError = void 0;
/* eslint-disable consistent-return */
/* eslint-disable max-classes-per-file */
const node_child_process_1 = require("node:child_process");
const strip_ansi_1 = require("strip-ansi");
const VercelBinPath_js_1 = require("./VercelBinPath.js");
function VercelCodeToErrorName(code, constructor) {
    if (/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(code)) {
        return `${code
            .split("-")
            .map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
            .join("")}Error`;
    }
    return `${constructor.name}[${code}]`;
}
class NonNormalExitError extends Error {
    stdOut;
    stdErr;
    exitCode;
    signal;
    vercelVersion;
    constructor(stdOut, stdErr, exitCode, signal, vercelVersion, interactive) {
        let message;
        if (stdErr && !interactive) {
            const newMessage = (0, strip_ansi_1.default)(stdErr).replace(/^Error:\s*/, "");
            if (newMessage) {
                message = newMessage;
            }
        }
        if (!message) {
            if (exitCode != null)
                message = `Command failed with exit code ${exitCode}${signal != null ? ` and signal '${signal}'` : "."}`;
            else if (signal != null)
                message = `Command failed with signal '${signal}'.`;
            else
                message = "Command failed for unknown reasons.";
        }
        super(message);
        this.stdOut = stdOut;
        this.stdErr = stdErr;
        this.exitCode = exitCode;
        this.signal = signal;
        this.vercelVersion = vercelVersion;
        Object.defineProperty(this, "exitCode", {
            writable: false,
            enumerable: false,
            value: exitCode,
        });
        Object.defineProperty(this, "signal", {
            writable: false,
            enumerable: false,
            value: signal,
        });
        Object.defineProperty(this, "vercelVersion", {
            writable: false,
            enumerable: false,
            value: vercelVersion,
        });
        Object.defineProperty(this, "stdOut", {
            writable: false,
            enumerable: false,
            value: stdOut,
        });
        Object.defineProperty(this, "stdErr", {
            writable: false,
            enumerable: false,
            value: stdErr,
        });
    }
}
exports.NonNormalExitError = NonNormalExitError;
Object.defineProperty(NonNormalExitError.prototype, "name", {
    get() {
        const exitCode = this.exitCode != null ? `exitCode=${this.exitCode}` : "";
        const signal = this.signal != null ? `signal=${this.signal}` : "";
        if (!exitCode && !signal)
            return NonNormalExitError.name;
        return `${NonNormalExitError.name}(${exitCode}${exitCode && signal ? ", " : ""}${signal}})`;
    },
    set(value) {
        if (this !== NonNormalExitError.prototype) {
            Object.defineProperty(this, "name", {
                value,
                enumerable: false,
                writable: true,
                configurable: true,
            });
        }
    },
    enumerable: false,
    configurable: true,
});
/**
 * Checks if this error is an indication of the given vercel error code.
 * @callback isVercelCodeDef
 * @param {string} code The code to check
 * @returns {boolean} Whether this error is an indication of the given vercel error code.
 */
class VercelBaseError extends Error {
    stdOut;
    stdErr;
    vercelVersion;
    constructor(stdOut, stdErr, vercelVersion, message, interactive = false) {
        let fullMessage = "";
        if (stdErr && !interactive) {
            const newMessage = (0, strip_ansi_1.default)(stdErr).replace(/^Error:\s*/, "");
            if (newMessage) {
                fullMessage = newMessage;
            }
        }
        super(`${fullMessage}${message ? `\n${message}` : ""}` || "Unknown error");
        this.stdOut = stdOut;
        this.stdErr = stdErr;
        this.vercelVersion = vercelVersion;
        Object.defineProperty(this, "vercelVersion", {
            writable: false,
            enumerable: false,
            value: vercelVersion,
        });
        Object.defineProperty(this, "stdOut", {
            writable: false,
            enumerable: false,
            value: stdOut,
        });
        Object.defineProperty(this, "stdErr", {
            writable: false,
            enumerable: false,
            value: stdErr,
        });
    }
    isVercelCode() {
        return false;
    }
}
exports.VercelBaseError = VercelBaseError;
class VercelError extends VercelBaseError {
    code;
    vercelVersion;
    constructor(stderr, stdout, code, vercelVersion, interactive) {
        super(stderr, stdout, vercelVersion, `See: https://err.sh/vercel/${code}`, interactive);
        this.code = code;
        this.vercelVersion = vercelVersion;
        Object.defineProperty(this, "code", {
            writable: true,
            enumerable: false,
            value: code,
        });
    }
    isVercelCode(code) {
        return this.code === code;
    }
}
exports.VercelError = VercelError;
Object.defineProperty(VercelError.prototype, "name", {
    /**
     * @this {VercelError}
     * @returns {string}
     */
    get() {
        return VercelCodeToErrorName(this.code, VercelError);
    },
    set(value) {
        if (this !== VercelError.prototype) {
            Object.defineProperty(this, "name", {
                value,
                enumerable: false,
                writable: true,
                configurable: true,
            });
        }
    },
    enumerable: false,
    configurable: true,
});
class VercelMultiError extends VercelBaseError {
    codes;
    /**
     * @param {string} stderr
     * @param {string | null} stdout
     * @param {string[]} codes
     * @param {string | null} vercelVersion
     * @param {boolean} [interactive]
     */
    constructor(stderr, stdout, codes, vercelVersion, interactive) {
        super(stderr, stdout, vercelVersion, `See: ${codes.map((code) => `https://err.sh/vercel/${code}`).join(" ")}`, interactive);
        this.codes = codes;
        Object.defineProperty(this, "codes", {
            writable: true,
            enumerable: false,
            value: codes,
        });
    }
    isVercelCode(code) {
        return this.codes.includes(code);
    }
}
exports.VercelMultiError = VercelMultiError;
/**
 *
 * @param {string} stderr
 */
function parseError(stderr) {
    /**
     * @type {string[]}
     */
    const codes = [];
    if (stderr == null)
        return [null, null];
    const cleanErr = stderr.replace(/(?:\r\n|\s|^)(?:Learn More:\s*)?https:\/\/err\.sh\/vercel\/(\S+)(\r\n|\s|$)/g, 
    /**
     * @param {string} _
     * @param {string | undefined} prefix1
     * @param {string | undefined} prefix2
     * @param {string} code
     * @param {string} suffix
     * @returns
     */
    (_, code, suffix) => {
        codes.push(code);
        return suffix;
    });
    if (codes.length === 0) {
        return [null, null];
    }
    return [cleanErr, codes];
}
function makeError(stdOut, stdErr, exitCode, signal, vercelVersion, interactive) {
    if (signal == null && exitCode != null && exitCode !== 0) {
        const [cleanErr, codes] = parseError(stdErr);
        if (cleanErr != null) {
            if (codes.length === 1) {
                return new VercelError(cleanErr, stdOut, codes[0], vercelVersion, interactive);
            }
            return new VercelMultiError(cleanErr, stdOut, codes, vercelVersion, interactive);
        }
    }
    return new NonNormalExitError(stdOut, stdErr, exitCode ?? null, signal ?? null, vercelVersion, interactive);
}
/**
 * Finalizes the messages array, filters out the version line by mutating the input,
 * returns the version string.
 */
function finalizeMessages(messages) {
    const firstErrLine = messages.findIndex(([stream]) => stream === "err");
    let retVal = null;
    if (firstErrLine >= 0) {
        const firstErrStr = messages[firstErrLine][1].toString("binary");
        const match = firstErrStr.match(/^Vercel CLI (.*?)($|(\r?\n.*))/);
        if (match) {
            const [, version, suffix] = match;
            retVal = version;
            if (suffix !== "") {
                let parsedSuffix;
                if (suffix.startsWith("\r\n")) {
                    parsedSuffix = suffix.slice(2);
                }
                else {
                    parsedSuffix = suffix.slice(1);
                }
                // eslint-disable-next-line no-param-reassign
                messages[firstErrLine][1] = Buffer.from(parsedSuffix, "binary");
            }
            else {
                messages.splice(firstErrLine, 1);
            }
        }
    }
    return retVal;
}
function getStream(stream, messages, encoding = "utf-8") {
    const filtered = messages
        .filter(([s]) => s === stream)
        .map(([, msg]) => msg.toString(encoding));
    if (filtered.length === 0)
        return null;
    return filtered.join("").replace(/\r?\n$/, "");
}
const SIGINT_TIMEOUT = 10000;
const SIGKILL_TIMEOUT = 1000;
function fixAndRethrow(err, fn) {
    if (err instanceof NonNormalExitError || err instanceof VercelBaseError) {
        const oldStack = err.stack;
        Error.captureStackTrace(err, fn);
        if (err.stack != null && !/\n\s+at\s[^\n]+$/.test(err.stack)) {
            // eslint-disable-next-line no-param-reassign
            err.stack = oldStack;
        }
    }
    throw err;
}
exports.INTERACTIVE = Symbol("interactive");
exports.YES = Symbol("yes");
exports.NONINTERACTIVE = Symbol("noninteractive");
class Vercel {
    token;
    teamSlug;
    teamId;
    projectSlug;
    projectId;
    debug;
    timeout;
    killTimeout;
    timeoutWhenInteractive;
    constructor({ token, teamSlug, teamId, projectSlug, projectId, debug = false, timeout = 10000, killTimeout = 1000, timeoutWhenInteractive = false, } = {}) {
        this.token = token ?? null;
        this.teamSlug = !teamId ? teamSlug : undefined;
        this.teamId = teamId || undefined;
        this.projectSlug = !projectId ? projectSlug : undefined;
        this.projectId = projectId || undefined;
        this.debug = debug;
        this.timeout = timeout;
        this.killTimeout = killTimeout;
        this.timeoutWhenInteractive = timeoutWhenInteractive;
    }
    get preArgs() {
        const args = ["--no-color"];
        if (this.token) {
            args.push(`--token=${this.token}`);
        }
        if (!this.teamId && this.teamSlug) {
            args.push(`--scope=${this.teamSlug}`);
        }
        if (this.debug) {
            args.push("--debug");
        }
        return args;
    }
    async runVercel(mode, ...args) {
        let interactive = false;
        if (mode === exports.INTERACTIVE) {
            interactive = true;
        }
        else if (mode === exports.YES) {
            if (args.some((a) => a === "--yes" ||
                (typeof a === "string" && /^--yes(?:$|=)|^-[^-]*y/.test(a)))) {
                process.stderr.write("Warning: Passing --yes or -y as a parameter is bad form. Use the run mode YES instead.\n");
            }
            args.push("--yes");
        }
        else if (mode != null && mode !== exports.NONINTERACTIVE) {
            throw new Error(`Invalid mode ${mode}`);
        }
        return new Promise((resolve, reject) => {
            const command = VercelBinPath_js_1.default;
            const allArgs = [
                ...this.preArgs,
                ...args
                    .filter((s) => typeof s === "string" || typeof s === "number")
                    .map((s) => String(s)),
            ];
            if (this.debug) {
                process.stderr.write(`Running command ${command} ${allArgs.join(" ")}\n`);
            }
            const newEnv = { ...process.env };
            delete newEnv.VERCEL_ACCESS_TOKEN;
            delete newEnv.VERCEL_ORG_ID;
            delete newEnv.VERCEL_ORG_SLUG;
            delete newEnv.VERCEL_PROJECT_ID;
            delete newEnv.VERCEL_PROJECT_SLUG;
            if (this.teamId) {
                newEnv.VERCEL_ORG_ID = this.teamId;
            }
            if (this.projectId) {
                newEnv.VERCEL_PROJECT_ID = this.projectId;
            }
            const childProcess = (0, node_child_process_1.spawn)(command, allArgs, {
                stdio: [interactive ? "inherit" : "ignore", "pipe", "pipe"],
                env: newEnv,
            });
            let fulfilled = false;
            let timeout;
            const wasPaused = process.stdin.isPaused();
            const { timeoutWhenInteractive } = this;
            if (interactive) {
                process.stdin.pause();
                childProcess.stdout.pipe(process.stdout);
                childProcess.stderr.pipe(process.stderr);
            }
            function fulfill(err, result) {
                if (fulfilled) {
                    console.warn(new Error("fulfill called twice"));
                    return;
                }
                if (timeout)
                    clearTimeout(timeout);
                if (interactive) {
                    if (childProcess.stdin != null)
                        process.stdin.unpipe(childProcess.stdin);
                    childProcess.stdout.unpipe(process.stdout);
                    childProcess.stderr.unpipe(process.stderr);
                    if (wasPaused && !process.stdin.isPaused()) {
                        process.stdin.pause();
                    }
                    else if (!wasPaused && process.stdin.isPaused()) {
                        process.stdin.resume();
                    }
                }
                fulfilled = true;
                if (err) {
                    if (err instanceof NonNormalExitError &&
                        err.signal === "SIGINT" &&
                        interactive) {
                        // If the subprocess received a SIGINT, and it was interactive, this is most likely a
                        // user-initiated cancelation. Expecting the parent application to have received the
                        // same signal and handle it accordingly. Propagate it to the parent process.
                        // process.kill(process.pid, err.signal);
                    }
                    reject(err);
                }
                else if (!result) {
                    reject(new Error("Unknown Error, no result nor error passed to callback"));
                }
                else
                    resolve(result);
            }
            if (this.timeout > -1 && (!interactive || timeoutWhenInteractive)) {
                timeout = setTimeout(() => {
                    if (this.killTimeout > -1) {
                        timeout = setTimeout(() => {
                            childProcess.kill("SIGKILL");
                        }, SIGKILL_TIMEOUT);
                    }
                    childProcess.kill("SIGTERM");
                }, SIGINT_TIMEOUT);
            }
            const messages = [];
            /**
             * @param {string} stream
             * @param {Buffer} data
             */
            function addMessage(stream, data) {
                messages.push([stream, data]);
            }
            const onStdErrData = (data) => {
                addMessage("err", data);
                if (this.debug && !interactive) {
                    process.stderr.write(data);
                }
            };
            const onStdInData = (data) => {
                addMessage("out", data);
                if (this.debug && interactive) {
                    process.stdout.write(data);
                }
            };
            childProcess.stderr.on("data", onStdErrData);
            childProcess.stdout.on("data", onStdInData);
            childProcess.on("error", function onError(err) {
                fulfill(err);
            });
            childProcess.on("exit", function onExit(code, signal) {
                const version = finalizeMessages(messages);
                if (code !== 0 || signal !== null) {
                    const err = makeError(getStream("out", messages), getStream("err", messages), code, signal, version, interactive);
                    fulfill(err);
                }
                else {
                    fulfill(null, {
                        result: getStream("out", messages),
                        error: !interactive ? getStream("err", messages) : null,
                        version: version,
                    });
                }
            });
        });
    }
    async getVersion({ mode } = {}) {
        try {
            const { result } = await this.runVercel(mode, "--version");
            if (result === null)
                throw new Error("No version found");
            return result;
        }
        catch (err) {
            fixAndRethrow(err, this.getVersion);
        }
    }
    async getCurrentUser({ mode } = {}) {
        try {
            const { result } = await this.runVercel(mode, "whoami");
            if (result === null)
                throw new Error("No user found");
            return result;
        }
        catch (err) {
            fixAndRethrow(err, this.getCurrentUser);
        }
    }
    async login({ mode } = {}) {
        if (mode !== exports.INTERACTIVE && mode != null) {
            return Promise.reject(new Error("Login must be interactive"));
        }
        try {
            return await this.runVercel(exports.INTERACTIVE, "login");
        }
        catch (err) {
            fixAndRethrow(err, this.login);
        }
    }
    async listTeams({ mode } = {}) {
        try {
            const { result } = await this.runVercel(mode, "teams", "ls");
            if (result === null)
                throw new Error("No projects found");
            const lines = result
                .split("\n")
                .map((l) => l.trim())
                .filter((l) => l);
            if (!/^\s*id\s+email \/ name\s*$/.test(lines[0])) {
                throw new Error(`Unexpected output - malformed header row\n${result}`);
            }
            const [, ...rows] = lines;
            return rows
                .map((line) => {
                const match = /^\s*(✔)?\s*(\S+)\s+(\S+)\s*$/.exec(line);
                if (!match) {
                    throw new Error(`Unexpected output - malformed team row\n${result}`);
                }
                const [, current, slug, name] = match;
                return { isCurrent: Boolean(current), slug, name };
            })
                .reduce((acc, { isCurrent, slug, name }) => {
                const obj = {
                    slug,
                    name,
                    isCurrent,
                };
                if (acc.bySlug[slug])
                    throw new Error(`Unexpected output - duplicate id\n${result}`);
                acc.bySlug[slug] = obj;
                if (isCurrent) {
                    if (acc.current !== null) {
                        throw new Error(`Unexpected output - multiple current teams\n${result}`);
                    }
                    acc.current = obj;
                }
                return acc;
            }, { bySlug: {}, current: null });
        }
        catch (err) {
            fixAndRethrow(err, this.pullEnvironment);
        }
    }
    /**
     * Link the current directory to a Vercel project
     *
     * @typedef {object} LinkOptions
     * @property {string | null} [options.projectSlug] The project ID to link to (Will attempt to auto-detect if not provided)
     * @param {CommandOptions<LinkOptions>} [options]
     */
    async link({ mode, projectSlug = this.projectSlug, } = {}) {
        try {
            return await this.runVercel(mode, "link", !this.projectId && projectSlug ? `--project=${projectSlug}` : null);
        }
        catch (err) {
            fixAndRethrow(err, this.link);
        }
    }
    async pullEnvironment({ mode, environment, projectPath, } = {}) {
        try {
            const res = await this.runVercel(mode, "pull", environment ? `--environment=${environment}` : null, projectPath || null);
            return res;
        }
        catch (err) {
            fixAndRethrow(err, this.pullEnvironment);
        }
    }
    /**
     * Check wheether we're currently linked to a Vercel project
     *
     * @returns {Promise<boolean>}
     */
    async isLinked() {
        try {
            const hasLink = await this.runVercel(exports.NONINTERACTIVE, "env", "ls").then(() => {
                return true;
            }, (err) => {
                if (err instanceof NonNormalExitError &&
                    err.stdErr?.includes("Run `vercel link`")) {
                    return false;
                }
                throw err;
            });
            return hasLink;
        }
        catch (err) {
            fixAndRethrow(err, this.isLinked);
        }
    }
}
exports.Vercel = Vercel;
