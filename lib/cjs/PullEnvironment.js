"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unref = exports.AbortedError = void 0;
const Confirm_js_1 = require("./Confirm.js");
const VercelRunner_js_1 = require("./VercelRunner.js");
const ReadVercelProjectConfig_js_1 = require("./ReadVercelProjectConfig.js");
const isCI = process.env.CI === "true";
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
    process.stdin.off("readable", onReadableInit);
}
process.stdin.on("readable", onReadableInit);
/**
 *
 * @param {NodeJS.ReadStream} stream
 * @returns {boolean}
 */
function shouldPrompt(stream = process.stdin) {
    return !isCI && stream.readable;
}
class AbortedError extends Error {
    constructor() {
        super("Aborted by user");
    }
}
exports.AbortedError = AbortedError;
Object.defineProperty(AbortedError.prototype, "name", {
    value: AbortedError.name,
    enumerable: false,
    writable: true,
    configurable: true,
});
async function getScopeAndProjectId(vercelCli) {
    if (process.env.VERCEL_ORG_ID || process.env.VERCEL_PROJECT_ID) {
        if (!process.env.VERCEL_ORG_ID) {
            throw new Error("VERCEL_ORG_ID must be set when VERCEL_PROJECT_ID is set");
        }
        if (!process.env.VERCEL_PROJECT_ID) {
            throw new Error("VERCEL_PROJECT_ID must be set when VERCEL_ORG_ID is set");
        }
        return {
            teamId: process.env.VERCEL_ORG_ID,
            projectId: process.env.VERCEL_PROJECT_ID,
        };
    }
    if (ReadVercelProjectConfig_js_1.default.teamConfiguration == null ||
        ReadVercelProjectConfig_js_1.default.teamConfiguration.length === 0) {
        throw new Error("Vercel configuration not found. Please check your vercel.project.json-file");
    }
    if (ReadVercelProjectConfig_js_1.default.teamConfiguration.length === 1) {
        const conf = ReadVercelProjectConfig_js_1.default.teamConfiguration[0];
        if ("teamId" in conf) {
            return conf;
        }
    }
    const teams = await vercelCli.listTeams({ mode: VercelRunner_js_1.NONINTERACTIVE });
    const teamConf = ReadVercelProjectConfig_js_1.default.teamConfiguration.find((conf) => {
        return "teamSlug" in conf && teams.bySlug[conf.teamSlug] != null;
    });
    if (teamConf == null) {
        throw new Error("No known vercel team found");
    }
    return teamConf;
}
async function pullEnvironment(name, vercelCli) {
    await vercelCli
        .pullEnvironment({
        mode: VercelRunner_js_1.NONINTERACTIVE,
        environment: name,
    })
        .catch((err) => {
        if (shouldPrompt() &&
            (err instanceof VercelRunner_js_1.VercelBaseError || err instanceof VercelRunner_js_1.NonNormalExitError)) {
            console.error(err);
            if (err instanceof VercelRunner_js_1.VercelBaseError &&
                err.isVercelCode("no-credentials-found")) {
                throw err;
            }
            return (0, Confirm_js_1.default)(`Pulling of environment '${name}' failed. Retry interactively?`, false, 10).then((retry) => {
                if (retry === true) {
                    return vercelCli.pullEnvironment({
                        mode: VercelRunner_js_1.INTERACTIVE,
                        environment: name,
                    });
                }
                throw new AbortedError();
            });
        }
        throw err;
    });
}
function getCIConfig() {
    if (process.env.VERCEL_ORG_ID || process.env.VERCEL_PROJECT_ID) {
        if (!process.env.VERCEL_ORG_ID) {
            throw new Error("VERCEL_ORG_ID must be set when VERCEL_PROJECT_ID is set");
        }
        if (!process.env.VERCEL_PROJECT_ID) {
            throw new Error("VERCEL_PROJECT_ID must be set when VERCEL_ORG_ID is set");
        }
        return {
            teamId: process.env.VERCEL_ORG_ID,
            projectId: process.env.VERCEL_PROJECT_ID,
        };
    }
    const teamConf = ReadVercelProjectConfig_js_1.default.teamConfiguration && (ReadVercelProjectConfig_js_1.default.teamConfiguration[0] ?? null);
    if (teamConf == null) {
        throw new Error("Unable to determine Vercel project configuration. Please specify VERCEL_ORG_ID and VERCEL_PROJECT_ID in CI environment variables or specify teamConfiguration as the first configuration in vercel.project.json");
    }
    if ("teamId" in teamConf && "projectId" in teamConf) {
        return {
            teamId: teamConf.teamId,
            projectId: teamConf.projectId,
        };
    }
    throw new Error('Unable to determine Vercel project configuration. Please specify VERCEL_ORG_ID and VERCEL_PROJECT_ID in CI environment variables or make sure the first teamConfiguration in vercel.project.json has teamId and projectId specified');
}
async function main() {
    if (process.env.VERCEL)
        return;
    const vercelCli = new VercelRunner_js_1.Vercel({
        token: process.env.VERCEL_ACCESS_TOKEN,
        // debug: true,
    });
    if (isCI) {
        const { teamId, projectId } = getCIConfig();
        vercelCli.teamId = teamId;
        vercelCli.projectId = projectId;
        await vercelCli.link({
            mode: VercelRunner_js_1.YES,
        });
    }
    else if (shouldPrompt()) {
        let isLinked;
        try {
            isLinked = await vercelCli.isLinked();
        }
        catch (err) {
            if (err instanceof VercelRunner_js_1.VercelBaseError &&
                err.isVercelCode("no-credentials-found")) {
                const shouldLogin = await (0, Confirm_js_1.default)("No Vercel credentials found. Login interactively?", false, 30);
                if (shouldLogin) {
                    isLinked = await vercelCli
                        .login({
                        mode: VercelRunner_js_1.INTERACTIVE,
                    })
                        .then(() => vercelCli.isLinked());
                }
                else {
                    throw new AbortedError();
                }
            }
            else {
                console.error(err);
                console.warn("Failed to check if project is linked. Naively progressing with pulling environments.");
            }
        }
        if (isLinked === false) {
            if (await (0, Confirm_js_1.default)("Project is not linked to Vercel. Link project now?", false, 30, process.stderr, process.stdin)) {
                try {
                    const projectConf = await getScopeAndProjectId(vercelCli);
                    if ("teamId" in projectConf) {
                        vercelCli.teamId = projectConf.teamId;
                        delete vercelCli.teamSlug;
                    }
                    else {
                        vercelCli.teamSlug = projectConf.teamSlug;
                        delete vercelCli.teamId;
                    }
                    if ("projectId" in projectConf && !vercelCli.projectSlug) {
                        vercelCli.projectId = projectConf.projectId;
                        delete vercelCli.projectSlug;
                    }
                    else if ("projectSlug" in projectConf && !vercelCli.projectSlug) {
                        vercelCli.projectSlug = projectConf.projectSlug;
                        delete vercelCli.projectId;
                    }
                }
                catch (err) {
                    console.error(err);
                    process.stderr.write("\nFailed to get user scopes. Please pay careful attention to the following prompts!!!\n");
                }
                await vercelCli.link({
                    mode: vercelCli.teamId ? VercelRunner_js_1.YES : VercelRunner_js_1.INTERACTIVE,
                });
            }
            else {
                throw new AbortedError();
            }
        }
    }
    await pullEnvironment("production", vercelCli);
    await pullEnvironment("preview", vercelCli);
    await pullEnvironment("development", vercelCli);
}
exports.default = main;
function unref() {
    // Due to us doing schenanigans with stdin/stdout/stderr, we need to unref the
    // process to prevent it from hanging and exit cleanly.
    process.stdin.pause();
    if ("unref" in process.stdin) {
        process.stdin.unref();
    }
    if ("unref" in process.stdout) {
        process.stdout.unref();
    }
    if ("unref" in process.stderr) {
        process.stderr.unref();
    }
}
exports.unref = unref;
