import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { runFullCalibrationLab } from "../lib/marketplace-ranking-intelligence/calibration-100";

const outDir = join(process.cwd(), "artifacts/ranking-lab");
const reportsDir = join(outDir, "product-reports");

mkdirSync(reportsDir, { recursive: true });

const lab = runFullCalibrationLab();

writeFileSync(join(outDir, "100-products.json"), JSON.stringify(lab.products, null, 2));
writeFileSync(join(outDir, "dataset-audit.json"), JSON.stringify(lab.datasetAudit, null, 2));
writeFileSync(
  join(outDir, "experiment-results.json"),
  JSON.stringify(
    {
      seed: lab.seed,
      datasetVersion: lab.datasetVersion,
      algorithmVersion: lab.algorithmVersion,
      experimentCount: lab.experimentCount,
      experiments: lab.experiments,
      top10: lab.top10,
      position11Gap: lab.position11Gap,
      simulationError: lab.simulationError,
      statisticalFactors: lab.statisticalFactors,
      qualityChecks: lab.qualityChecks,
    },
    null,
    2,
  ),
);
writeFileSync(join(outDir, "factor-influence.json"), JSON.stringify(lab.influences, null, 2));

lab.productReports.forEach((report) => {
  writeFileSync(
    join(reportsDir, `${report.productId.replace(/[^a-zA-Z0-9-]/g, "_")}.json`),
    JSON.stringify(report, null, 2),
  );
});

console.log(`Wrote ${lab.productCount} products to ${outDir}`);
console.log(`Experiments: ${lab.experimentCount}`);
console.log(`Quality checks:`, lab.qualityChecks);
