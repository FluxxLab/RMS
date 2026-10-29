/*
 * Dumps the test plan as JSON, so the workbook is generated from the same
 * source the tour uses rather than transcribed from it.
 *
 *   node --experimental-strip-types scripts/export-test-plan.ts > plan.json
 */
import { allTestSteps } from "../lib/testing/guide-content.ts";

process.stdout.write(JSON.stringify(allTestSteps(), null, 2));
