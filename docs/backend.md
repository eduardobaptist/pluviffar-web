# Backend do PluvIFFar — o que o front precisa saber

Contrato oficial: [`openapi.yml`](./openapi.yml), cópia do `docs/openapi.yaml` do repositório da API.
Este arquivo resume as regras de negócio e o funcionamento por trás do contrato. Ele foi destilado das
notas do projeto da API (Spring), que ficam naquele repositório.

## Sincronizar o contrato

- Na API, `./mvnw test` regenera `docs/openapi.yaml` (teste `OpenApiSpecExportTest`).
- Quando endpoints ou DTOs mudarem, copie o arquivo para `docs/openapi.yml` aqui e ajuste
  `src/lib/api/types.ts` (tipos à mão, espelhando `components.schemas`), `src/lib/api/endpoints.ts`
  e `src/lib/schemas.ts` (limites de validação).
- Em dev, com a API rodando: Swagger em `http://localhost:8080/swagger-ui.html`, spec em `/v3/api-docs.yaml`.
  Em produção o Swagger fica desligado.
- O `servers` do spec traz uma porta aleatória (gerado em teste). A porta real da API em dev é **8080**.

## O projeto

Sistema de monitoramento pluviométrico para produtores rurais do Instituto Federal Farroupilha (IFFar),
dividido em 4 TCCs: (1) dispositivo IoT, (2) plataforma web/UX, (3) backend e arquitetura (Eduardo,
orientação Prof. Dr. Everton Lutz; maio–nov/2026), (4) análise de dados e predição.

```
Pluviômetro ──ESP-NOW──▶ Gateway (Wi-Fi do produtor)
                              │ MQTT  pluviffar/{gateway_id}/{dados|conf|status}
                              ▼
                 Mosquitto (VPS) ──▶ Worker ──▶ PostgreSQL 18 + TimescaleDB (edição Apache)
                                                         ▲
                                         API Spring Boot ┘  ◀── este front (SPA)
```

- **A API não assina o MQTT.** Quem grava telemetria é o worker. A API só cadastra entidades e lê os dados.
- Stack da API: Spring Boot 4, Java 21, Spring Security 7, Spring Session JDBC, Flyway, springdoc.
- Infra: VPS própria, domínio `pluviffar.com.br`, Apache na porta 80. O deploy da API (proxy reverso, TLS,
  domínios definitivos) ainda não foi definido. Ver "Deploy" no `CLAUDE.md` para os requisitos do front
  (mesma origem por causa do cookie CSRF).

## Domínio

- **Gateway**: ESP8266 que recebe dos pluviômetros e publica no broker. É identificado pelo `gateway_id` do tópico
  (ex.: `gt-570db4`). Um gateway tem N estações.
- **Estação** (`station`) = **pluviômetro**. É identificada pelo chip ID (`id` no payload, ex.: `580db2`).
- **Usuário** com perfil `ADMIN` ou `PRODUCER`. Uma entidade só, diferenciada por autorização.
- **Cadastro só pela plataforma**: gateway e estação existem apenas se cadastrados pela API, informando o
  chip ID (`hardwareId`). Pacotes MQTT de equipamentos não cadastrados são ignorados pelo worker.
- `hardwareId`: normalizado para minúsculas, padrão `^[a-z0-9-]{1,32}$`, **imutável**, único entre os
  não excluídos, inclusive entre produtores diferentes (é o mesmo equipamento físico). Duplicado retorna
  409 `HARDWARE_ID_ALREADY_REGISTERED`.
- **Soft delete** (`deletedAt`): a exclusão libera o chip para novo cadastro. As leituras são mantidas,
  porque dado medido nunca se apaga. Uma estação excluída perde `isPublic`. Gateway com estação ativa não
  pode ser excluído (409 `GATEWAY_HAS_ACTIVE_STATIONS`).
- Localização da estação: latitude e longitude vêm juntas ou nenhuma (regra `locationComplete`). Estação
  pública exige localização (regra `publicWithLocation`).

## Perfis e posse

| Perfil | Pode |
| --- | --- |
| `ADMIN` | Superusuário. Gerencia usuários e vê/edita qualquer gateway, estação e dado. O primeiro ADMIN vem de seed no banco (e nasce com troca de senha obrigatória). |
| `PRODUCER` | CRUD completo dos **próprios** gateways e estações e acesso aos dados deles. Define se cada estação é pública. |

- Recurso de outro produtor responde **404** (não revela que existe).
- PRODUCER é sempre dono do que cadastra; mandar `ownerId` de outro produtor dá 403.
- ADMIN informa `ownerId` de um PRODUCER ativo (`OWNER_REQUIRED` / `INVALID_OWNER`) e pode **transferir**
  um gateway no PUT. O dono se propaga às estações, porque a estação sempre herda o dono do gateway.
- Só o ADMIN tem os filtros `ownerId` e `includeDeleted` nas listagens e vê excluídos no detalhe (sem editar).
  Para PRODUCER esses filtros são ignorados.

## Autenticação (sessão por cookie, sem JWT)

- Cookie `SESSION` (HttpOnly, SameSite=Lax, Secure fora de dev). As sessões ficam no Postgres e
  sobrevivem a restart. Expiram após **30 min de inatividade** (renovado a cada requisição). Não há "manter conectado".
- CSRF: cookie `XSRF-TOKEN` legível por JS, com token **cru** (sem máscara), reemitido em toda resposta.
  POST/PUT/PATCH/DELETE enviam o header `X-XSRF-TOKEN`. No login, o ID da sessão e o token são renovados.
- Endpoints `/api/auth`: `GET /csrf`, `POST /login` (devolve `CurrentUser` com `mustChangePassword`),
  `POST /logout` (idempotente, 204), `GET /me` (lê do banco, então nome e e-mail ficam sempre atuais),
  `PUT /password` (troca a própria senha).
- Login com credencial errada, e-mail inexistente **ou usuário desativado** recebe sempre a mesma mensagem,
  `INVALID_CREDENTIALS`.
- `mustChangePassword = true`: qualquer `/api/**` fora de `/api/auth/**` e `/api/public/**` responde
  403 `PASSWORD_CHANGE_REQUIRED`.
- Revogação de sessões: desativar o usuário, redefinir a senha (admin) ou trocar o perfil derruba **todas** as
  sessões dele. Trocar a própria senha derruba as **outras**, e a atual continua.
- CORS só existe se front e API estiverem em origens diferentes, via `PLUVIFFAR_CORS_ALLOWED_ORIGINS`
  (origens explícitas, com credenciais). Em dev, a origem liberada é `http://localhost:3000`.
- 401 e 403 nunca redirecionam: sempre corpo `ApiError` em JSON.

## Usuários (`/api/users`, somente ADMIN)

- Não há auto-cadastro. O ADMIN cria a conta com uma senha provisória, e o usuário troca no primeiro login.
- E-mail normalizado (trim + minúsculas) e único. Senha de 8 a 72 caracteres (limite do BCrypt).
- O ADMIN não pode mudar o próprio perfil nem se desativar (409, `CANNOT_CHANGE_OWN_ROLE` etc.).
- `sort` aceito só em `name`, `email`, `role`, `active`, `createdAt`, `updatedAt`.
- Recuperação de senha por e-mail ainda não existe; quem redefine é o ADMIN (`PUT /{id}/password`).

## Telemetria (`/api/stations/{id}/...`)

- `overview`: última leitura, último status e totais de hoje, 24 h, 7 dias e 30 dias.
- `precipitation`: série agregada com `bucket` = `HOUR | DAY | WEEK | MONTH`, com `readingsCount` por bucket.
- `readings` e `status`: dados brutos, paginados, do mais recente ao mais antigo. `config-reports`: histórico do `conf`.
- Períodos `[from, to)` em ISO-8601. `to` padrão = agora. Há limite por consulta: brutos e série HOUR até
  93 dias, DAY até ~1100 dias (ver o spec). Erros `INVALID_PERIOD` e `PERIOD_TOO_LONG`.
- `timezone` (IANA, padrão `America/Sao_Paulo`) alinha dia, semana, mês e "hoje".
- **Buckets sem leitura não aparecem na resposta** (o TimescaleDB Apache não tem `time_bucket_gapfill`).
  Sem dado ≠ chuva zero: o front completa as lacunas com `null` e estima a cobertura (ver "Cobertura
  temporal" no `CLAUDE.md`).
- O ADMIN lê também estações excluídas. O PRODUCER só lê as próprias ativas.

## Área pública (`/api/public/stations`)

- Sem login e sem sessão. `GET /` lista todas as estações públicas, sem paginação (para o mapa).
  `GET /{id}` traz os totais e `GET /{id}/precipitation` traz a série.
- Só estações com `isPublic` e não excluídas; o resto dá 404. Os DTOs públicos **nunca** trazem dono, chip ID,
  descrição, gateway ou intervalo de envio. Por isso a área pública não consegue estimar cobertura.

## Erros

Todo 4xx/5xx tem corpo `ApiError`: `code` (nome estável do enum `ErrorCode`; use no front), `message`
(pt-BR, pronta para exibir), `errors[]` (por campo, em `VALIDATION_ERROR`; regras de classe aparecem com
`field` = nome da regra, ex. `locationComplete`) e `traceId` (também no header `X-Trace-Id`).
Paginação: `page` começa em 0, `size` tem padrão 20 e máximo 100, `sort=campo,asc|desc`, e a resposta é `PageResponse`.

## Protocolo MQTT v1.0 (contexto dos dados)

Tópicos `pluviffar/{gateway_id}/{dados|conf|status}`. O `id` no payload é o chip da **estação**.

| Tópico | Payload | Vira na API |
| --- | --- | --- |
| `dados` | `id`, `tips_por_minuto`, `mm`, `timestamp` (epoch s, UTC), `seq` | `Reading` (`precipitationMm`, `tipsPerMinute`, `seq`, `measuredAt`, `receivedAt`) |
| `conf` | `id`, `vers_gt`, `vers_pl`, `hw_gt`, `hw_pl`, `tempo_envio` (s), `mm_tips` | `ConfigReport` e estado atual da estação (`fwVersion`, `hwVersion`, `sendIntervalS`, `mmPerTip`) |
| `status` | `id`, `vbat` (V), `bat` (%), `rssi_gt`, `rssi_pluv` (dBm), `uptime_gt_s`, `uptime_pluv_s`, `timestamp` | `DeviceStatus` |

- `seq` crescente por estação: lacunas indicam pacotes perdidos (o front calcula `pacotes_perdidos_antes`
  na exportação).
- `sendIntervalS` (de `tempo_envio`) é a base da estimativa de cobertura. Estação que nunca mandou `conf`
  tem `sendIntervalS` nulo, e aí a cobertura não é estimável.
- Uma versão futura do protocolo deve passar os campos para inglês. Por enquanto o worker recebe a v1.0.

## Pendências conhecidas no backend

Ver "Falta na API" no `CLAUDE.md` (o que o front precisa). Do lado da API: ajuste do worker ao novo
schema, deploy na VPS, rate limit na área pública, domínios/CORS definitivos e a forma como o TCC 4
consome os dados.
