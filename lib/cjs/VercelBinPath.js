"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ResolveModule_js_1 = require("./ResolveModule.js");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const VercelNotFoundError = function () {
    if (!(this instanceof VercelNotFoundError)) {
        return new VercelNotFoundError();
    }
    const instance = new Error('Vercel package not found');
    Object.setPrototypeOf(instance, Object.getPrototypeOf(this));
    if (Error.captureStackTrace) {
        Error.captureStackTrace(instance, VercelNotFoundError);
    }
    return instance;
};
Object.setPrototypeOf(VercelNotFoundError.prototype, Error.prototype);
VercelNotFoundError.prototype.name = VercelNotFoundError.name;
let vercelPkgPath;
try {
    vercelPkgPath = (0, ResolveModule_js_1.resolveModule)('vercel/package.json');
}
catch (err) {
    console.error(err);
    throw new VercelNotFoundError();
}
const vercelPkg = JSON.parse((0, node_fs_1.readFileSync)(vercelPkgPath, 'utf8'));
if (typeof vercelPkg !== 'object' || vercelPkg === null || Array.isArray(vercelPkg)) {
    throw new TypeError('Expected `vercelPkg` to be an object');
}
if (typeof vercelPkg.bin !== 'object' || Array.isArray(vercelPkg.bin)) {
    if (vercelPkg.bin === undefined) {
        throw new TypeError('`[vercel:package.json].bin` is missing.');
    }
    throw new TypeError(`Expected \`[vercel:package.json].bin\` to be an object, got \ś${typeof vercelPkg.bin}}\``);
}
if (vercelPkg.bin === null) {
    throw new TypeError('`[vercel:package.json].bin` is missing.');
}
if (typeof vercelPkg.bin.vercel !== 'string') {
    throw new TypeError(`Expected \`[vercel:package.json].bin.vercel\` to be a string, got \`${typeof vercelPkg.bin.vercel}\``);
}
if (vercelPkg.bin.vercel === '') {
    throw new TypeError('`[vercel:package.json].bin.vercel` is empty.');
}
if (/^(?:\/|\.\.(?:\/:$))/.test(vercelPkg.bin.vercel.startsWith)) {
    throw new TypeError(`Expected \`[vercel:package.json].bin.vercel\` to not start with \`/\` or \`../\`, got \`${vercelPkg.bin.vercel}\` (Potential security vulnerability)`);
}
const vercelBinPath = (0, node_path_1.resolve)((0, node_path_1.dirname)(vercelPkgPath), vercelPkg.bin.vercel);
exports.default = vercelBinPath;
