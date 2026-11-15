# pluviffar-web

Front-end do PluvIFFar (monitoramento pluviométrico do IFFar): React 19 + TypeScript + Vite,
shadcn/ui, React Router (rotas declaradas em `src/App.tsx`, páginas em `src/pages/`), React Hook Form + Zod. Consome a API descrita em `docs/openapi.yml` (regras do backend em `docs/backend.md`).

```sh
cp .env.example .env   # ajuste VITE_API_PROXY_TARGET se a API não estiver em localhost:8080
npm install
npm run dev            # http://localhost:3000 (proxy /api → API)
npm run build          # typecheck + build em dist/
npm test               # testes unitários (vitest)
```

Documentação para agentes/devs: [CLAUDE.md](./CLAUDE.md).
