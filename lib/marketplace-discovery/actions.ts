"use server";

import { getSituationProducts } from "./queries";

export async function loadSituationProductsAction(situationId: string) {
  return getSituationProducts(situationId);
}
