#!/bin/bash
# Test login + PATCH diretto su localhost:3000

echo "1. Login..."
RESP=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin@2024!"}')
echo "Risposta login: $RESP"

TOKEN=$(echo "$RESP" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("token","NO_TOKEN"))' 2>/dev/null)
echo "Token: ${TOKEN:0:40}..."

echo ""
echo "2. PATCH question 122..."
curl -s -X PATCH http://localhost:3000/api/v1/checklist/questions/122 \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"norm_excerpt":"TEST verifica API diretta"}'
echo ""

echo ""
echo "3. Verifica GET all..."
curl -s "http://localhost:3000/api/v1/checklist/questions/all?standard_id=2" \
  -H "Authorization: Bearer $TOKEN" | python3 -c '
import sys, json
d = json.load(sys.stdin)
qs = d.get("questions", [])
comp = [q for q in qs if q.get("norm_excerpt")]
print(f"Compilati: {len(comp)}/{len(qs)}")
for q in comp:
    print(f"  [{q[\"question_id\"]}] {q[\"question_text\"][:40]} -> {str(q[\"norm_excerpt\"])[:50]}")
'

echo ""
echo "4. Pulizia (reset question 122)..."
curl -s -X PATCH http://localhost:3000/api/v1/checklist/questions/122 \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"norm_excerpt":""}'
echo ""
echo "Done."
