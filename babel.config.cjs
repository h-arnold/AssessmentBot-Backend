module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    [
      '@babel/preset-typescript',
      {
        allowDeclareFields: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        onlyRemoveTypeImports: true,
      },
    ],
  ],
  plugins: [
    // Enable TypeScript decorators support
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    ['@babel/plugin-transform-class-properties', { loose: true }],
    // Transform import.meta.url to __filename for Jest compatibility
    [
      'babel-plugin-transform-import-meta',
      {
        module: 'CommonJS',
      },
    ],
  ],
  // Only apply this transform in test environment
  env: {
    test: {
      plugins: [
        ['@babel/plugin-proposal-decorators', { legacy: true }],
        ['@babel/plugin-transform-class-properties', { loose: true }],
        [
          'babel-plugin-transform-import-meta',
          {
            module: 'CommonJS',
          },
        ],
      ],
    },
  },
};
