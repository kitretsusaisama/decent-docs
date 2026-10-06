import type { AnyFeature } from '.';
import { docs } from './docs';
import { llms } from './llms';
import { og } from './og';
import { search } from './search';
import { mcp } from './mcp';
import { webmcp } from './webmcp';
import { lint } from './lint';

export const features: AnyFeature[] = [docs, llms, mcp, webmcp, og, search, lint];
