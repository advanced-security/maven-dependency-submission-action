import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'lib/src/executable/cli.js',
  output: {
    dir: 'output',
    format: 'cjs',
    exports: 'named',
  },
  plugins: [
    commonjs(),
    json(),
    nodeResolve({
      preferBuiltins: true
    })
  ]
};