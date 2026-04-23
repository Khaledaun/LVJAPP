#!/usr/bin/env bash
# LVJ AssistantApp · preflight
#
# Single-command driver for the "am I allowed to deploy / merge?"
# checklist. Adapted from the KhaledAunSite digest
# (docs/xrepo/khaledaunsite/03-operations-and-deployment.md §Preflight
# script) to the subset of checks LVJ's toolchain actually runs today —
# npm, not pnpm; no direct Supabase/psql call until D-025 connects the
# pooler; audits instead of policy checks for cross-tenant / auth
# invariants.
#
# Grouped into PREFLIGHT (required; exit 1 on any failure) and SOFT
# (informational; print PASS/FAIL but don't gate). Re-shuffle as
# post-0.7 items land: when Supabase connects, move the psql reachability
# check into PREFLIGHT; when Issue #11 risky-half lands, move tsc /
# lint / test / build.
#
# Usage:
#   scripts/preflight.sh
#   scripts/preflight.sh --skip-install    # if deps are already fresh
#   scripts/preflight.sh --json            # machine-readable summary
#
# Exit 0 = ok to deploy, 1 = blocked.

set -uo pipefail

# Pinned working directory — script lives in AssistantAPP-main/scripts,
# checks expect cwd = AssistantAPP-main.
cd "$(dirname "$0")/.."

FLAG_SKIP_INSTALL=0
FLAG_JSON=0
for arg in "$@"; do
  case "$arg" in
    --skip-install) FLAG_SKIP_INSTALL=1 ;;
    --json) FLAG_JSON=1 ;;
    -h|--help)
      echo "Usage: scripts/preflight.sh [--skip-install] [--json]"
      exit 0
      ;;
    *)
      echo "preflight: unknown flag '$arg'" >&2
      exit 2
      ;;
  esac
done

# ---------- reporting helpers ----------

PREFLIGHT_FAILS=0
SOFT_FAILS=0
RESULTS_JSON="["

add_result() {
  local tier="$1"   # required|soft
  local name="$2"
  local status="$3" # pass|fail|skip
  local detail="${4:-}"
  if [[ "$FLAG_JSON" -eq 0 ]]; then
    local icon="·"
    case "$status" in
      pass) icon="PASS" ;;
      fail) icon="FAIL" ;;
      skip) icon="SKIP" ;;
    esac
    printf '  [%s · %-4s] %s' "$tier" "$icon" "$name"
    if [[ -n "$detail" ]]; then printf '  — %s' "$detail"; fi
    printf '\n'
  fi
  if [[ "$status" == "fail" ]]; then
    if [[ "$tier" == "required" ]]; then
      PREFLIGHT_FAILS=$((PREFLIGHT_FAILS+1))
    else
      SOFT_FAILS=$((SOFT_FAILS+1))
    fi
  fi
  # Escape detail for JSON (minimal: backslash + double-quote).
  local esc_detail
  esc_detail="${detail//\\/\\\\}"
  esc_detail="${esc_detail//\"/\\\"}"
  RESULTS_JSON+="{\"tier\":\"$tier\",\"name\":\"$name\",\"status\":\"$status\",\"detail\":\"$esc_detail\"},"
}

run_required() {
  local name="$1"; shift
  if "$@" >/tmp/preflight.out 2>&1; then
    add_result required "$name" pass
  else
    local detail
    detail="$(tail -n 1 /tmp/preflight.out 2>/dev/null || true)"
    add_result required "$name" fail "$detail"
  fi
}

run_soft() {
  local name="$1"; shift
  if "$@" >/tmp/preflight.out 2>&1; then
    add_result soft "$name" pass
  else
    local detail
    detail="$(tail -n 1 /tmp/preflight.out 2>/dev/null || true)"
    add_result soft "$name" fail "$detail"
  fi
}

have() { command -v "$1" >/dev/null 2>&1; }

# ---------- header ----------

if [[ "$FLAG_JSON" -eq 0 ]]; then
  echo 'LVJ preflight · post-0.7 cleanup edition'
  echo 'See docs/xrepo/khaledaunsite/03-operations-and-deployment.md for the canonical 14-check list.'
  echo
fi

# ---------- PREFLIGHT (required) ----------

# 1. Required CLIs present.
have_node() { have node; }
have_npm() { have npm; }
run_required 'node present' have_node
run_required 'npm present'  have_npm

# 2. `.env.local` exists (or SKIP_DB/SKIP_AUTH is set for dev loops).
check_env_file() {
  if [[ -n "${SKIP_DB:-}" || -n "${SKIP_AUTH:-}" ]]; then return 0; fi
  if [[ -f .env.local ]]; then return 0; fi
  echo "no .env.local and SKIP_DB/SKIP_AUTH unset" >&2
  return 1
}
run_required '.env.local parseable or SKIP_* set' check_env_file

# 3. Install.
install_deps() {
  if [[ "$FLAG_SKIP_INSTALL" -eq 1 ]]; then
    echo "skipped (--skip-install)"
    return 0
  fi
  npm ci --silent
}
run_required 'npm ci' install_deps

# 4. Audits — the gates CI treats as required.
run_required 'A-002 · auth-on-every-route'      npm run -s audit:auth
run_required 'A-005 · dynamic-route (D-025 §4)' npm run -s audit:dynamic
run_required 'A-003 · tenant-isolation (D-023)' npm run -s audit:tenant

# 5. Jurisdiction audit is informational in CI but gated locally so
#    drift shows up before the PR lands.
run_required 'A-004 · jurisdiction sweep' npm run -s audit:jurisdiction

# 6. Git state — clean tree, on a feature branch, not on main.
check_git_clean() {
  if [[ -z "$(git status --porcelain 2>/dev/null)" ]]; then return 0; fi
  git status --short >&2
  return 1
}
check_git_branch() {
  local br
  br="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
  if [[ "$br" == "main" || "$br" == "master" ]]; then
    echo "on $br — preflight gates a feature branch" >&2
    return 1
  fi
  return 0
}
run_required 'git tree clean'          check_git_clean
run_required 'not on main/master'      check_git_branch

# ---------- SOFT (informational) ----------

# 7. Prisma additive audit — only meaningful vs origin/main (needs network).
prisma_soft() {
  if ! git rev-parse origin/main >/dev/null 2>&1; then
    echo "origin/main not fetched — run \`git fetch origin main\`"
    return 1
  fi
  npm run -s audit:prisma -- --base origin/main --head HEAD
}
run_soft 'C-004 · prisma additive-only (needs origin/main)' prisma_soft

# 8. Doc-discipline — same origin/main dependency.
docs_soft() {
  if ! git rev-parse origin/main >/dev/null 2>&1; then
    echo "origin/main not fetched"
    return 1
  fi
  npm run -s audit:docs -- --base origin/main --head HEAD
}
run_soft 'A-010 · doc-discipline (needs origin/main)' docs_soft

# 9. Typecheck / lint / tests / build — Issue #11 legacy-checks live here
#    until they go required. Kept soft so preflight stays green on
#    `main` today.
run_soft 'tsc --noEmit (Issue #11 legacy-check)' npx tsc --noEmit
run_soft 'eslint'                                npm run -s lint
run_soft 'jest unit tests'                       npm test -- --ci --passWithNoTests --maxWorkers=2
run_soft 'next build (catches force-dynamic misses)' npm run -s build

# 10. DB reachability — deferred until D-025 connects Supabase.
#     Placeholder so the gap is visible in preflight output.
add_result soft 'db reachable via pooler (D-025, deferred)' skip 'waiting on Supabase-connect PR'
add_result soft 'db reachable via direct (D-025, deferred)' skip 'waiting on Supabase-connect PR'

# ---------- summary ----------

RESULTS_JSON="${RESULTS_JSON%,}]"
if [[ "$FLAG_JSON" -eq 1 ]]; then
  printf '{"ok":%s,"required_failed":%d,"soft_failed":%d,"results":%s}\n' \
    "$([[ $PREFLIGHT_FAILS -eq 0 ]] && echo true || echo false)" \
    "$PREFLIGHT_FAILS" "$SOFT_FAILS" "$RESULTS_JSON"
else
  echo
  if [[ "$PREFLIGHT_FAILS" -eq 0 ]]; then
    if [[ "$SOFT_FAILS" -eq 0 ]]; then
      echo 'preflight: OK — required + soft all green.'
    else
      echo "preflight: OK required; ${SOFT_FAILS} soft check(s) FAILED (non-gating)."
    fi
  else
    echo "preflight: BLOCKED — ${PREFLIGHT_FAILS} required check(s) FAILED."
  fi
fi

exit $([[ "$PREFLIGHT_FAILS" -eq 0 ]] && echo 0 || echo 1)
