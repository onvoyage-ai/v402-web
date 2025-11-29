/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/react/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // 禁用 preflight，避免与 antd 样式冲突
  corePlugins: {
    preflight: false,
  },
}



