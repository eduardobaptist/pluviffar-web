# CLAUDE.md — pluviffar-web

Front-end do **PluvIFFar** (rede pluviométrica do Instituto Federal Farroupilha), consumindo a API real
descrita em `docs/openapi.yml` (PluvIFFar API v1, Spring, sessão por cookie + CSRF).

## Documentação interna (`docs/`)

- `docs/openapi.yml` — **contrato da API** (fonte da verdade para endpoints, DTOs, limites e códigos de erro).
  Consulte-o antes de criar/alterar chamadas em `src/lib/api/`.
- `docs/backend.md` — como o backend funciona: domínio, perfis e posse, sessão/CSRF, regras de telemetria,
  área pública, protocolo MQTT e como sincronizar o contrato quando a API mudar.
- `docs/DESIGN.md` — tokens do design system (origem do `src/index.css`).

## Comandos

```sh
npm run dev        # Vite em :3000 (origem liberada no CORS da API), proxy /api → VITE_API_PROXY_TARGET (padrão http://localhost:8080, porta padrão do Spring; o `servers` do openapi.yml traz uma porta aleatória de geração)
npm run build      # tsc -b + vite build
npm run typecheck  # só tsc
npm run lint       # oxlint
npm test           # vitest (lógica pura: séries, cobertura, CSV/XLSX)
```

## Stack

- React 19, TypeScript 7 (`strict`), Vite 8, Tailwind CSS 4.
- **shadcn/ui** (estilo `radix-nova`, base Radix, ícones lucide). Componentes em `src/components/ui/`
  — gerados pelo CLI, **não edite à mão** salvo ajuste de design system (só `card.tsx` recebeu `shadow-card`).
  Adicione novos com `npx shadcn@latest add <nome>`.
- **React Router 7 no modo declarativo** (`<BrowserRouter>` + `<Routes>`): todas as rotas ficam em
  `src/App.tsx`; páginas em `src/pages/`, componentes reutilizáveis em `src/components/`. Cada página é
  carregada sob demanda (`React.lazy`).
- **Requisições**: `useFetch` (`src/hooks/use-fetch.ts`) — `useEffect` + `useState` + `AbortController`, **sem cache**
  (decisão consciente: simplicidade primeiro; cache/centralização ficam para depois). Enquanto `data` é
  `undefined`, a página mostra `Skeleton`. Depois de mutações, chame `reload()` (ou `setData()` com a resposta).
- **Search params** (filtros, página, aba) validados com Zod via `useZodSearch` (`src/hooks/use-zod-search.ts`);
  use `z.coerce.number()`/`z.stringbool()`, já que tudo na URL é string.
- **Formulários**: React Hook Form + Zod 4 + `@hookform/resolvers/zod`, com os componentes `Field*`
  do shadcn (padrão atual recomendado: `Controller` + `Field`/`FieldLabel`/`FieldError`).
  O helper `src/components/form/form-field.tsx` encapsula esse padrão.
- Gráficos: `chart` do shadcn (Recharts 3). Mapa: Leaflet + OpenStreetMap (carregado sob demanda).
- Datas/fusos: `date-fns` + `@date-fns/tz` (tudo alinhado em `America/Sao_Paulo`, igual à API).
- Exportação XLSX: `exceljs` (import dinâmico, só baixa ao exportar).
- Tema claro/escuro: `next-themes` (classe `.dark`).

## Regras do projeto

- **Nunca use Dialog para formulários.** Cadastro/edição são páginas próprias (`/novo`, `/:id`, `/:id/editar`)
  ou abas. `AlertDialog` só para confirmar ações destrutivas (`components/common/confirm-action.tsx`).
- Use o máximo de componentes prontos do shadcn (Card, Table, Field, InputGroup, Item, Empty, Tabs,
  ToggleGroup, Select, Sidebar, Pagination, Skeleton, Alert, Badge, Spinner, Progress…). Antes de criar
  um componente, veja se existe no shadcn.
- **Ausência de medição nunca é chuva zero.** Buckets sem leitura são `null` ("Sem dados"), totais de
  estação que nunca enviou mostram "Sem dados", e todo agregado exibe a **cobertura temporal** (ou o aviso
  de que não é estimável). Veja "Cobertura temporal" abaixo.
- Toda chamada HTTP passa por `src/lib/api/` (cliente + endpoints). Componentes não chamam `fetch`.
- Textos da UI em pt-BR. Mensagens de erro da API (`ApiError.message`) já vêm prontas em pt-BR — exiba-as.
- Tokens semânticos (`bg-primary`, `text-muted-foreground`, `bg-success`…) — nada de hex em componentes.

## Estrutura

```
src/
  main.tsx                  ThemeProvider, BrowserRouter, AuthProvider, Toaster
  App.tsx                   todas as rotas (<Routes>), lazy loading, ErrorBoundary, NotFound
  index.css                 design system (tokens do docs/DESIGN.md)
  lib/
    api/types.ts            tipos espelhando components.schemas do openapi.yml
    api/client.ts           fetch + cookies + CSRF + ApiError (+ retry em CSRF_TOKEN_INVALID)
    api/endpoints.ts        funções por recurso (authApi, usersApi, gatewaysApi, stationsApi, publicApi);
                            stationsApi.listAll pagina até 10×100, markFavorite/unmarkFavorite
    schemas.ts              schemas Zod dos formulários (limites do openapi)
    period.ts               períodos, buckets, completar lacunas, estimar cobertura, fatiar períodos
    rain-calendar.ts        escala de cores do calendário (faixas fixas de mm/dia) e agrupamento por mês
    export.ts               exportação CSV/XLSX (coleta paginada + geração do arquivo)
    format.ts               formatação pt-BR (mm, datas no fuso, idade, uptime, atualidade)
  hooks/                    use-auth (AuthProvider: me/login/logout/401 → /entrar), use-fetch, use-zod-search,
                            use-debounced
  components/
    ui/                     shadcn (gerado)
    routing/                guards (RequireAuth, RequireAdmin, RedirectIfAuthed), NotFound, ErrorBoundary
    layout/                 logo, theme-toggle, app-sidebar, auth-layout
    common/                 page-header, query-error, data-pagination, confirm-action,
                            status-badges (atualidade/cobertura), search-input, owner-select
    form/                   form-field, api-errors, form-root-error, *-form (estação, gateway,
                            usuário, troca de senha)
    station/                precipitation-chart, series-panel, period-controls, date-range-picker,
                            rain-totals (+ useTotalsCoverage; `featured`/`windows` no painel), rain-calendar, device-summary, telemetry-tables,
                            station-map, comparison, export-form,
                            station-tabs (abas Chuva/Leituras/Status/Configuração/Exportar, iguais no painel e no detalhe)
  pages/                    uma página por rota (ver mapa de rotas)
    public/                 PublicLayout, HomePage, MapPage, StationsPage, StationDetailPage, ComparisonPage, AboutPage
    auth/                   LoginPage, ChangePasswordPage
    app/                    AppLayout, DashboardPage (escolhe pelo perfil), ComparisonPage, ExportPage, ProfilePage,
                            dashboard/ (AdminDashboard, ProducerDashboard),
                            stations/ gateways/ users/ (ListPage, NewPage, DetailPage, EditPage)
```

## Mapa de rotas

| Rota | Acesso | Conteúdo | Endpoints |
| --- | --- | --- | --- |
| `/` | público | hero, KPIs, mapa, cards das estações públicas | `GET /api/public/stations` |
| `/mapa` | público | lista filtrável + mapa | idem |
| `/estacoes` | público | tabela de estações públicas | idem |
| `/estacoes/:id?tab=chuva\|exportar` | público | totais, série (hora/dia/semana/mês), mapa, **exportar série** | `GET /api/public/stations/{id}`, `/precipitation` |
| `/comparativo` | público | compara 2–5 estações públicas | `/api/public/stations/{id}/precipitation` |
| `/sobre` | público | estático | — |
| `/entrar?redirect=` | sem sessão | login | `GET /api/auth/csrf`, `POST /api/auth/login` |
| `/trocar-senha` | logado | troca obrigatória (`mustChangePassword`) | `PUT /api/auth/password` |
| `/painel` | ADMIN | painel da rede: cards de usuários e estações, acesso rápido, mapa com todas as estações (zoom ajustado aos pontos) | `/stations` (todas as páginas), `/users` |
| `/painel?station=&tab=` | PRODUCER | painel da estação: abre na **favorita** (★, marcar/desmarcar no painel), troca de estação no dropdown; mesmas abas do detalhe (`StationTabs`) | `/stations`, `PUT/DELETE /stations/{id}/favorite`, `/overview`, `/precipitation`, `/readings`, `/status`, `/config-reports` |
| `/minhas-estacoes` | idem | lista com filtros (busca, gateway, visibilidade; ADMIN: dono, excluídas) | `GET /api/stations` |
| `/minhas-estacoes/novo` | idem | cadastro | `POST /api/stations` |
| `/minhas-estacoes/:id?tab=…` | idem | cabeçalho (editar/excluir) + abas Chuva / Leituras / Status / Configuração / **Exportar** (`StationTabs`, iguais ao painel) | `/overview`, `/precipitation`, `/readings`, `/status`, `/config-reports` |
| `/minhas-estacoes/:id/editar` | idem | edição (chip ID imutável) | `PUT /api/stations/{id}` |
| `/gateways`, `/novo`, `/:id` | idem | lista, cadastro, detalhe+edição+estações vinculadas | `/api/gateways` (+ `?gatewayId=` em stations) |
| `/meu-comparativo` | idem | compara 2–5 estações (com cobertura) | `/precipitation` |
| `/exportar?station=` | idem | **exportação em lote** (várias estações) | ver Exportação |
| `/perfil` | idem | dados da conta + troca de senha | `PUT /api/auth/password` |
| `/usuarios`, `/novo`, `/:id` | **ADMIN** | lista/filtros, cadastro (senha provisória), edição, ativar/desativar, redefinir senha | `/api/users/**` |

Guardas de rota (componentes em `components/routing/guards.tsx`, usados no `App.tsx`): `<RequireAuth>`
envolve o layout logado (`/painel` e demais rotas privadas) — exige sessão (`GET /api/auth/me`, carregado uma vez pelo `AuthProvider`) e redireciona
para `/trocar-senha` se `mustChangePassword`; `<RequireAdmin>` envolve `/usuarios`; `<RedirectIfAuthed>`
manda quem já está logado de `/entrar` para o `?redirect=` (qualquer caminho interno, exceto `/entrar`) ou `/painel`. As guardas só
melhoram a navegação — quem protege os dados é a API. Search params (filtros, página, aba) são validados
com Zod e ficam na URL.

## Autenticação e CSRF (`src/lib/api/client.ts`)

1. `login` (do `useAuth`) chama `GET /api/auth/csrf` (cookie `XSRF-TOKEN`) e depois `POST /api/auth/login`.
2. Toda requisição usa `credentials: "include"`; métodos mutáveis enviam `X-XSRF-TOKEN` com o valor
   **atual** do cookie (renovado após o login). Se o cookie não existe, busca `/csrf` antes.
3. `403 CSRF_TOKEN_INVALID` → renova o token e repete a requisição uma vez.
4. `401` fora de `/api/auth/**` → listener (`onUnauthorized`, registrado no `AuthProvider`) limpa a sessão e
   navega para `/entrar?redirect=<rota>`.
5. API fora do ar (erro de rede ou 502/503/504 sem corpo `ApiError`, ex.: proxy sem backend) vira
   `ApiError` com código `API_UNAVAILABLE`; a tela de login abre mesmo assim, com aviso e "Tentar de novo".
6. `403 PASSWORD_CHANGE_REQUIRED` em qualquer requisição → `onPasswordChangeRequired` → `/trocar-senha`.
7. Logout: `POST /api/auth/logout`, limpa a sessão local e volta para `/`.

**Deploy:** o cookie `XSRF-TOKEN` precisa ser legível pelo JS do front ⇒ sirva front e API **na mesma
origem** (reverse proxy com `/api` → API e o resto → `dist/`, com fallback SPA para `index.html`).
Em dev isso é feito pelo proxy do Vite, que roda na porta **3000** (`strictPort`). O navegador
continua mandando `Origin: http://localhost:3000` e o Spring valida esse Origin contra
`PLUVIFFAR_CORS_ALLOWED_ORIGINS`; outra porta dá `403 Invalid CORS request` antes do login. Para usar
outra porta, defina `VITE_DEV_PORT` e inclua a origem nessa variável da API. Em produção, atrás do
nginx no mesmo domínio, mande `Host`/`X-Forwarded-*` corretos (e `server.forward-headers-strategy`
no Spring) para que a requisição seja tratada como mesma origem. `VITE_API_URL` só para cenários cross-origin (exige CORS com
credenciais no backend; o token do corpo de `/csrf` é usado como fallback).

## Erros da API

`ApiError` (`code`, `message`, `fieldErrors`, `traceId`). Em formulários, `applyApiErrors` coloca
`VALIDATION_ERROR` em cada campo, mapeia códigos de negócio para campos (ex.: `EMAIL_ALREADY_IN_USE` →
email, `HARDWARE_ID_ALREADY_REGISTERED` → chip ID, `CURRENT_PASSWORD_INCORRECT`, `INVALID_OWNER`,
`CANNOT_CHANGE_OWN_ROLE`) e regras de classe (`locationComplete` → latitude, `publicWithLocation` →
isPublic); o resto vai para `root.server` + toast com o `traceId`. Fora de formulários: `QueryError`.

## Cobertura temporal

A API omite buckets sem leitura e devolve `readingsCount` por bucket, mas **não** devolve cobertura.
O front (`lib/period.ts → buildSeriesTable`):
- gera todos os buckets do período no fuso (`@date-fns/tz`) e marca os ausentes como `mm: null`;
- estima `esperadas = duração do bucket (recortada ao período) ÷ sendIntervalS` da estação e
  `cobertura = recebidas ÷ esperadas` (máx. 100%);
- sem `sendIntervalS` (estação que nunca reportou `conf`, ou área pública) → cobertura `null` e o
  badge mostra "cobertura —" com explicação.
Totais do overview (hoje/24 h/7/30 dias; o painel do produtor mostra só hoje/7/30, em destaque, com o badge de
cobertura no lugar do aviso "acumulado parcial"): cobertura estimada por `useTotalsCoverage` com uma série
HOUR (24 h) e uma DAY (30 dias). Faixas do badge: ≥95% boa, ≥70% parcial, abaixo disso baixa.
No gráfico, bucket sem dado vira um traço cinza "Sem dados" na base — nunca uma barra de 0 mm.

## Calendário pluviométrico

O `SeriesPanel` (painel do produtor e aba Chuva dos detalhes, logado e público) tem as abas **Gráfico** e
**Calendário**, com o mesmo período. O "Agrupar por" é só do gráfico (`PeriodControls showBucket`); o calendário
pede sempre a série **DAY** (máx. `MAX_DAYS.DAY` = 1100 dias; acima disso mostra aviso). `components/station/rain-calendar.tsx`:
um bloco por mês (dom–sáb) com total do mês; cada dia colorido pela faixa de chuva (`lib/rain-calendar.ts →
RAIN_THRESHOLDS`, limites **fixos** em mm para a mesma cor valer entre estações/períodos; tokens `--rain-1…6` +
`-foreground` no `index.css`), 0 mm com borda neutra, "Sem dados" hachurado, ponto âmbar/vermelho para cobertura
< 95% / < 70%. Totais do mês somam só o medido (`null` se nada) e levam `*` quando parciais. Detalhe do dia numa
barra fixa (`sticky top-14`) por hover/foco/toque.

## Exportação CSV / XLSX (feature nova)

Onde: aba **Exportar** do detalhe da estação (logado e público) e página **/exportar** (várias
estações; link "Exportar" na lista de estações). Formulário `components/station/export-form.tsx`
(RHF + Zod, validação de período por conjunto/granularidade). Geração em `lib/export.ts`:

- **Conjuntos**: série agregada (HOUR/DAY/WEEK/MONTH, com leituras recebidas/esperadas, cobertura e
  situação `COMPLETO|PARCIAL|SEM_DADOS|COBERTURA_DESCONHECIDA`), leituras brutas (com
  `pacotes_perdidos_antes` calculado pelas lacunas de `seq`) e status (bateria, RSSI, uptime).
  A área pública só exporta a série agregada (endpoints `/api/public`).
- **Coleta**: período fatiado pelos limites da API (93 dias para readings/status e HOUR; 1100 para DAY);
  readings/status paginam com `size=100` e 4 requisições em paralelo, com barra de progresso e
  cancelamento (`AbortController`). Teto de 200 mil linhas por estação (`MAX_RAW_ROWS`); limites de
  período no form: 366 dias para leituras/status e série horária.
- **CSV**: tabela única com coluna `estacao`, UTF-8 com BOM; dialeto pt-BR (`;` e vírgula decimal) ou
  internacional (`,` e ponto). Datas em hora local do fuso, `yyyy-MM-dd HH:mm:ss`.
- **XLSX**: uma aba por estação (cabeçalho congelado, autofiltro, datas e números tipados) + aba
  **Sobre** (gerado em, conjunto, granularidade, período, fuso, estações e aviso sobre lacunas).
- Nome do arquivo: `pluviffar-<estacao|N-estacoes>-<conjunto>-<AAAAMMDD>-<AAAAMMDD>.<ext>`.

## Painel (`/painel`)

`DashboardPage` delega por perfil:
- **ADMIN** (`dashboard/AdminDashboard.tsx`): não mostra dados de uma estação. Cards-link de usuários e estações (mesmo
  estilo dos cards do produtor), card "Acesso rápido" (`Item` com links para cadastros, usuários,
  comparativo, exportação e mapa público) e mapa com todas as estações com coordenadas (`fitBounds`; popup com
  dono, gateway e visibilidade). Contagens de estações vêm de `stationsApi.listAll` (máx. 1000).
- **PRODUCER** (`dashboard/ProducerDashboard.tsx`): estação exibida = `?station=` → favorita (`favorite` de
  `StationResponse`) → primeira por nome. Estrela ao lado do nome marca/desmarca (`PUT`/`DELETE
  /api/stations/{id}/favorite`; uma por usuário, marcar substitui a anterior — o front atualiza a lista local
  e fixa `?station=` para a tela não pular). O dropdown só aparece com 2+ estações e mostra ★ na favorita.
  À direita do nome, Editar/Excluir (`components/station/station-actions.tsx`, os mesmos do detalhe; ao excluir,
  a estação sai da lista local e o painel volta para a favorita/primeira). Abaixo, o mesmo `StationTabs` do detalhe (aba em `?tab=`). Sem mapa na aba Chuva.

**`StationTabs`** (`components/station/station-tabs.tsx`, painel do produtor e `/minhas-estacoes/:id`): aba **Chuva**
com totais Hoje/7/30 dias (`RainTotals featured`), "Mais informações" (`Collapsible` recolhido com o
`DeviceSummary`; o gatilho já mostra a atualidade da última leitura) e `SeriesPanel` (gráfico de altura
`clamp(18rem, 45svh, 30rem)` / calendário); abas Leituras, Status, Configuração (config atual, localização,
histórico) e Exportar. O `overview` é buscado pela página (o cabeçalho também usa) e passado ao componente.

## Design system

Tokens do `docs/DESIGN.md` (tema "Supabase" do tweakcn) em `src/index.css`: canvas `#fcfcfc`, texto
`#161616`, primário verde-floresta `#0d623b` (igual no claro e no escuro), destrutivo `#c83316`, bordas `#dedede`,
`--radius: 0.5rem`, sombras suaves (`shadow-card`), paleta de gráficos verde→azul→roxo→âmbar→teal.
Tipografia: **Inter** em tudo (títulos, texto e chrome de UI — labels, botões, badges, menus,
cabeçalhos de tabela; uma família só, hierarquia por peso/tamanho), monospace do sistema (chip IDs).
Tokens extras do domínio: `--rain` (série de chuva), `--success`, `--warning` (+ `-foreground`).
Desvio consciente: `--muted-foreground` é `#5c5c5c` (o docs/DESIGN.md traz `#1f1f1f`, praticamente igual ao
texto, o que eliminaria a hierarquia). Em relação ao tema Supabase original, o primário claro deixou de ser o
menta `#71e1ac` (apagado no fundo branco, ~1,6:1) e passou a ser o mesmo `#0d623b` do escuro; o menta ficou só no `chart-1`. Verde só em CTA primário, item ativo e estados positivos.

## Falta na API

TODOs para o backend (o front já tem pontos de encaixe ou paliativos marcados):

- [ ] **Cobertura temporal nos agregados**: `expectedReadings`/`coveragePct` em `PrecipitationPoint`,
      `coveragePct` em `PrecipitationSeries` e por janela em `PrecipitationTotals`. Hoje o front estima com
      `sendIntervalS` e precisa de 2 requisições extras por estação para cobrir os totais.
- [ ] **Cobertura na área pública**: `PublicStationDetail`/`PublicStationSummary` não trazem cobertura nem
      intervalo de envio → a área pública não consegue mostrar cobertura (exibe "cobertura —").
      `last24hMm` deveria vir acompanhado de `last24hCoveragePct` (hoje "0 mm" e "sem dados" se confundem
      quando há leitura antiga; o front usa `lastReadingAt` para mostrar "Sem dados").
- [ ] **Exportação no servidor**: `GET /api/stations/{id}/export?dataset=series|readings|status&format=csv|xlsx&from&to&bucket`
      (streaming) e `GET /api/public/stations/{id}/export` (só série). Alternativa mínima: aumentar o `size`
      máximo de `/readings` e `/status` (100 → 5000). Com leitura por minuto, 93 dias = ~1340 requisições.
- [ ] **Última leitura/status na listagem de estações** (`lastReadingAt`, `lastStatusAt`, `batteryPct`,
      `last24hMm`) para mostrar atualidade na lista e no painel sem N chamadas a `/overview`.
- [ ] **Resumo da rede para o painel** (`GET /api/dashboard`): totais, estações sem comunicação há 24 h,
      bateria baixa, gateways sem mensagem.
- [ ] **Status por gateway** (última mensagem, RSSI Wi-Fi, uptime) — hoje só chega embutido no status da estação.
- [ ] **Busca/lookup sem limite de 100**: selects de produtor, gateway e estação (e comparativo/exportação)
      carregam no máximo 100 itens (`size` máx.). Precisa de `GET /api/users/lookup?role=PRODUCER&search=`
      e equivalentes, ou paginação por cursor.
- [ ] **Recuperação de senha / convite por e-mail** (hoje só o ADMIN redefine senha provisória).
- [ ] **Privacidade da localização pública**: modo "aproximada"/"só município" e município/UF da estação
      (hoje a API publica a coordenada exata).
- [ ] **Instalações e períodos de acesso**: transferir pluviômetro entre produtores preservando o acesso de
      cada um apenas ao próprio período (hoje transferir gateway/estação transfere todo o histórico).
- [ ] **Propriedades rurais** (cadastro e vínculo com estações).
- [ ] **Ocorrências/alertas** (sem comunicação, bateria baixa, mm/basculada divergente, pacotes de
      equipamentos não cadastrados) e **auditoria** de ações administrativas.
- [ ] **Calibração e manutenção**: mm/basculada aferido em laboratório × reportado, histórico de manutenções.
- [ ] **Configurações da plataforma** (ex.: cobertura mínima para o comparativo ser conclusivo).
- [ ] **Previsão do tempo / previsto × registrado** (serviço meteorológico no servidor).
- [ ] **Diagnóstico de ingestão MQTT** (últimos pacotes recebidos/rejeitados por tópico) para o ADMIN.
- [ ] Dados extras de usuário: telefone, último login.
- [ ] Documentar no OpenAPI o enum `ErrorCode` completo e o valor de `errors[].field` para regras de
      classe (`locationComplete`, `publicWithLocation`) — o front mapeia esses nomes por convenção.
- [ ] Confirmar se `/readings` e `/status` filtram por `measuredAt` ou `receivedAt` (o front assume `measuredAt`).
