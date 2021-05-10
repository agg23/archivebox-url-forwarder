const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: {
    background: './src/background.ts',
    popup: './src/popup/popup.ts'
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        'manifest.json',
        'icon.png',
        'src/popup/popup.html'
      ].map(file => {
        const splitPath = file.split('/')
        const to = splitPath[splitPath.length - 1]

        return { from: file, to}
      })
    })
  ]
};
