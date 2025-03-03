const path = require('path');
const nodeExternals = require('webpack-node-externals');

const __dirname = path.dirname(new URL(import.meta.url).pathname);

module.exports = {
    entry: './src/server.ts',
    target: 'node',
    externals: [ nodeExternals() ],
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'server.bundle.js',
        clean: true
    },
    resolve: {
        extensions: ['.ts', 'js']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    }
};
