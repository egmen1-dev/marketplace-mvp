/**
 * Demo visibility scenarios for MARKETPLACE-DEPLOY-VISIBILITY-AUDIT-001.
 *
 * Run after main seed:
 *   npx tsx prisma/seed-demo-visibility.ts
 */
import {
  PrismaClient,
  ProductCondition,
  ProductStatus,
  SellerKind,
  UserRole,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORD = "demo1234";

async function upsertSeller(input: {
  email: string;
  storeName: string;
  slug: string;
}) {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: { role: UserRole.SELLER, name: input.storeName },
    create: {
      email: input.email,
      name: input.storeName,
      role: UserRole.SELLER,
      passwordHash,
    },
  });

  const profile = await prisma.sellerProfile.upsert({
    where: { userId: user.id },
    update: { storeName: input.storeName, slug: input.slug, isVerified: true },
    create: {
      userId: user.id,
      storeName: input.storeName,
      slug: input.slug,
      kind: SellerKind.INDIVIDUAL,
      isVerified: true,
      description: `Demo seller for visibility audit — ${input.slug}`,
    },
  });

  return { user, profile };
}

async function upsertProduct(input: {
  sellerId: string;
  slug: string;
  name: string;
  categoryId: string;
  imageCount: number;
  descriptionLength: number;
  views: number;
}) {
  const description = "x".repeat(Math.max(20, input.descriptionLength));
  const product = await prisma.product.upsert({
    where: {
      sellerId_slug: {
        sellerId: input.sellerId,
        slug: input.slug,
      },
    },
    update: {
      sellerId: input.sellerId,
      name: input.name,
      description,
      views: input.views,
      status: ProductStatus.ACTIVE,
    },
    create: {
      sellerId: input.sellerId,
      slug: input.slug,
      name: input.name,
      description,
      price: 2990,
      currency: "RUB",
      stock: 5,
      city: "Москва",
      condition: ProductCondition.NEW,
      status: ProductStatus.ACTIVE,
      views: input.views,
      categoryId: input.categoryId,
    },
  });

  await prisma.productImage.deleteMany({ where: { productId: product.id } });
  for (let i = 0; i < input.imageCount; i += 1) {
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: `/images/seed/photo-1505740420928-5e560c06d30e.jpg`,
        sortOrder: i,
        isPrimary: i === 0,
      },
    });
  }

  return product;
}

async function main() {
  const category = await prisma.category.findFirst({
    where: { slug: "headphones", isActive: true },
    select: { id: true },
  });
  if (!category) {
    throw new Error("Run main seed first: npx prisma db seed");
  }

  const newSeller = await upsertSeller({
    email: "demo-new-seller@demo.lot",
    storeName: "Demo New Seller",
    slug: "demo-new-seller",
  });

  const growingSeller = await upsertSeller({
    email: "demo-growing@demo.lot",
    storeName: "Demo Growing Shop",
    slug: "demo-growing-shop",
  });

  const problemSeller = await upsertSeller({
    email: "demo-problems@demo.lot",
    storeName: "Demo Problem Shop",
    slug: "demo-problem-shop",
  });

  const newProduct = await upsertProduct({
    sellerId: newSeller.profile.id,
    slug: "demo-new-seller-product",
    name: "Товар нового продавца (audit)",
    categoryId: category.id,
    imageCount: 3,
    descriptionLength: 120,
    views: 12,
  });

  await upsertProduct({
    sellerId: growingSeller.profile.id,
    slug: "demo-growing-product",
    name: "Товар развивающегося продавца (audit)",
    categoryId: category.id,
    imageCount: 5,
    descriptionLength: 200,
    views: 240,
  });

  await upsertProduct({
    sellerId: problemSeller.profile.id,
    slug: "demo-problem-product",
    name: "Товар с проблемами карточки (audit)",
    categoryId: category.id,
    imageCount: 1,
    descriptionLength: 15,
    views: 85,
  });

  await prisma.sellerReputation.upsert({
    where: { sellerId: newSeller.profile.id },
    create: {
      sellerId: newSeller.profile.id,
      completedOrders: 0,
      reviewsCount: 0,
      averageRating: 0,
      trustScore: 70,
    },
    update: {
      completedOrders: 0,
      reviewsCount: 0,
      trustScore: 70,
    },
  });

  await prisma.sellerReputation.upsert({
    where: { sellerId: growingSeller.profile.id },
    create: {
      sellerId: growingSeller.profile.id,
      completedOrders: 12,
      reviewsCount: 8,
      averageRating: 4.6,
      trustScore: 82,
    },
    update: {
      completedOrders: 12,
      reviewsCount: 8,
      averageRating: 4.6,
      trustScore: 82,
    },
  });

  await prisma.sellerReputation.upsert({
    where: { sellerId: problemSeller.profile.id },
    create: {
      sellerId: problemSeller.profile.id,
      completedOrders: 3,
      reviewsCount: 0,
      averageRating: 0,
      trustScore: 58,
      cancellationRate: 20,
    },
    update: {
      completedOrders: 3,
      reviewsCount: 0,
      trustScore: 58,
      cancellationRate: 20,
    },
  });

  console.log("Demo visibility scenarios seeded.");
  console.log(`New seller PDP: /product/${newProduct.id}`);
  console.log("Accounts (password demo1234):");
  console.log("  demo-new-seller@demo.lot");
  console.log("  demo-growing@demo.lot");
  console.log("  demo-problems@demo.lot");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
