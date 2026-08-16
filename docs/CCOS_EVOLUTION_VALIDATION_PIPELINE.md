# CCOS Evolution Validation Pipeline

Stages (strict order):

1. STRUCTURAL_VALIDATION
2. REGRESSION_VALIDATION — `ccos-golden-benchmark-v1`
3. GRAPH_VALIDATION
4. TWIN_VALIDATION — multi-objective
5. SHADOW_VALIDATION — disagreement + critical blocker checks
6. RISK_VALIDATION
7. HUMAN_APPROVAL

API: `POST /api/admin/ccos/evolution/{candidateId}/validate`

Results cached by candidate fingerprint.
