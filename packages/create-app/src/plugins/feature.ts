import type { TemplatePlugin } from '@/index';
import { getDefaultConfig } from '@decentdocs/cli/config';
import { type Feature, runFeature } from '@decentdocs/cli/features';
import { loadProject } from '@decentdocs/cli/project';
import { depVersions } from '@/constants';

/** apply a Decent Docs CLI feature to the generated project */
export function feature<O extends object>(feature: Feature<O>, options: O): TemplatePlugin {
  return {
    async afterWrite() {
      const config = await getDefaultConfig(this.dest);
      const project = await loadProject(config, this.dest);

      await runFeature(feature, options, {
        project,
        versions: depVersions,
        io: { log: this.log, installDependencies: false, confirmOverwrite: async () => true },
      });
    },
  };
}
