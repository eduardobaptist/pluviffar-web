import { api, ApiError } from "./client"
import type {
  Bucket,
  ChangePasswordRequest,
  ConfigReport,
  CreateGatewayRequest,
  CreateStationRequest,
  CreateUserRequest,
  CurrentUser,
  DeviceStatus,
  Gateway,
  LoginRequest,
  PageParams,
  PageResponse,
  PeriodParams,
  PrecipitationSeries,
  PublicStationDetail,
  PublicStationSummary,
  Reading,
  Role,
  Station,
  StationOverview,
  UpdateGatewayRequest,
  UpdateStationRequest,
  UpdateUserRequest,
  User,
} from "./types"

export const DEFAULT_TIMEZONE = "America/Sao_Paulo"

// ---------------------------------------------------------------- Autenticação

export const authApi = {
  /** `null` quando não há sessão (401). */
  me: async (): Promise<CurrentUser | null> => {
    try {
      return await api<CurrentUser>("/api/auth/me")
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null
      throw e
    }
  },
  login: (body: LoginRequest) => api<CurrentUser>("/api/auth/login", { method: "POST", body }),
  logout: () => api<void>("/api/auth/logout", { method: "POST" }),
  changePassword: (body: ChangePasswordRequest) => api<void>("/api/auth/password", { method: "PUT", body }),
}

// ---------------------------------------------------------------- Usuários (ADMIN)

export interface UserFilters extends PageParams {
  search?: string
  role?: Role
  active?: boolean
}

export const usersApi = {
  list: (q: UserFilters) => api<PageResponse<User>>("/api/users", { query: { ...q } }),
  get: (id: string) => api<User>(`/api/users/${id}`),
  create: (body: CreateUserRequest) => api<User>("/api/users", { method: "POST", body }),
  update: (id: string, body: UpdateUserRequest) => api<User>(`/api/users/${id}`, { method: "PUT", body }),
  resetPassword: (id: string, newPassword: string) =>
    api<void>(`/api/users/${id}/password`, { method: "PUT", body: { newPassword } }),
  setStatus: (id: string, active: boolean) =>
    api<User>(`/api/users/${id}/status`, { method: "PATCH", body: { active } }),
}

// ---------------------------------------------------------------- Gateways

export interface GatewayFilters extends PageParams {
  ownerId?: string
  search?: string
  includeDeleted?: boolean
}

export const gatewaysApi = {
  list: (q: GatewayFilters) => api<PageResponse<Gateway>>("/api/gateways", { query: { ...q } }),
  get: (id: string) => api<Gateway>(`/api/gateways/${id}`),
  create: (body: CreateGatewayRequest) => api<Gateway>("/api/gateways", { method: "POST", body }),
  update: (id: string, body: UpdateGatewayRequest) => api<Gateway>(`/api/gateways/${id}`, { method: "PUT", body }),
  remove: (id: string) => api<void>(`/api/gateways/${id}`, { method: "DELETE" }),
}

// ---------------------------------------------------------------- Estações

export interface StationFilters extends PageParams {
  gatewayId?: string
  ownerId?: string
  isPublic?: boolean
  search?: string
  includeDeleted?: boolean
}

export interface SeriesParams extends PeriodParams {
  bucket?: Bucket
  timezone?: string
}

export const stationsApi = {
  list: (q: StationFilters, signal?: AbortSignal) =>
    api<PageResponse<Station>>("/api/stations", { query: { ...q }, ...(signal ? { signal } : {}) }),
  /** Todas as páginas (size=100), até `maxPages` — a API não tem lookup sem limite (ver "Falta na API"). */
  listAll: async (q: Omit<StationFilters, "page" | "size">, signal?: AbortSignal, maxPages = 10): Promise<Station[]> => {
    const out: Station[] = []
    for (let page = 0; page < maxPages; page++) {
      const r = await stationsApi.list({ ...q, page, size: 100 }, signal)
      out.push(...r.content)
      if (page + 1 >= r.totalPages) break
    }
    return out
  },
  /** Marca como favorita do usuário logado (substitui a anterior). */
  markFavorite: (id: string) => api<void>(`/api/stations/${id}/favorite`, { method: "PUT" }),
  unmarkFavorite: (id: string) => api<void>(`/api/stations/${id}/favorite`, { method: "DELETE" }),
  get: (id: string) => api<Station>(`/api/stations/${id}`),
  create: (body: CreateStationRequest) => api<Station>("/api/stations", { method: "POST", body }),
  update: (id: string, body: UpdateStationRequest) => api<Station>(`/api/stations/${id}`, { method: "PUT", body }),
  remove: (id: string) => api<void>(`/api/stations/${id}`, { method: "DELETE" }),
  overview: (id: string, timezone = DEFAULT_TIMEZONE, signal?: AbortSignal) =>
    api<StationOverview>(`/api/stations/${id}/overview`, { query: { timezone }, ...(signal ? { signal } : {}) }),
  precipitation: (id: string, p: SeriesParams, signal?: AbortSignal) =>
    api<PrecipitationSeries>(`/api/stations/${id}/precipitation`, {
      query: { timezone: DEFAULT_TIMEZONE, ...p },
      ...(signal ? { signal } : {}),
    }),
  readings: (id: string, p: PeriodParams & PageParams, signal?: AbortSignal) =>
    api<PageResponse<Reading>>(`/api/stations/${id}/readings`, { query: { ...p }, ...(signal ? { signal } : {}) }),
  status: (id: string, p: PeriodParams & PageParams, signal?: AbortSignal) =>
    api<PageResponse<DeviceStatus>>(`/api/stations/${id}/status`, { query: { ...p }, ...(signal ? { signal } : {}) }),
  configReports: (id: string, p: PageParams) =>
    api<PageResponse<ConfigReport>>(`/api/stations/${id}/config-reports`, { query: { ...p } }),
}

// ---------------------------------------------------------------- Área pública

export const publicApi = {
  list: () => api<PublicStationSummary[]>("/api/public/stations"),
  get: (id: string, timezone = DEFAULT_TIMEZONE) =>
    api<PublicStationDetail>(`/api/public/stations/${id}`, { query: { timezone } }),
  precipitation: (id: string, p: SeriesParams, signal?: AbortSignal) =>
    api<PrecipitationSeries>(`/api/public/stations/${id}/precipitation`, {
      query: { timezone: DEFAULT_TIMEZONE, ...p },
      ...(signal ? { signal } : {}),
    }),
}
