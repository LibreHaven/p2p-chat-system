const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpe?g|gif)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[hash][ext][query]'
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html'
    })
  ],
  devServer: {
    historyApiFallback: true,
    // Allow overriding the dev server port via environment variable (e.g., PORT=3001)
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
    static: path.resolve(__dirname, 'public'),
    host: 'localhost',
    allowedHosts: 'all',
    client: {
      overlay: true,
      webSocketURL: 'auto://0.0.0.0:0/ws'
    },
    // Avoid auto-opening browser which can be flaky in some Windows setups
    open: false,
    hot: true,
    // Prevent dev-server from auto-closing on parent signal glitches in some terminals
    setupExitSignals: false
  }
};
