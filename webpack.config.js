const path = require('path');
const webpack = require('webpack');
const CleanPlugin = require('clean-webpack-plugin');
const STATIC_DIST = path.join(process.cwd(), '/dist');

module.exports = {
    entry: [
        path.join(process.cwd(), '/src/index.js')
    ],
    output: {
        path: STATIC_DIST,
        filename: 'index.js',
        library: 'IndexedDB',
        libraryTarget: 'umd'
    },
    devtool: false,
    cache: false,
    plugins: [
        new CleanPlugin(STATIC_DIST),
        new webpack.DefinePlugin({
            __SERVER__: false,
            __DEVELOPMENT__: false,
            __DEVTOOLS__: false,
            'process.env': {
                NODE_ENV: JSON.stringify('production')
            },
        }),
        new webpack.optimize.UglifyJsPlugin({
            beautify: false,
            comments: false,
            compress: {
                warnings: false,
                drop_console: true,
            }
        }),
        new webpack.optimize.ModuleConcatenationPlugin()
    ],
    module: {
        rules: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: /node_modules/,
                include: [
                    path.join(process.cwd() + '/src'),
                ]
            }
        ]
    },
};
