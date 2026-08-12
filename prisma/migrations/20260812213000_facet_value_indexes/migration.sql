-- Facet query performance (definition + value lookups)
CREATE INDEX IF NOT EXISTS "product_characteristic_values_definitionId_valueText_idx"
  ON "product_characteristic_values"("definitionId", "valueText");

CREATE INDEX IF NOT EXISTS "product_characteristic_values_definitionId_valueNumber_idx"
  ON "product_characteristic_values"("definitionId", "valueNumber");

CREATE INDEX IF NOT EXISTS "product_characteristic_values_definitionId_valueBoolean_idx"
  ON "product_characteristic_values"("definitionId", "valueBoolean");
