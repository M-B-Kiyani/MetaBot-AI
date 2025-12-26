import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: parseInt(process.env.WIDGET_PORT || '3002'),
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production',
    lib: {
      entry: path.resolve(__dirname, 'src/widget.tsx'),
      name: 'AIBookingWidget',
      fileName: (format) => `ai-booking-widget.${format}.js`,
      formats: ['umd', 'es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});
