import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { babel } from '@rollup/plugin-babel';
import { terser } from "rollup-plugin-terser";
import filesize from 'rollup-plugin-filesize';
import svelte from 'rollup-plugin-svelte';
import livereload from 'rollup-plugin-livereload';
import css from 'rollup-plugin-css-only';

const isProduction = process.env.NODE_ENV === "production";
const rollupWatch = process.env.ROLLUP_WATCH;

const name = "Drumbox";

const destBase = "dist/bundle";
const destExtension = `${isProduction ? ".min" : ""}.js`;

function serve() {
	let server;

	function toExit() {
		if (server) server.kill(0);
	}

	return {
		writeBundle() {
			if (server) return;
			server = require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
				stdio: ['ignore', 'inherit', 'inherit'],
				shell: true
			});

			process.on('SIGTERM', toExit);
			process.on('exit', toExit);
		}
	};
}

export default {
    input: 'src/index.js',
    output: [
        {
            file: `${destBase}.esm${destExtension}`,
            format: "esm"
        },
        {
            file: `${destBase}.umd${destExtension}`,
            format: "umd",
            name,
        },
    ],
    plugins: [
        svelte({
            include: 'src/**/*.svelte',
            compilerOptions: {
				// enable run-time checks when not in production
				dev: !isProduction
			}
        }),
        css({ output: 'bundle.css' }),
        nodeResolve({
            browser: true,
			dedupe: ['svelte'],
        }),
        commonjs(),
        babel({
            babelHelpers: 'bundled',
            exclude: 'node_modules/**'
        }),
        isProduction && terser(),
        isProduction && filesize(),
        rollupWatch && serve(),
        rollupWatch && livereload('dist'),
    ],
    watch: {
		clearScreen: false,
	}
};