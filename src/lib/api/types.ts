// Tipos espelhando components.schemas do docs/openapi.yml (PluvIFFar API v1).
// Mantenha em sincronia ao mudar o contrato.

export type Role = "ADMIN" | "PRODUCER"
export type Bucket = "HOUR" | "DAY" | "WEEK" | "MONTH"

export interface FieldError {
  field: string
  message: string
}

export interface ApiErrorBody {
  code: string
  message: string
  errors: FieldError[]
  traceId: string
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface PageParams {
  page?: number
  size?: number
  sort?: string
}

export interface CsrfTokenResponse {
  headerName: string
  token: string
}

export interface CurrentUser {
  id: string
  name: string
  email: string
  role: Role
  mustChangePassword: boolean
}

export interface User extends CurrentUser {
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface OwnerSummary {
  id: string
  name: string
  email: string
}

export interface GatewaySummary {
  id: string
  hardwareId: string
  name: string
}

export interface Gateway {
  id: string
  hardwareId: string
  name: string
  description?: string | null
  owner: OwnerSummary
  fwVersion?: string | null
  hwVersion?: string | null
  configReportedAt?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface Station {
  id: string
  hardwareId: string
  name: string
  description?: string | null
  latitude?: number | null
  longitude?: number | null
  isPublic: boolean
  /** Favorita do usuário logado (uma por usuário; o painel abre nela). */
  favorite: boolean
  gateway: GatewaySummary
  owner: OwnerSummary
  fwVersion?: string | null
  hwVersion?: string | null
  sendIntervalS?: number | null
  mmPerTip?: number | null
  configReportedAt?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface Reading {
  measuredAt: string
  receivedAt: string
  tipsPerMinute: number
  precipitationMm: number
  seq: number
}

export interface DeviceStatus {
  measuredAt: string
  receivedAt: string
  gatewayId: string
  batteryV?: number | null
  batteryPct?: number | null
  rssiGatewayDbm?: number | null
  rssiStationDbm?: number | null
  uptimeGatewayS?: number | null
  uptimeStationS?: number | null
}

export interface ConfigReport {
  reportedAt: string
  gatewayId: string
  fwGateway?: string | null
  hwGateway?: string | null
  fwStation?: string | null
  hwStation?: string | null
  sendIntervalS?: number | null
  mmPerTip?: number | null
}

export interface PrecipitationPoint {
  bucketStart: string
  precipitationMm: number
  readingsCount: number
}

export interface PrecipitationSeries {
  stationId: string
  bucket: Bucket
  timezone: string
  from: string
  to: string
  totalMm: number
  points: PrecipitationPoint[]
}

export interface PrecipitationTotals {
  todayMm: number
  last24hMm: number
  last7dMm: number
  last30dMm: number
}

export interface StationOverview {
  stationId: string
  timezone: string
  lastReading?: Reading | null
  lastStatus?: DeviceStatus | null
  precipitation: PrecipitationTotals
}

export interface PublicStationSummary {
  id: string
  name: string
  latitude: number
  longitude: number
  lastReadingAt?: string | null
  last24hMm: number
}

export interface PublicStationDetail {
  id: string
  name: string
  latitude: number
  longitude: number
  lastReadingAt?: string | null
  timezone: string
  precipitation: PrecipitationTotals
}

// ---- Requests ----

export interface LoginRequest {
  email: string
  password: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface CreateUserRequest {
  name: string
  email: string
  role: Role
  password: string
}

export interface UpdateUserRequest {
  name: string
  email: string
  role: Role
}

export interface CreateGatewayRequest {
  hardwareId: string
  name: string
  description?: string
  ownerId?: string
}

export interface UpdateGatewayRequest {
  name: string
  description?: string
  ownerId?: string
}

export interface StationWriteFields {
  gatewayId: string
  name: string
  description?: string
  latitude?: number
  longitude?: number
  isPublic?: boolean
}

export interface CreateStationRequest extends StationWriteFields {
  hardwareId: string
}

export type UpdateStationRequest = StationWriteFields

export interface PeriodParams {
  from?: string
  to?: string
}
