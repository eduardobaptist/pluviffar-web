import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(import.meta.dirname, "./src") },
    },
    build: {
      // exceljs (~930 kB) é carregado sob demanda só ao exportar XLSX.
      chunkSizeWarningLimit: 1000,
    },
    server: {
      // Porta 3000 = origem liberada em PLUVIFFAR_CORS_ALLOWED_ORIGINS na API. O navegador envia
      // `Origin: http://localhost:3000`; se a porta mudar, o Spring responde 403 "Invalid CORS request".
      port: Number(env.VITE_DEV_PORT ?? 3000),
      strictPort: true,
      // Proxy same-origin para a API: o cookie XSRF-TOKEN precisa ser legível
      // por JS no mesmo domínio do front (sessão por cookie + CSRF).
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY_TARGET ?? "http://localhost:8080",
          changeOrigin: true,
        },
      },
    },
  }
})
