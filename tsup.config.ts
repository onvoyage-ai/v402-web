import {defineConfig, Options} from 'tsup';

// 检查是否为 release 构建（通过环境变量控制）
const isRelease = process.env.BUILD_ENV === 'production';

const baseConfig: Partial<Options> = {
    dts: true,
    sourcemap: true,
    format: ['cjs', 'esm'],
    external: ['react', '@solana/web3.js', '@solana/spl-token', 'ethers', 'x402', 'viem', 'zod', 'antd', '@ant-design/icons'],
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
            options.external = [...(options.external || []), '*.css'];
            options.define = {
                ...(options.define || {}),
                '__PROD_BACK_URL__': !isRelease 
                    ? JSON.stringify('http://localhost:3000/api/pay')
                    : JSON.stringify('https://v402pay.onvoyage.ai/api/pay'),
            };
        },
    },
]);

