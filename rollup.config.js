import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { babel } from '@rollup/plugin-babel';
import { terser } from "rollup-plugin-terser";
import filesize from 'rollup-plugin-filesize';
import svelte from 'rollup-plugin-svelte';

const isProduction = process.env.NODE_ENV === "production";

const name = "Djembe";

const destBase = "dist/bundle";
const destExtension = `${isProduction ? ".min" : ""}.js`;

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
        svelte(),
        commonjs(),
        nodeResolve(),
        babel({
            babelHelpers: 'bundled',
            exclude: 'node_modules/**'
        }),
        isProduction && terser(),
        filesize()
    ].filter(Boolean),
};