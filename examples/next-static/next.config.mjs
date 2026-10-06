import { createMDX } from '@decentdocs/mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  reactStrictMode: true,
};

export default withMDX(config);
