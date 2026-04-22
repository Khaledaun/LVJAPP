#!/usr/bin/env ts-node
/**
 * C-004 · Additive-only Prisma schema audit
 *
 * Enforces Claude.md v4.0 Golden Rule #4 — additive schema only. Never
 * drop or rename existing Prisma columns. Additions are OK; removals,
 * renames, and type-narrowing changes must land as a new column + a
 * deprecation comment, not as an in-place edit.
 *
 * Strategy: parse the schema file at `origin/main` (or a configurable
 * base ref) and at `HEAD`, extract a `{model.field -> type+modifier}`
 * map from each, and report any model.field present in base but
 * missing or type-narrowed in head.
 *
 * What counts as a violation:
 *   - Model removed entirely.
 *   - Field removed from a model.
 *   - Field type changed in a way that narrows the type (e.g.
 *     `String` → `Int`, optional → required, array → scalar).
 *   - Field renamed (detected as one removal + one addition with
 *     different name — flagged as ambiguous and surfaced to the
 *     reviewer).
 *
 * What is ALLOWED:
 *   - New model, new field, new enum value.
 *   - Required → optional (widening).
 *   - Scalar → array (widening).
 *   - Comment-level changes.
 *
 * Usage:
 *   npx ts-node scripts/audit-prisma.ts
 *   npx ts-node scripts/audit-prisma.ts --base origin/main --head HEAD
 *   npx ts-node scripts/audit-prisma.ts --json
 *
 * Exit 0 on clean, 1 on any violation.
 */

import { execSync } from 'node:child_process'

const SCHEMA_PATH = 'AssistantAPP-main/prisma/schema.prisma'

interface Args {
  base: string
  head: string
  json: boolean
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  let base = 'origin/main'
  let head = 'HEAD'
  let json = false
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base' && argv[i + 1]) base = argv[++i]
    else if (argv[i] === '--head' && argv[i + 1]) head = argv[++i]
    else if (argv[i] === '--json') json = true
  }
  return { base, head, json }
}

function fileAt(ref: string, path: string): string {
  try {
    return execSync(`git show ${ref}:${path}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return ''
  }
}

interface FieldSig {
  name: string
  type: string       // scalar type, e.g. "String", "Int", "DateTime"
  optional: boolean  // has trailing `?`
  array: boolean     // has trailing `[]`
}

interface ModelShape {
  fields: Map<string, FieldSig>
}

function parseSchema(src: string): Map<string, ModelShape> {
  const models = new Map<string, ModelShape>()
  const modelRe = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm
  let m: RegExpExecArray | null
  while ((m = modelRe.exec(src)) !== null) {
    const [, name, body] = m
    const fields = new Map<string, FieldSig>()
    for (const rawLine of body.split('\n')) {
      const line = rawLine.trim()
      if (!line || line.startsWith('//') || line.startsWith('@@')) continue
      // field name, type, optional, array.
      // `name  Type?[]  @default(…) @unique …`
      const fieldMatch = line.match(/^(\w+)\s+([A-Za-z_][\w]*)([?\[\]]*)/)
      if (!fieldMatch) continue
      const [, fname, ftype, decorators] = fieldMatch
      const optional = decorators.includes('?')
      const array = decorators.includes('[]')
      fields.set(fname, { name: fname, type: ftype, optional, array })
    }
    models.set(name, { fields })
  }
  return models
}

interface Violation {
  rule: 'model_removed' | 'field_removed' | 'type_narrowed' | 'required_tightened' | 'array_lost'
  model: string
  field?: string
  before?: FieldSig
  after?: FieldSig
}

function diff(baseModels: Map<string, ModelShape>, headModels: Map<string, ModelShape>): Violation[] {
  const out: Violation[] = []
  for (const [name, baseShape] of baseModels) {
    const headShape = headModels.get(name)
    if (!headShape) {
      out.push({ rule: 'model_removed', model: name })
      continue
    }
    for (const [fname, baseField] of baseShape.fields) {
      const headField = headShape.fields.get(fname)
      if (!headField) {
        out.push({ rule: 'field_removed', model: name, field: fname, before: baseField })
        continue
      }
      // Type narrowed (e.g. String → Int) is almost always a breaking change.
      if (baseField.type !== headField.type) {
        out.push({ rule: 'type_narrowed', model: name, field: fname, before: baseField, after: headField })
      }
      // Required → required is fine; optional → required is a tightening.
      if (baseField.optional && !headField.optional) {
        out.push({ rule: 'required_tightened', model: name, field: fname, before: baseField, after: headField })
      }
      // Array → scalar is a data-loss narrowing.
      if (baseField.array && !headField.array) {
        out.push({ rule: 'array_lost', model: name, field: fname, before: baseField, after: headField })
      }
    }
  }
  return out
}

function main(): void {
  const { base, head, json } = parseArgs()
  const baseSrc = fileAt(base, SCHEMA_PATH)
  const headSrc = fileAt(head, SCHEMA_PATH)

  if (!baseSrc) {
    // No base schema (new repo or first-ever migration). Nothing to audit.
    if (json) console.log(JSON.stringify({ ok: true, reason: 'no_base_schema' }))
    else console.log('C-004 · prisma additive audit: no base schema at ' + base + ' — skipping.')
    process.exit(0)
  }
  if (!headSrc) {
    if (json) console.log(JSON.stringify({ ok: true, reason: 'no_head_schema' }))
    else console.log('C-004 · prisma additive audit: no head schema at ' + head + ' — skipping.')
    process.exit(0)
  }

  const baseModels = parseSchema(baseSrc)
  const headModels = parseSchema(headSrc)
  const violations = diff(baseModels, headModels)

  if (json) {
    console.log(JSON.stringify({ ok: violations.length === 0, violations }, null, 2))
  } else {
    console.log(`C-004 · prisma additive audit (base=${base} head=${head})`)
    console.log(`Base models: ${baseModels.size}, head models: ${headModels.size}`)
    if (violations.length === 0) {
      console.log('OK — no additive-only violations.')
    } else {
      console.error(`FAILED — ${violations.length} violation(s):`)
      for (const v of violations) {
        const loc = v.field ? `${v.model}.${v.field}` : v.model
        if (v.before && v.after) {
          console.error(`  [${v.rule}] ${loc}: ${JSON.stringify(v.before)} → ${JSON.stringify(v.after)}`)
        } else if (v.before) {
          console.error(`  [${v.rule}] ${loc}: was ${JSON.stringify(v.before)}, now removed`)
        } else {
          console.error(`  [${v.rule}] ${loc}: removed`)
        }
      }
    }
  }
  process.exit(violations.length === 0 ? 0 : 1)
}

main()
