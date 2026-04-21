#!/bin/bash
# E2E isolation test: 2 prospects, verify user_id separation end-to-end.
# Exits 1 on any failure with a red CROSS; exits 0 with all checks green.
set -u
FAIL=0
PASS=0
BASE=http://127.0.0.1:8000
CA=/tmp/test_cookie_A.txt
CB=/tmp/test_cookie_B.txt
: > "$CA"
: > "$CB"

check() {
  local name="$1" cond="$2"
  if eval "$cond" > /dev/null 2>&1; then
    echo "  ✓ $name"
    PASS=$((PASS+1))
  else
    echo "  ✗ $name"
    echo "     cond: $cond"
    FAIL=$((FAIL+1))
  fi
}

cd /Users/thibaud/Desktop/TE-main/backend

echo "▶ Creating 2 prospect tokens…"
OUT_A=$(.venv/bin/python -m scripts.seed_prospects create --name "Alice Isolation" --email alice@iso.test --company "SARL Alice" --days 14 2>&1)
OUT_B=$(.venv/bin/python -m scripts.seed_prospects create --name "Bob Isolation"   --email bob@iso.test   --company "SARL Bob"   --days 14 2>&1)
TOK_A=$(echo "$OUT_A" | sed -nE 's/^.*Token.*: //p' | tail -1)
TOK_B=$(echo "$OUT_B" | sed -nE 's/^.*Token.*: //p' | tail -1)
echo "  Token A: $TOK_A"
echo "  Token B: $TOK_B"

echo ""
echo "▶ Activating sessions (must 302 /welcome + Set-Cookie)…"
SC_A=$(curl -si -c "$CA" "$BASE/app/$TOK_A" | head -1 | tr -d '\r')
SC_B=$(curl -si -c "$CB" "$BASE/app/$TOK_B" | head -1 | tr -d '\r')
check "A activation 302"       "[[ '$SC_A' == *'302'* ]]"
check "B activation 302"       "[[ '$SC_B' == *'302'* ]]"
check "A cookie stored"        "grep -q session_token '$CA'"
check "B cookie stored"        "grep -q session_token '$CB'"

echo ""
echo "▶ /api/auth/me separation…"
ME_A=$(curl -sb "$CA" $BASE/api/auth/me)
ME_B=$(curl -sb "$CB" $BASE/api/auth/me)
check "A sees Alice"           "echo '$ME_A' | grep -q 'Alice Isolation'"
check "B sees Bob"             "echo '$ME_B' | grep -q 'Bob Isolation'"
check "A doesn't see Bob"      "! echo '$ME_A' | grep -q 'Bob Isolation'"
check "B doesn't see Alice"    "! echo '$ME_B' | grep -q 'Alice Isolation'"
check "no session_token in me" "! echo \"\$ME_A\" | grep -q '\"session_token\"'"

echo ""
echo "▶ Employees CRUD separation…"
POST_A=$(curl -sb "$CA" -H 'Content-Type: application/json' -d '{"name":"Alice Worker","hours_per_week":35}' $BASE/api/employees)
POST_B=$(curl -sb "$CB" -H 'Content-Type: application/json' -d '{"name":"Bob Worker","hours_per_week":35}' $BASE/api/employees)
ID_A=$(echo "$POST_A" | python3 -c "import json,sys; print(json.load(sys.stdin).get('id',''))")
ID_B=$(echo "$POST_B" | python3 -c "import json,sys; print(json.load(sys.stdin).get('id',''))")
echo "  A employee id=$ID_A  B employee id=$ID_B"
LIST_A=$(curl -sb "$CA" $BASE/api/employees)
LIST_B=$(curl -sb "$CB" $BASE/api/employees)
check "A list has Alice Worker"    "echo '$LIST_A' | grep -q 'Alice Worker'"
check "B list has Bob Worker"      "echo '$LIST_B' | grep -q 'Bob Worker'"
check "A does NOT see Bob Worker"  "! echo '$LIST_A' | grep -q 'Bob Worker'"
check "B does NOT see Alice Worker" "! echo '$LIST_B' | grep -q 'Alice Worker'"

echo ""
echo "▶ Cross-tenant probe (B tries to read A's employee)…"
PROBE=$(curl -sb "$CB" -w '%{http_code}' -o /dev/null $BASE/api/employees/$ID_A)
check "B GET A's employee → 404"   "[[ '$PROBE' == '404' ]]"
PROBE_PUT=$(curl -sb "$CB" -X PUT -H 'Content-Type: application/json' -d '{"name":"HACKED"}' -w '%{http_code}' -o /dev/null $BASE/api/employees/$ID_A)
check "B PUT A's employee → 404"   "[[ '$PROBE_PUT' == '404' ]]"
PROBE_DEL=$(curl -sb "$CB" -X DELETE -w '%{http_code}' -o /dev/null $BASE/api/employees/$ID_A)
check "B DELETE A's employee → 404" "[[ '$PROBE_DEL' == '404' ]]"

# Verify Alice still intact afterwards
LIST_A_AFTER=$(curl -sb "$CA" $BASE/api/employees)
check "A's employee survived probes" "echo '$LIST_A_AFTER' | grep -q 'Alice Worker'"

echo ""
echo "▶ Unauthenticated probe…"
UNAUTH=$(curl -s -w '%{http_code}' -o /dev/null $BASE/api/employees)
check "GET employees without cookie → 401" "[[ '$UNAUTH' == '401' ]]"
FAKE=$(curl -s -b 'session_token=fake' -w '%{http_code}' -o /dev/null $BASE/api/employees)
check "GET employees with fake cookie → 401" "[[ '$FAKE' == '401' ]]"

echo ""
echo "▶ RGPD export…"
EXP_A=$(curl -sb "$CA" $BASE/api/my-data/export)
check "Export A contains Alice Worker"       "echo '$EXP_A' | grep -q 'Alice Worker'"
check "Export A does NOT contain Bob Worker" "! echo '$EXP_A' | grep -q 'Bob Worker'"

echo ""
echo "▶ Cross-tenant attempt on automations…"
AUTO_A=$(curl -sb "$CA" -H 'Content-Type: application/json' -d '{"name":"auto-A","trigger_type":"cron","trigger_config":{"hour":8,"minute":0},"actions":[]}' $BASE/api/automations)
ID_AUTO_A=$(echo "$AUTO_A" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('id',''))")
PROBE_AUTO=$(curl -sb "$CB" -w '%{http_code}' -o /dev/null "$BASE/api/automations/$ID_AUTO_A")
check "B GET A's automation → 404"  "[[ '$PROBE_AUTO' == '404' ]]"
B_AUTO_LIST=$(curl -sb "$CB" $BASE/api/automations)
check "B's automation list is empty" "[[ '$B_AUTO_LIST' == '[]' ]]"

echo ""
echo "======================================================================"
echo "PASS: $PASS    FAIL: $FAIL"
echo "======================================================================"
exit $FAIL
