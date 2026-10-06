import { createOpenAPI } from '@decentdocs/openapi/server';

export const openapi = createOpenAPI({
  // input files
  input: ['./openapi.yaml'],
});
