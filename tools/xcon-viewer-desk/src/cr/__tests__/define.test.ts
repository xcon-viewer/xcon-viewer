import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { defineCapability } from '../define.js'

describe('defineCapability', () => {
  test('returns the same node object unchanged', () => {
    const node = defineCapability({
      path: 'xd.test.action',
      label: '테스트 액션',
      kind: 'method',
      permission: 'control',
      approval: 'never',
    })

    assert.equal(node.path, 'xd.test.action')
    assert.equal(node.label, '테스트 액션')
    assert.equal(node.kind, 'method')
    assert.equal(node.permission, 'control')
    assert.equal(node.approval, 'never')
    assert.equal(node.schema, undefined)
  })

  test('preserves schema when provided', () => {
    import('zod').then(({ z }) => {
      const ArgsSchema = z.object({ id: z.string() })
      const node = defineCapability({
        path: 'xd.test.withSchema',
        label: '스키마 포함',
        kind: 'method',
        permission: 'read',
        approval: 'never',
        schema: { args: ArgsSchema },
      })
      assert.ok(node.schema?.args)
    })
  })
})
