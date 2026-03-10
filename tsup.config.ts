import {defineConfig, Options} from 'tsup';

// 检查是否为 release 构建（通过环境变量控制）
const isRelease = process.env.BUILD_ENV === 'production';

// 共享的 external 依赖列表
const externalDeps = [
    'react',
    'react-dom',
    '@solana/kit',
    '@solana-program/token',
    '@solana-program/token-2022',
    '@solana-program/compute-budget',
    'ethers',
    'x402',
    'viem',
    'zod',
    'antd',
    '@ant-design/icons',
];

const baseConfig: Partial<Options> = {
    dts: true,
    sourcemap: true,
    format: ['cjs', 'esm'],
    external: externalDeps,
    // 非 release 环境替换 PROD_BACK_URL 为 localhost，release 环境保持生产 URL
    esbuildOptions(options) {
        options.define = {
            ...(options.define || {}),
            '__PROD_BACK_URL__': !isRelease 
                ? JSON.stringify('http://localhost:3000/api/pay')
                : JSON.stringify('https://v402pay.onvoyage.ai/api/pay'),
        };
    },
};

export default defineConfig([
    // Main SDK bundle
    {
        ...baseConfig,
        entry: ['src/index.ts'],
        clean: true,
    },
    // React package bundle
    {
        ...baseConfig,
        entry: ['src/react/index.ts'],
        outDir: 'dist/react',
        // 保持 CSS 作为外部依赖，由打包工具处理，同时保留 define 配置
        esbuildOptions(options) {
            // 确保继承所有 external 依赖，并添加 CSS
            options.external = [...externalDeps, '*.css'];
            options.define = {
                ...(options.define || {}),
                '__PROD_BACK_URL__': !isRelease 
                    ? JSON.stringify('http://localhost:3000/api/pay')
                    : JSON.stringify('https://v402pay.onvoyage.ai/api/pay'),
            };
        },
    },
]);
