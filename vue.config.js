const { resolve } = require('path');

module.exports = {
  chainWebpack: (config) => {
    config.module
      .rule('elf')
      .test(/\.elf$/)
      .use('elf-loader')
      .loader(resolve('./elf-loader.js'))
      .end();

    config.resolve.alias
      .set('assert', require.resolve('assert'))
      .set('buffer', require.resolve('buffer'))
      .set('fs', false)
      .set('stream', require.resolve('stream-browserify'))
      .set('zlib', require.resolve('browserify-zlib'));

    config.plugin('browserify')
      .use(require.resolve('webpack/lib/ProvidePlugin'), [{
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser',
      }]);
  }
}
