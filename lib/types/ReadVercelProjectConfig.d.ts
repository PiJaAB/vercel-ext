export interface TeamIdConfig {
    teamId: string;
    projectId: string;
}
export interface TeamSlugConfig {
    teamSlug: string;
    projectSlug?: string;
}
export type TeamConfig = TeamIdConfig | TeamSlugConfig;
export interface Config {
    teamConfiguration: readonly TeamConfig[] | null;
}
declare const config: Config;
export default config;
