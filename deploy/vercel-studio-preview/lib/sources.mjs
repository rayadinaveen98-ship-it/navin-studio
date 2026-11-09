import {createSourceAdapter} from './source-adapter.mjs';
import {createWorkspaceSource} from './workspace-source.mjs';
import {createQualitySource} from './quality-source.mjs';
import {createActivitySource} from './activity-source.mjs';
// ALL sources are allowlisted public repositories. Never use tokens, user-supplied URLs or private files.
export const adapter=createSourceAdapter({mode:'github'});
export const workspaces=createWorkspaceSource({mode:'github'});
export const quality=createQualitySource({mode:'github'});
export const activity=createActivitySource({mode:'github'});
