
import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';
import legacy from '@vitejs/plugin-legacy';
import terser from '@rollup/plugin-terser';
import viteCompression from 'vite-plugin-compression';
import eslintPlugin from 'vite-plugin-eslint';
import stylelintPlugin from 'vite-plugin-stylelint';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';
import vitePluginImp from 'vite-plugin-imp';
import mkcert from 'vite-plugin-mkcert';
import path from 'path';
import fs from 'fs';
import { glob } from 'glob';
import sharp from 'sharp';

// تابع برای دریافت ورودی‌های HTML
function getHtmlEntries() {
  const projectRoot = path.resolve(__dirname);
  const files = fs.readdirSync(projectRoot);
  return files
    .filter(file => file.endsWith('.html'))
    .reduce((entries, file) => {
      const name = path.basename(file, '.html');
      entries[name] = path.resolve(projectRoot, file);
      return entries;
    }, {});
}

// تابع برای بهینه‌سازی تصاویر
async function optimizeImages() {
  const publicDir = path.resolve(__dirname, 'public');
  const outputDir = path.resolve(__dirname, 'dist');

  const imageFiles = await glob('**/*.{jpg,jpeg,png,gif,webp,avif}', { cwd: publicDir, nodir: true });

  for (const file of imageFiles) {
    const inputFile = path.join(publicDir, file);
    const outputFile = path.join(outputDir, file);
    const dirname = path.dirname(outputFile);

    if (!fs.existsSync(dirname)) {
      fs.mkdirSync(dirname, { recursive: true });
    }

    const image = sharp(inputFile);
    const metadata = await image.metadata();

    if (metadata.format === 'gif') {
      // برای GIF ها از کتابخانه دیگری استفاده کنید یا آن‌ها را کپی کنید
      fs.copyFileSync(inputFile, outputFile);
    } else {
      await image
        .resize({ width: metadata.width, height: metadata.height, fit: 'inside', withoutEnlargement: true })
        .toFormat(metadata.format, { quality: 80 })
        .toFile(outputFile);
    }
  }
}

// پیکربندی Vite
export default defineConfig({
  server: {
    https: true,
  },
  plugins: [
    mkcert(),
    createHtmlPlugin({
      minify: {
        collapseWhitespace: true,
        removeComments: true,
        minifyCSS: true,
        minifyJS: true,
      },
    }),
    vitePluginImp({
      libList: [
        {
          libName: 'lodash',
          libDirectory: '',
          camel2DashComponentName: false,
          style: () => false,
        },
      ],
    }),
    legacy({
      targets: ['ie >= 11', 'chrome 52'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      renderLegacyChunks: true,
      polyfills: ['es.promise.finally', 'es/map', 'es/set'],
      modernPolyfills: ['es.promise.finally'],
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    viteCompression({
      algorithm: 'deflate',
      ext: '.deflate',
    }),
    eslintPlugin({
      cache: true,
      fix: true,
      include: ['src/**/*.js', 'src/**/*.vue', 'src/**/*.ts'],
      exclude: ['node_modules'],
    }),
    stylelintPlugin({
      fix: true,
      files: ['src/**/*.css', 'src/**/*.scss', 'src/**/*.vue'],
      cache: true,
    }),
    visualizer({
      filename: 'stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
    // فقط در حالت تولید از VitePWA استفاده می‌شود
    ...(process.env.NODE_ENV === 'production' ? [
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
        manifest: {
          name: 'هایپر وبسایت',
          short_name: 'هایپر وبسایت',
          description: 'متفاوت تجارت کنید',
          theme_color: '#121116',
          start_url: '/',
          display: 'standalone',
          background_color: '#121116',
          orientation: 'any',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,avif,woff2}'],
        },
      }),
    ] : []),
    {
      name: 'optimize-images',
      apply: 'build',
      enforce: 'post',
      closeBundle: async () => {
        await optimizeImages();
      },
    },
  ],
  build: {
    minify: 'terser',
    cssCodeSplit: true,
    cssMinify: true,
    rollupOptions: {
      input: getHtmlEntries(),
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor_react';
            if (id.includes('lodash')) return 'vendor_lodash';
            return 'vendor';
          }
        },
      },
      plugins: [
        terser({
          compress: {
            drop_console: true,
            drop_debugger: true,
          },
          format: { comments: false },
          mangle: {
            toplevel: true,
            properties: { regex: /^_/ },
          },
        }),
      ],
    },
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1024,
    sourcemap: false,
    assetsInlineLimit: 10240,
    emptyOutDir: true,
  },
  preview: {
    port: 8080,
    strictPort: true,
    https: true,
    open: true,
  },
  optimizeDeps: {
    include: ['lodash'],
  },
});