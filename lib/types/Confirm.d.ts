/// <reference types="node" resolution-mode="require"/>
export declare class TimeoutError extends Error {
    constructor(reason?: string);
}
export default function Confirm(prompt: string, defaultResponse?: boolean | null, timeout?: number | null, outputStream?: NodeJS.WriteStream, inputStream?: NodeJS.ReadStream): Promise<boolean>;
