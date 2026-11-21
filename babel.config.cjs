// config do babel para o jest conseguir rodar os arquivos com import/export
module.exports = {
    presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
};
