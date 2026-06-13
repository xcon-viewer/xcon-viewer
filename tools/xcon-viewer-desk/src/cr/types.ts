import type { ZodSchema } from 'zod'

export type CapabilityKind = 'group' | 'property' | 'method' | 'event' | 'collection'
export type CapabilityPermission = 'read' | 'control' | 'write' | 'execute' | 'danger'
export type CapabilityApproval = 'never' | 'when-external' | 'always'
export type CapabilitySource = 'internal' | 'mcp' | 'kouri' | 'workflow' | 'xenesis'

export interface CapabilityNode<TArgs = unknown, TResult = unknown> {
  path: string
  label: string
  kind: CapabilityKind
  permission: CapabilityPermission
  approval: CapabilityApproval
  schema?: {
    args?: ZodSchema<TArgs>
    result?: ZodSchema<TResult>
  }
}

export interface CapabilityCallContext {
  source: CapabilitySource
  requestId?: string
}

export type CapabilityHandler<TArgs = unknown, TResult = unknown> = (
  args: TArgs,
  ctx: CapabilityCallContext
) => Promise<TResult>

export interface CapabilityCallResult<TResult = unknown> {
  ok: boolean
  data?: TResult
  error?: string
  pendingApproval?: boolean
  approvalId?: string
}
