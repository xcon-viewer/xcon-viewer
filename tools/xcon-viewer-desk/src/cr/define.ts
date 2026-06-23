import type { CapabilityNode } from './types.js'

export function defineCapability<TArgs = unknown, TResult = unknown>(
  node: CapabilityNode<TArgs, TResult>
): CapabilityNode<TArgs, TResult> {
  return node
}
