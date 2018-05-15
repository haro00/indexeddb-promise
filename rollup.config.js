const rollup = require('rollup');
const babel = require('rollup-plugin-babel');
const resolve = require('rollup-plugin-node-resolve');
const replace = require('rollup-plugin-replace');
const commonjs = require('rollup-plugin-commonjs');
const uglify = require('rollup-plugin-uglify');

let pkg = [
    {
        min: true,
        type: 'umd',
        src: 'src/index.js',
        dist: 'dist/index',
        suffix: '.js',
        globalName: 'IndexedDB'
    }
];

pkg.forEach(item => {
    rollupFn(item)
});

function rollupFn(item) {
    
    const plugins = [
        babel({
            exclude: 'node_modules/**',
            runtimeHelpers: true
        }),
        resolve({
            jsnext: true,
            browser: false,
            main: true
        }),
        commonjs(),
    ];
    
    if (item.min) {
        plugins.push(uglify(), replace({'process.env.NODE_ENV': JSON.stringify('production')}),);
    }
    
    rollup.rollup({
        entry: item.src,
        plugins
    }).then(bundle => {
        const dest = item.dist + item.suffix;
        
        bundle.write({
            format: item.type,
            moduleName: item.globalName,
            dest
        })
    }).catch(e => {
        console.log(e);
    });
}