import { createRequire } from 'node:module';
export const resolveModule = createRequire(import.meta.url).resolve;
