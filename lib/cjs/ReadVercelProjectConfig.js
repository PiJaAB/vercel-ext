"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const defaultConfig = {
    teamConfiguration: null,
};
function parseTeamConfigurationItem(rawConfig, index) {
    const pathName = index != null ? `teamConfiguration[${index}]` : 'teamConfiguration';
    if ((typeof rawConfig !== 'object' && typeof rawConfig !== 'undefined') || Array.isArray(rawConfig)) {
        console.warn(`Invalid teamConfiguration. Expected \`${pathName}\` to be an object, got \`${Array.isArray(rawConfig) ? 'array' : typeof rawConfig}\``);
        return null;
    }
    if (rawConfig == null) {
        return null;
    }
    let teamId = null;
    let teamSlug = null;
    let projectId = null;
    let projectSlug = null;
    if ('teamId' in rawConfig) {
        if (rawConfig.teamId != null && typeof rawConfig.teamId !== 'string') {
            console.warn(`Invalid teamConfiguration. Expected \`${pathName}.teamId\` to be a string, got \`${typeof rawConfig.teamId}\`}`);
            return null;
        }
        teamId = rawConfig.teamId ?? null;
    }
    if ('teamSlug' in rawConfig) {
        if (rawConfig.teamSlug != null && typeof rawConfig.teamSlug !== 'string') {
            console.warn(`Invalid teamConfiguration. Expected \`${pathName}.teamSlug\` to be a string, got \`${typeof rawConfig.teamSlug}\`}}`);
            return null;
        }
        teamSlug = rawConfig.teamSlug ?? null;
    }
    if ('projectId' in rawConfig) {
        if (rawConfig.projectId != null && typeof rawConfig.projectId !== 'string') {
            console.warn(`Invalid projectConfiguration. Expected \`projectConfiguration[${index}].projectId\` to be a string, got \`${typeof rawConfig.projectId}\`}}}`);
            return null;
        }
        projectId = rawConfig.projectId ?? null;
    }
    if ('projectSlug' in rawConfig) {
        if (rawConfig.projectSlug != null && typeof rawConfig.projectSlug !== 'string') {
            console.warn(`Invalid projectConfiguration. Expected \`projectConfiguration[${index}].projectSlug\` to be a string, got \`${typeof rawConfig.projectSlug}\`}}}}`);
            return null;
        }
        projectSlug = rawConfig.projectSlug ?? null;
    }
    if (teamId == null && teamSlug != null) {
        if (projectSlug == null) {
            console.warn(`Invalid teamConfiguration. Expected \`${pathName}.projectSlug\` to be defined when \`${pathName}.teamId\` is not set`);
            return null;
        }
        return {
            teamSlug,
            projectSlug,
        };
    }
    if (teamId != null) {
        if (projectId == null) {
            console.warn(`Invalid teamConfiguration. Expected \`${pathName}.projectId\` to be defined when \`${pathName}.teamId\` is set`);
            return null;
        }
        return {
            teamId,
            projectId,
        };
    }
    else {
        console.warn(`Invalid teamConfiguration. Expected either \`${pathName}.teamId\` or \`${pathName}.teamSlug\` to be set`);
        return null;
    }
}
function parseTeamConfiguration(rawConfig) {
    if (typeof rawConfig !== 'object' && typeof rawConfig !== 'undefined') {
        console.warn(`Invalid teamConfiguration. Expected \`teamConfiguration\` to be an object or array, got \`${typeof rawConfig}\``);
        return null;
    }
    if (rawConfig == null) {
        return null;
    }
    if (Array.isArray(rawConfig)) {
        const arr = rawConfig.map(parseTeamConfigurationItem).filter((item) => item !== null);
        if (arr.length === 0) {
            return null;
        }
        return arr;
    }
    const parsedConfig = parseTeamConfigurationItem(rawConfig);
    if (parsedConfig === null) {
        return null;
    }
    return [parsedConfig];
}
function getConfig() {
    try {
        const config = structuredClone(defaultConfig);
        const configPath = (0, node_path_1.resolve)(process.cwd(), 'vercel.project.json');
        const fd = (0, node_fs_1.openSync)(configPath, 'r');
        const stat = (0, node_fs_1.fstatSync)(fd);
        if (!stat.isFile()) {
            console.warn('Config file is not a file. Using default config.');
            return defaultConfig;
        }
        let fileBuffer = Buffer.alloc(stat.size);
        (0, node_fs_1.readSync)(fd, fileBuffer, 0, stat.size, 0);
        const fileContents = fileBuffer.toString('utf-8');
        fileBuffer = null;
        const rawConfigObj = JSON.parse(fileContents);
        if (typeof rawConfigObj !== 'object' || rawConfigObj === null || Array.isArray(rawConfigObj)) {
            console.warn('Config file is not an object. Using default config.');
            return defaultConfig;
        }
        if ('teamConfiguration' in rawConfigObj) {
            config.teamConfiguration = parseTeamConfiguration(rawConfigObj.teamConfiguration);
        }
        return config;
    }
    catch (err) {
        console.warn('Unable to load config file. Using default config.');
        return defaultConfig;
    }
}
const config = getConfig();
exports.default = config;
