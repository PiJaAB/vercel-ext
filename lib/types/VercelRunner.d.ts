/// <reference types="node" resolution-mode="require"/>
export declare class NonNormalExitError extends Error {
    readonly stdOut: string | null;
    readonly stdErr: string | null;
    readonly exitCode: number | null;
    readonly signal: NodeJS.Signals | null;
    readonly vercelVersion: string | null;
    constructor(stdOut: string | null, stdErr: string | null, exitCode: number | null, signal: NodeJS.Signals | null, vercelVersion: string | null, interactive?: boolean);
}
/**
 * Checks if this error is an indication of the given vercel error code.
 * @callback isVercelCodeDef
 * @param {string} code The code to check
 * @returns {boolean} Whether this error is an indication of the given vercel error code.
 */
export declare class VercelBaseError extends Error {
    readonly stdOut: string | null;
    readonly stdErr: string | null;
    readonly vercelVersion: string | null;
    constructor(stdOut: string | null, stdErr: string | null, vercelVersion: string | null, message?: string, interactive?: boolean);
    /**
     * Checks if this error is an indication of the given vercel error code.
     */
    isVercelCode(code: string): boolean;
}
export declare class VercelError extends VercelBaseError {
    readonly code: string;
    readonly vercelVersion: string | null;
    constructor(stderr: string, stdout: string | null, code: string, vercelVersion: string | null, interactive?: boolean);
    isVercelCode(code: string): boolean;
}
export declare class VercelMultiError extends VercelBaseError {
    readonly codes: readonly string[];
    /**
     * @param {string} stderr
     * @param {string | null} stdout
     * @param {string[]} codes
     * @param {string | null} vercelVersion
     * @param {boolean} [interactive]
     */
    constructor(stderr: string, stdout: string | null, codes: readonly string[], vercelVersion: string | null, interactive?: boolean);
    isVercelCode(code: string): boolean;
}
interface BaseCommandOptions {
    mode?: typeof INTERACTIVE | typeof YES | typeof NONINTERACTIVE;
    scope?: string;
}
type CommandOptions<T> = T & BaseCommandOptions;
export declare const INTERACTIVE: unique symbol;
export declare const YES: unique symbol;
export declare const NONINTERACTIVE: unique symbol;
interface VercelOptions {
    token?: string;
    teamSlug?: string;
    teamId?: string;
    projectSlug?: string;
    projectId?: string;
    debug?: boolean;
    timeout?: number;
    killTimeout?: number;
    timeoutWhenInteractive?: boolean;
}
export declare class Vercel {
    private token;
    teamSlug?: string;
    teamId?: string;
    projectSlug?: string;
    projectId?: string;
    debug: boolean;
    timeout: number;
    killTimeout: number;
    timeoutWhenInteractive: boolean;
    constructor({ token, teamSlug, teamId, projectSlug, projectId, debug, timeout, killTimeout, timeoutWhenInteractive, }?: VercelOptions);
    private get preArgs();
    private runVercel;
    getVersion({ mode }?: BaseCommandOptions): Promise<string>;
    getCurrentUser({ mode }?: BaseCommandOptions): Promise<string>;
    login({ mode }?: BaseCommandOptions): Promise<{
        result: string | null;
        error: string | null;
        version: string | null;
    }>;
    listTeams({ mode }?: BaseCommandOptions): Promise<{
        bySlug: {
            [key: string]: {
                slug: string;
                name: string;
                isCurrent: boolean;
            };
        };
        current: {
            slug: string;
            name: string;
            isCurrent: boolean;
        } | null;
    }>;
    /**
     * Link the current directory to a Vercel project
     *
     * @typedef {object} LinkOptions
     * @property {string | null} [options.projectSlug] The project ID to link to (Will attempt to auto-detect if not provided)
     * @param {CommandOptions<LinkOptions>} [options]
     */
    link({ mode, projectSlug, }?: CommandOptions<{
        projectSlug?: string;
    }>): Promise<{
        result: string | null;
        error: string | null;
        version: string | null;
    }>;
    pullEnvironment({ mode, environment, projectPath, }?: CommandOptions<{
        environment?: "production" | "preview" | "development";
        projectPath?: string;
    }>): Promise<{
        result: string | null;
        error: string | null;
        version: string | null;
    }>;
    /**
     * Check wheether we're currently linked to a Vercel project
     *
     * @returns {Promise<boolean>}
     */
    isLinked(): Promise<boolean>;
}
export {};
