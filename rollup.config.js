import fs from 'fs';
import path from 'path';
import sveltePreprocess from 'svelte-preprocess';
import rollupPluginCopy from 'rollup-plugin-copy';
import rollupPluginServe from 'rollup-plugin-serve'
import rollupPluginSvelte from 'rollup-plugin-svelte';
import rollupPluginDelete from 'rollup-plugin-delete';
import rollupPluginPostcss from 'rollup-plugin-postcss';
import rollupPluginTypescript from '@rollup/plugin-typescript';
import rollupPluginLivereload from 'rollup-plugin-livereload'
import rollupPluginNodeResolve from '@rollup/plugin-node-resolve';
import { terser as rollupPluginTerser } from 'rollup-plugin-terser';
import rollupPluginHtml, { makeHtmlAttributes } from '@rollup/plugin-html';

const production = process.env.NODE_ENV === 'production';

/**
 * Custom html plugin template
 *
 * @param {import('@rollup/plugin-html').RollupHtmlTemplateOptions} options
 */
function customHTMLTemplate(options) {
  const { attributes, files, meta, publicPath, title } = options;
  const parse = (template, context) => {
    return (new Function(Object.keys(context).join(', '), 'return `' + template + '`;'))(...Object.values(context));
  }
  const scripts = (files.js || [])
    .map(({ fileName }) => {
      const attrs = makeHtmlAttributes(attributes.script);
      return `<script src="${publicPath}${fileName}"${attrs}></script>`;
    })
    .join('\n');
  const links = (files.css || [])
    .map(({ fileName }) => {
      const attrs = makeHtmlAttributes(attributes.link);
      return `<link href="${publicPath}${fileName}" rel="stylesheet"${attrs}>`;
    })
    .join('\n');
  const metas = meta
    .map((input) => {
      const attrs = makeHtmlAttributes(input);
      return `<meta${attrs}>`;
    })
    .join('\n');
  const html = fs.readFileSync(path.join(__dirname, 'src/index.html'));
  return parse(html, { scripts, links, metas, title });
}

/**
 * @type {import('rollup').RollupOptions}
 */
const options = {
  input: [
    'src/main.ts',
  ],
  output: [
    {
      dir: 'dist/',
      format: 'esm',
      sourcemap: !production,
    },
  ],
  plugins: [
    production && rollupPluginDelete(
      {
        targets: [
          'dist/**/*',
        ],
      }
    ),
    rollupPluginCopy(
      {
        dot: true,
        targets: [
          { src: 'src/assets/**/*', dest: 'dist/assets/' },
          { src: 'src/{manifest.json,favicon.ico}', dest: 'dist/' },
        ],
      },
    ),
    rollupPluginHtml(
      {
        template: options => customHTMLTemplate(options),
      }
    ),
    rollupPluginSvelte(
      {
        compilerOptions: {
          dev: !production,
        },
        preprocess: sveltePreprocess(
          {
            typescript: {
              tsconfigFile: 'tsconfig.json',
            }
          }
        ),
      }
    ),
    rollupPluginPostcss(
      {
        extract: 'style.css',
        minimize: production,
      }
    ),
    rollupPluginTypescript(
      {
        cacheDir: './node_modules/.rollup.cache',
        tsconfig: 'tsconfig.json',
        sourceMap: !production,
      },
    ),
    rollupPluginNodeResolve(
      {
        dedupe: ['svelte'],
        browser: true,
      },
    ),
    production && rollupPluginTerser(),
    !production && rollupPluginServe({ verbose: true, contentBase: 'dist' }),
    !production && rollupPluginLivereload({ watch: 'dist/**/*' }),
  ],
};
export default options;
