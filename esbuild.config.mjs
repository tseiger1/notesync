import esbuild from 'esbuild';
import process from 'process';

const ctx = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'main.js',
  target: 'es2020',
  format: 'cjs',
  platform: 'node',
  sourcemap: true,
  external: ['obsidian', 'electron', '@codemirror/view', 'sharp', 'chokidar']
});

if (process.argv.includes('--watch')) {
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
