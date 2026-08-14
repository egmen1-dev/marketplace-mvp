"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/features/auth";
import {
  addProductToUserCollection,
  createCreatorCollection,
  createUserCollection,
  listUserCollections,
} from "./creator";
import { generateShareCardForProduct, generateViralContent } from "./content-generator";
import {
  trackCollectionCreated,
  trackCollectionShared,
  trackContentShared,
  trackShareClicked,
} from "./analytics";
import type { ViralFormatId } from "./types";
import { ROUTES } from "@/lib/constants";

export async function generateShareCardAction(input: {
  productId: string;
  formatId?: ViralFormatId;
}) {
  return generateShareCardForProduct(input);
}

export async function generateViralContentAction(input: {
  productId: string;
  formatId: ViralFormatId;
}) {
  return generateViralContent(input);
}

export async function trackShareChannelAction(input: {
  productId: string;
  channel: string;
}) {
  trackShareClicked(input.productId, input.channel);
}

export async function trackContentSharedAction(productId: string) {
  trackContentShared(productId);
}

export async function listMyCollectionsAction() {
  const user = await getSessionUser();
  if (!user) return [];
  return listUserCollections(user.id);
}

export async function createMyCollectionAction(input: {
  title: string;
  description?: string;
}) {
  const user = await getSessionUser();
  if (!user) return null;
  const created = await createUserCollection({
    userId: user.id,
    title: input.title,
    description: input.description,
  });
  if (created) {
    trackCollectionCreated(created.id);
    revalidatePath(ROUTES.ACCOUNT_FINDS);
  }
  return created;
}

export async function addToMyCollectionAction(input: {
  collectionId: string;
  productId: string;
}) {
  const user = await getSessionUser();
  if (!user) return false;
  const ok = await addProductToUserCollection({
    userId: user.id,
    collectionId: input.collectionId,
    productId: input.productId,
  });
  if (ok) revalidatePath(ROUTES.ACCOUNT_FINDS);
  return ok;
}

export async function createCreatorCollectionAction(input: {
  title: string;
  description?: string;
  productIds: string[];
}) {
  const user = await getSessionUser();
  if (!user) return null;
  const created = await createCreatorCollection({
    userId: user.id,
    title: input.title,
    description: input.description,
    productIds: input.productIds,
  });
  if (created) {
    trackCollectionCreated(created.id);
    revalidatePath(ROUTES.ACCOUNT_FINDS);
  }
  return created;
}

export async function trackCollectionSharedAction(collectionId: string) {
  trackCollectionShared(collectionId);
}
