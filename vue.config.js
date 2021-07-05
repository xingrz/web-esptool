const { resolve } = require('path');

module.exports = {
  chainWebpack: (config) => {
    config.module
      .rule('elf')
      .test(/\.elf$/)
      .use('elf-loader')
      .loader(resolve('./elf-loader.js'))
      .end();
  }
}
