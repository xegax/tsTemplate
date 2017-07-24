var path = require('path');

var entry = {
  'docs': './src/apps/docs/app.tsx'
};

module.exports = {
  entry: entry,
  output: {
    path: path.resolve('./build'),
    filename: '[name].bundle.js',
    library: '[name]'
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
    modules: [
      path.resolve('./src'),
      'node_modules'
    ]
  },
  externals: {
  },
  module: {
    loaders: [
      {
        test: /\.tsx?$/,
        loader: "awesome-typescript-loader"
      }
    ]
  },
  devtool: 'source-map'
}
