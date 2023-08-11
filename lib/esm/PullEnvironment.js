import Confirm from "./Confirm.js";
import { INTERACTIVE, NONINTERACTIVE, NonNormalExitError, Vercel, VercelBaseError, YES, } from "./VercelRunner.js";
import config from "./ReadVercelProjectConfig.js";
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
export class AbortedError extends Error {
    constructor() {
        super("Aborted by user");
    }
}
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
    if (config.teamConfiguration == null ||
        config.teamConfiguration.length === 0) {
        throw new Error("Vercel configuration not found. Please check your vercel.project.json-file");
    }
    if (config.teamConfiguration.length === 1) {
        const conf = config.teamConfiguration[0];
        if ("teamId" in conf) {
            return conf;
        }
    }
    const teams = await vercelCli.listTeams({ mode: NONINTERACTIVE });
    const teamConf = config.teamConfiguration.find((conf) => {
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
        mode: NONINTERACTIVE,
        environment: name,
    })
        .catch((err) => {
        if (shouldPrompt() &&
            (err instanceof VercelBaseError || err instanceof NonNormalExitError)) {
            console.error(err);
            if (err instanceof VercelBaseError &&
                err.isVercelCode("no-credentials-found")) {
                throw err;
            }
            return Confirm(`Pulling of environment '${name}' failed. Retry interactively?`, false, 10).then((retry) => {
                if (retry === true) {
                    return vercelCli.pullEnvironment({
                        mode: INTERACTIVE,
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
    const teamConf = config.teamConfiguration && (config.teamConfiguration[0] ?? null);
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
export default async function main() {
    if (process.env.VERCEL)
        return;
    const vercelCli = new Vercel({
        token: process.env.VERCEL_ACCESS_TOKEN,
        // debug: true,
    });
    if (isCI) {
        const { teamId, projectId } = getCIConfig();
        vercelCli.teamId = teamId;
        vercelCli.projectId = projectId;
        await vercelCli.link({
            mode: YES,
        });
    }
    else if (shouldPrompt()) {
        let isLinked;
        try {
            isLinked = await vercelCli.isLinked();
        }
        catch (err) {
            if (err instanceof VercelBaseError &&
                err.isVercelCode("no-credentials-found")) {
                const shouldLogin = await Confirm("No Vercel credentials found. Login interactively?", false, 30);
                if (shouldLogin) {
                    isLinked = await vercelCli
                        .login({
                        mode: INTERACTIVE,
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
            if (await Confirm("Project is not linked to Vercel. Link project now?", false, 30, process.stderr, process.stdin)) {
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
                    mode: vercelCli.teamId ? YES : INTERACTIVE,
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
export function unref() {
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
