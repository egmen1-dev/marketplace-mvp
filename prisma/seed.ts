/**
 * Prisma seed — 8 root categories (up to 3 levels), demo sellers, products.
 *
 * Price: Decimal major RUB units (see features/products/types).
 *
 * Run: npx prisma db seed
 * (requires DATABASE_URL and migrated schema)
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

/** Demo login — also shown on /auth/sign-in. */
const DEMO_PASSWORD = "demo1234";

/** Local optimized seed assets (see public/images/seed). */
function img(id: string, _width?: number) {
  void _width;
  return `/images/seed/${id}.jpg`;
}

type SeedCategory = {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  children?: SeedCategory[];
};

/**
 * Active roots: Строительство, Инструменты, Электроника, Дом, Авто, Одежда, Красота, Спорт.
 * Depth up to L3 (product type). Unique slugs only — upsert dedupes by slug.
 */
const categoryTree: SeedCategory[] = [
  {
    name: "Строительство и ремонт",
    slug: "construction",
    description: "Материалы и оборудование для стройки и ремонта",
    sortOrder: 1,
    imageUrl: img("photo-1504148455328-c376907d081c", 900),
    children: [
      {
        name: "Материалы",
        slug: "materials",
        description: "Крепёж и отделка",
        sortOrder: 1,
        children: [
          { name: "Крепёж", slug: "fasteners", sortOrder: 1 },
          { name: "Лакокрасочные", slug: "paints", sortOrder: 2 },
        ],
      },
      {
        name: "Отопление",
        slug: "heating",
        description: "Обогрев помещений",
        sortOrder: 2,
        children: [
          {
            name: "Тепловые пушки",
            slug: "heat-guns",
            description: "Электрические и газовые тепловые пушки",
            sortOrder: 1,
          },
          {
            name: "Обогреватели",
            slug: "heaters",
            sortOrder: 2,
          },
        ],
      },
    ],
  },
  {
    name: "Инструменты",
    slug: "tools",
    description: "Электро- и ручной инструмент",
    sortOrder: 2,
    imageUrl: img("photo-1572981779307-38b8cabb2407", 900),
    children: [
      {
        name: "Электроинструмент",
        slug: "power-tools",
        description: "Дрели, шуруповёрты, перфораторы",
        sortOrder: 1,
        children: [
          {
            name: "Дрели",
            slug: "drills",
            description: "Ударные и обычные дрели",
            sortOrder: 1,
          },
          {
            name: "Шуруповерты",
            slug: "screwdrivers",
            description: "Аккумуляторные шуруповёрты",
            sortOrder: 2,
          },
          {
            name: "Перфораторы",
            slug: "rotary-hammers",
            description: "Перфораторы для бетона",
            sortOrder: 3,
          },
        ],
      },
      {
        name: "Ручной инструмент",
        slug: "hand-tools",
        description: "Ключи, отвёртки, измерительный",
        sortOrder: 2,
        children: [
          { name: "Ключи", slug: "wrenches", sortOrder: 1 },
          { name: "Измерительный", slug: "measuring-tools", sortOrder: 2 },
        ],
      },
    ],
  },
  {
    name: "Электроника",
    slug: "electronics",
    description: "Гаджеты, смартфоны, наушники и техника",
    sortOrder: 3,
    imageUrl: img("photo-1498049794561-7780e7231661", 900),
    children: [
      { name: "Смартфоны", slug: "smartphones", sortOrder: 1 },
      { name: "Наушники", slug: "headphones", sortOrder: 2 },
      { name: "Ноутбуки", slug: "laptops", sortOrder: 3 },
      { name: "Носимая электроника", slug: "wearables", sortOrder: 4 },
    ],
  },
  {
    name: "Дом",
    slug: "home",
    description: "Товары для дома и уюта",
    sortOrder: 4,
    imageUrl: img("photo-1616486338812-3dadae4b4ace", 900),
    children: [
      { name: "Мебель", slug: "furniture", sortOrder: 1 },
      {
        name: "Освещение",
        slug: "lighting",
        description: "Лампы и светильники",
        sortOrder: 2,
      },
      { name: "Текстиль", slug: "home-textile", sortOrder: 3 },
      { name: "Кухня", slug: "kitchenware", sortOrder: 4 },
    ],
  },
  {
    name: "Авто",
    slug: "auto",
    description: "Автоаксессуары и товары для машины",
    sortOrder: 5,
    imageUrl: img("photo-1492144534655-ae79c964c9d7", 900),
    children: [
      { name: "Аксессуары", slug: "auto-accessories", sortOrder: 1 },
      { name: "Уход", slug: "auto-care", sortOrder: 2 },
    ],
  },
  {
    name: "Одежда",
    slug: "clothing",
    description: "Одежда и аксессуары",
    sortOrder: 6,
    imageUrl: img("photo-1441984904996-e0b2414e6631", 900),
    children: [
      { name: "Верхняя одежда", slug: "outerwear", sortOrder: 1 },
      { name: "Аксессуары", slug: "clothing-accessories", sortOrder: 2 },
    ],
  },
  {
    name: "Красота",
    slug: "beauty",
    description: "Уход и косметика",
    sortOrder: 7,
    imageUrl: img("photo-1596462502278-27bfdc403348", 900),
    children: [
      { name: "Уход за кожей", slug: "skincare", sortOrder: 1 },
      { name: "Парфюмерия", slug: "perfume", sortOrder: 2 },
    ],
  },
  {
    name: "Спорт",
    slug: "sport",
    description: "Спорт и активный отдых",
    sortOrder: 8,
    imageUrl: img("photo-1517836357463-d25dfeac3438", 900),
    children: [
      { name: "Бег", slug: "running", sortOrder: 1 },
      { name: "Фитнес", slug: "fitness", sortOrder: 2 },
    ],
  },
];

/** Legacy roots kept inactive (archive), products remapped where needed. */
const archivedRoots: Array<{ slug: string; name: string }> = [
  { slug: "garden", name: "Сад и дача (архив)" },
  { slug: "kids", name: "Детям (архив)" },
  { slug: "hobby", name: "Хобби (архив)" },
  { slug: "books", name: "Книги (архив)" },
];

const products: Array<{
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAt?: number;
  categorySlug: string;
  stock: number;
  city: string;
  condition: ProductCondition;
  views: number;
  favoritesCount: number;
  images: string[];
  sellerSlug?: string;
}> = [
  {
    name: "Беспроводные наушники Pulse",
    slug: "wireless-headphones-pulse",
    description:
      "Лёгкие наушники с активным шумоподавлением и 30 часами работы от батареи.",
    price: 4990,
    compareAt: 6990,
    categorySlug: "headphones",
    stock: 42,
    city: "Москва",
    condition: ProductCondition.NEW,
    views: 128,
    favoritesCount: 22,
    images: [
      img("photo-1505740420928-5e560c06d30e"),
      img("photo-1484704849700-f032a568e944"),
    ],
  },
  {
    name: "Смарт-часы Nova Watch",
    slug: "smartwatch-nova",
    description: "Трекинг активности, NFC-платежи и яркий AMOLED-дисплей.",
    price: 12990,
    categorySlug: "wearables",
    stock: 18,
    city: "Санкт-Петербург",
    condition: ProductCondition.NEW,
    views: 86,
    favoritesCount: 14,
    images: [img("photo-1523275335684-37898b6baf30")],
  },
  {
    name: "Дрель ударная Drill Pro 750",
    slug: "drill-pro-750",
    description:
      "Ударная дрель 750 Вт для бетона и металла — популярный инструмент мастера.",
    price: 4590,
    compareAt: 5290,
    categorySlug: "drills",
    stock: 27,
    city: "Москва",
    condition: ProductCondition.NEW,
    views: 210,
    favoritesCount: 31,
    images: [img("photo-1572981779307-38b8cabb2407")],
  },
  {
    name: "Набор бит и свёрл Master Kit",
    slug: "bit-drill-master-kit",
    description: "50 предметов в кейсе: биты, свёрла, удлинители.",
    price: 1890,
    categorySlug: "drills",
    stock: 60,
    city: "Казань",
    condition: ProductCondition.NEW,
    views: 44,
    favoritesCount: 7,
    images: [img("photo-1530124566582-a618bc2615dc")],
  },
  {
    name: "Шуруповёрт Compact 12V",
    slug: "screwdriver-compact-12v",
    description: "Компактный аккумуляторный шуруповёрт для домашнего ремонта.",
    price: 3990,
    categorySlug: "screwdrivers",
    stock: 35,
    city: "Москва",
    condition: ProductCondition.NEW,
    views: 67,
    favoritesCount: 10,
    images: [img("photo-1504148455328-c376907d081c")],
    sellerSlug: "home-tech",
  },
  {
    name: "Рюкзак Urban Compact",
    slug: "backpack-urban-compact",
    description: 'Городской рюкзак на 20 л с отделением под ноутбук 15".',
    price: 2890,
    categorySlug: "clothing-accessories",
    stock: 55,
    city: "Казань",
    condition: ProductCondition.USED,
    views: 33,
    favoritesCount: 5,
    images: [img("photo-1553062407-98eeb64c6a62")],
    sellerSlug: "home-tech",
  },
  {
    name: "Куртка SoftShell Trail",
    slug: "jacket-softshell-trail",
    description: "Ветрозащитная куртка для города и лёгких походов.",
    price: 6790,
    compareAt: 8990,
    categorySlug: "outerwear",
    stock: 24,
    city: "Москва",
    condition: ProductCondition.NEW,
    views: 71,
    favoritesCount: 12,
    images: [img("photo-1544022613-e87ca75a784a")],
  },
  {
    name: "Настольная лампа Arc",
    slug: "desk-lamp-arc",
    description: "Минималистичная LED-лампа с тёплым светом и диммером.",
    price: 3200,
    categorySlug: "lighting",
    stock: 31,
    city: "Екатеринбург",
    condition: ProductCondition.REFURBISHED,
    views: 19,
    favoritesCount: 3,
    images: [img("photo-1507473885765-e6ed057f782c")],
  },
  {
    name: "Керамический набор посуды",
    slug: "ceramic-dinnerware-set",
    description: "Набор из 12 предметов: тарелки, миски и чашки.",
    price: 5490,
    categorySlug: "kitchenware",
    stock: 12,
    city: "Новосибирск",
    condition: ProductCondition.NEW,
    views: 52,
    favoritesCount: 9,
    images: [img("photo-1578500494198-246f612d3b3d")],
  },
  {
    name: "Держатель телефона для авто",
    slug: "car-phone-mount",
    description: "Магнитный держатель на вентиляцию — надёжная фиксация.",
    price: 990,
    categorySlug: "auto-accessories",
    stock: 100,
    city: "Москва",
    condition: ProductCondition.NEW,
    views: 95,
    favoritesCount: 18,
    images: [img("photo-1511919884226-fd3cad546d65")],
  },
  {
    name: "Автомобильный пылесос MiniVac",
    slug: "car-vacuum-minivac",
    description: "Компактный пылесос 12 В для салона, с насадками.",
    price: 2490,
    compareAt: 3190,
    categorySlug: "auto-care",
    stock: 40,
    city: "Самара",
    condition: ProductCondition.NEW,
    views: 61,
    favoritesCount: 11,
    images: [img("photo-1486262715619-67b85e0b08d3")],
  },
  {
    name: "Кроссовки Trail Runner",
    slug: "sneakers-trail-runner",
    description: "Амортизация для бега по пересечённой местности.",
    price: 7450,
    categorySlug: "running",
    stock: 37,
    city: "Москва",
    condition: ProductCondition.USED,
    views: 48,
    favoritesCount: 8,
    images: [img("photo-1542291026-7eec264c27ff")],
  },
  {
    name: "Коврик для йоги Balance",
    slug: "yoga-mat-balance",
    description: "Нескользящий коврик 6 мм с чехлом в комплекте.",
    price: 1990,
    categorySlug: "fitness",
    stock: 80,
    city: "Сочи",
    condition: ProductCondition.NEW,
    views: 27,
    favoritesCount: 4,
    images: [img("photo-1601925260368-ae2f83cf8b7f")],
  },
  {
    name: "Набор уходовой косметики Glow",
    slug: "skincare-set-glow",
    description: "Очищение, сыворотка и крем — базовый ритуал на каждый день.",
    price: 3890,
    categorySlug: "skincare",
    stock: 45,
    city: "Санкт-Петербург",
    condition: ProductCondition.NEW,
    views: 39,
    favoritesCount: 6,
    images: [img("photo-1556228578-0d85b1a4d571")],
  },
  {
    name: "Парфюм Cedar & Amber",
    slug: "perfume-cedar-amber",
    description: "Древесно-амбровый аромат с долгим шлейфом, 50 мл.",
    price: 5200,
    categorySlug: "perfume",
    stock: 22,
    city: "Москва",
    condition: ProductCondition.NEW,
    views: 15,
    favoritesCount: 2,
    images: [img("photo-1541643600914-78b084683601")],
    sellerSlug: "home-tech",
  },
  {
    name: "Тепловая пушка HeatMax 3 кВт",
    slug: "heat-gun-heatmax-3kw",
    description:
      "Электрическая тепловая пушка для гаража и стройплощадки — быстрый прогрев.",
    price: 8990,
    compareAt: 10990,
    categorySlug: "heat-guns",
    stock: 14,
    city: "Москва",
    condition: ProductCondition.NEW,
    views: 156,
    favoritesCount: 19,
    images: [img("photo-1504148455328-c376907d081c")],
    sellerSlug: "tools-pro",
  },
  {
    name: "Краска интерьерная ProWall 10 л",
    slug: "paint-prowall-10l",
    description: "Матовая краска для стен и потолков, белая, моющаяся.",
    price: 3290,
    categorySlug: "paints",
    stock: 48,
    city: "Казань",
    condition: ProductCondition.NEW,
    views: 41,
    favoritesCount: 6,
    images: [img("photo-1616486338812-3dadae4b4ace")],
    sellerSlug: "tools-pro",
  },
  {
    name: "Набор саморезов и дюбелей FixBox",
    slug: "fasteners-fixbox",
    description: "Универсальный набор крепежа 500 шт. в органайзере.",
    price: 890,
    categorySlug: "fasteners",
    stock: 120,
    city: "Самара",
    condition: ProductCondition.NEW,
    views: 73,
    favoritesCount: 8,
    images: [img("photo-1530124566582-a618bc2615dc")],
    sellerSlug: "tools-pro",
  },
  {
    name: "Перфоратор RockDrill SDS+",
    slug: "rotary-hammer-rockdrill",
    description: "Перфоратор 850 Вт с патроном SDS+ для бетона и кирпича.",
    price: 11990,
    compareAt: 13990,
    categorySlug: "rotary-hammers",
    stock: 9,
    city: "Екатеринбург",
    condition: ProductCondition.NEW,
    views: 98,
    favoritesCount: 15,
    images: [img("photo-1572981779307-38b8cabb2407")],
    sellerSlug: "tools-pro",
  },
  {
    name: "Набор гаечных ключей ProTorque",
    slug: "wrench-set-protorque",
    description: "Комбинированные ключи 6–32 мм, 25 предметов, кейс.",
    price: 4590,
    categorySlug: "wrenches",
    stock: 28,
    city: "Москва",
    condition: ProductCondition.NEW,
    views: 54,
    favoritesCount: 9,
    images: [img("photo-1504148455328-c376907d081c")],
    sellerSlug: "tools-pro",
  },
  {
    name: "Ноутбук AeroBook 14",
    slug: "laptop-aerobook-14",
    description: 'Ультрабук 14" IPS, 16 ГБ ОЗУ, SSD 512 ГБ — для работы и учёбы.',
    price: 64990,
    compareAt: 72990,
    categorySlug: "laptops",
    stock: 11,
    city: "Москва",
    condition: ProductCondition.NEW,
    views: 203,
    favoritesCount: 28,
    images: [img("photo-1498049794561-7780e7231661")],
    sellerSlug: "tech-store",
  },
  {
    name: "Смартфон Pixelium X 128 ГБ",
    slug: "smartphone-pixelium-x",
    description: "OLED 120 Гц, тройная камера, быстрая зарядка 67 Вт.",
    price: 34990,
    categorySlug: "smartphones",
    stock: 16,
    city: "Санкт-Петербург",
    condition: ProductCondition.NEW,
    views: 177,
    favoritesCount: 24,
    images: [img("photo-1511919884226-fd3cad546d65")],
    sellerSlug: "tech-store",
  },
  {
    name: "Диван-кровать Nord Compact",
    slug: "sofa-bed-nord",
    description: "Раскладной диван с ящиком для белья, обивка велюр.",
    price: 28990,
    compareAt: 34990,
    categorySlug: "furniture",
    stock: 5,
    city: "Москва",
    condition: ProductCondition.NEW,
    views: 88,
    favoritesCount: 13,
    images: [img("photo-1556228578-0d85b1a4d571")],
    sellerSlug: "home-tech",
  },
  {
    name: "Комплект постельного SoftCotton",
    slug: "bedding-softcotton",
    description: "Еврокомплект из сатина: пододеяльник, простыня, 2 наволочки.",
    price: 4590,
    categorySlug: "home-textile",
    stock: 33,
    city: "Новосибирск",
    condition: ProductCondition.NEW,
    views: 46,
    favoritesCount: 7,
    images: [img("photo-1616486338812-3dadae4b4ace")],
    sellerSlug: "home-tech",
  },
  {
    name: "Светодиодная лента HomeLED 5 м",
    slug: "led-strip-homeled",
    description: "RGB-лента с пультом и блоком питания, клейкая основа.",
    price: 1490,
    categorySlug: "lighting",
    stock: 70,
    city: "Казань",
    condition: ProductCondition.NEW,
    views: 62,
    favoritesCount: 11,
    images: [img("photo-1507473885765-e6ed057f782c")],
    sellerSlug: "home-tech",
  },
  {
    name: "Щётка для дисков AutoShine",
    slug: "wheel-brush-autoshine",
    description: "Мягкая щётка для чистки литых дисков без царапин.",
    price: 690,
    categorySlug: "auto-care",
    stock: 95,
    city: "Самара",
    condition: ProductCondition.NEW,
    views: 34,
    favoritesCount: 5,
    images: [img("photo-1492144534655-ae79c964c9d7")],
    sellerSlug: "raizz",
  },
  {
    name: "Гантели неопреновые 2×5 кг",
    slug: "dumbbells-neoprene-5kg",
    description: "Пара гантелей с неопреновым покрытием для домашней тренировки.",
    price: 2490,
    categorySlug: "fitness",
    stock: 40,
    city: "Москва",
    condition: ProductCondition.NEW,
    views: 58,
    favoritesCount: 10,
    images: [img("photo-1517836357463-d25dfeac3438")],
    sellerSlug: "raizz",
  },
  {
    name: "Крем для лица HydraDay SPF30",
    slug: "face-cream-hydraday",
    description: "Увлажняющий дневной крем с защитой от солнца, 50 мл.",
    price: 1890,
    categorySlug: "skincare",
    stock: 55,
    city: "Санкт-Петербург",
    condition: ProductCondition.NEW,
    views: 29,
    favoritesCount: 4,
    images: [img("photo-1596462502278-27bfdc403348")],
    sellerSlug: "home-tech",
  },
  {
    name: "Обогреватель керамический WarmRoom",
    slug: "heater-warmroom",
    description: "Напольный керамический обогреватель с термостатом, 1500 Вт.",
    price: 5990,
    categorySlug: "heaters",
    stock: 18,
    city: "Екатеринбург",
    condition: ProductCondition.NEW,
    views: 77,
    favoritesCount: 12,
    images: [img("photo-1441984904996-e0b2414e6631")],
    sellerSlug: "tools-pro",
  },
];

async function upsertCategoryTree(
  nodes: SeedCategory[],
  parentId: string | null,
  level: number,
  parentPath: string | null,
  categoryBySlug: Map<string, string>,
) {
  for (const cat of nodes) {
    const path = parentPath ? `${parentPath}/${cat.slug}` : cat.slug;
    const existing = await prisma.category.findUnique({
      where: { slug: cat.slug },
      select: { id: true, externalSource: true, locallyEdited: true },
    });

    const manualMeta = {
      externalSource: "manual" as const,
      externalId: `seed-${cat.slug}`,
      externalName: cat.name,
    };

    const data = {
      name: cat.name,
      description: cat.description ?? null,
      imageUrl: cat.imageUrl ?? null,
      sortOrder: cat.sortOrder ?? 0,
      isActive: true,
      parentId,
      level,
      path,
      ...manualMeta,
    };

    const row = existing
      ? await prisma.category.update({
          where: { id: existing.id },
          data:
            existing.externalSource === "snapshot" ||
            existing.externalSource === "wildberries"
              ? {
                  description: cat.description ?? undefined,
                  imageUrl: cat.imageUrl ?? undefined,
                }
              : existing.locallyEdited
                ? {
                    sortOrder: cat.sortOrder ?? 0,
                    path,
                    level,
                    parentId,
                    description: cat.description ?? undefined,
                    imageUrl: cat.imageUrl ?? undefined,
                  }
                : data,
        })
      : await prisma.category.create({
          data: {
            slug: cat.slug,
            ...data,
          },
        });

    categoryBySlug.set(cat.slug, row.id);

    if (cat.children?.length) {
      await upsertCategoryTree(
        cat.children,
        row.id,
        level + 1,
        path,
        categoryBySlug,
      );
    }
  }
}

function countTreeNodes(nodes: SeedCategory[]): { roots: number; total: number } {
  let total = 0;
  const walk = (list: SeedCategory[]) => {
    for (const n of list) {
      total += 1;
      if (n.children) walk(n.children);
    }
  };
  walk(nodes);
  return { roots: nodes.length, total };
}

function collectSlugs(nodes: SeedCategory[], out = new Set<string>()) {
  for (const n of nodes) {
    out.add(n.slug);
    if (n.children) collectSlugs(n.children, out);
  }
  return out;
}

async function main() {
  console.log("Seeding marketplace…");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const sellerUser = await prisma.user.upsert({
    where: { email: "seller@demo.lot" },
    update: {
      name: "Алексей",
      role: UserRole.SELLER,
      passwordHash,
    },
    create: {
      email: "seller@demo.lot",
      name: "Алексей",
      role: UserRole.SELLER,
      passwordHash,
      image: "https://i.pravatar.cc/150?u=seller@demo.lot",
    },
  });

  const privateSellerUser = await prisma.user.upsert({
    where: { email: "private@demo.lot" },
    update: {
      name: "Иван",
      role: UserRole.SELLER,
      passwordHash,
    },
    create: {
      email: "private@demo.lot",
      name: "Иван",
      role: UserRole.SELLER,
      passwordHash,
      image: "https://i.pravatar.cc/150?u=private@demo.lot",
    },
  });

  const buyerUser = await prisma.user.upsert({
    where: { email: "buyer@demo.lot" },
    update: {
      name: "Анна",
      role: UserRole.BUYER,
      passwordHash,
    },
    create: {
      email: "buyer@demo.lot",
      name: "Анна",
      role: UserRole.BUYER,
      passwordHash,
      image: "https://i.pravatar.cc/150?u=buyer@demo.lot",
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@demo.lot" },
    update: {
      name: "Администратор",
      role: UserRole.ADMIN,
      passwordHash,
      isBlocked: false,
    },
    create: {
      email: "admin@demo.lot",
      name: "Администратор",
      role: UserRole.ADMIN,
      passwordHash,
      image: "https://i.pravatar.cc/150?u=admin@demo.lot",
    },
  });
  void adminUser;

  // BUYER must not have seller access — remove legacy buyer store if present.
  await prisma.sellerProfile.deleteMany({
    where: {
      OR: [{ userId: buyerUser.id }, { slug: "buyer-demo-store" }],
    },
  });

  // Migrate legacy demo-store → raizz (neutral client-facing name).
  let sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: sellerUser.id },
  });

  if (sellerProfile) {
    // Free target slug if held by another row
    if (sellerProfile.slug !== "raizz") {
      await prisma.sellerProfile.updateMany({
        where: {
          slug: "raizz",
          NOT: { id: sellerProfile.id },
        },
        data: { slug: `raizz-legacy-${Date.now()}` },
      });
    }
    sellerProfile = await prisma.sellerProfile.update({
      where: { id: sellerProfile.id },
      data: {
        storeName: "RAIZZ",
        slug: "raizz",
        description: "Магазин инструментов и техники",
        isVerified: true,
        kind: SellerKind.SHOP,
        logoUrl: "https://i.pravatar.cc/150?u=raizz-store",
      },
    });
  } else {
    const legacyShop = await prisma.sellerProfile.findFirst({
      where: { slug: { in: ["raizz", "demo-store"] } },
    });
    if (legacyShop) {
      sellerProfile = await prisma.sellerProfile.update({
        where: { id: legacyShop.id },
        data: {
          userId: sellerUser.id,
          storeName: "RAIZZ",
          slug: "raizz",
          description: "Магазин инструментов и техники",
          isVerified: true,
          kind: SellerKind.SHOP,
          logoUrl: "https://i.pravatar.cc/150?u=raizz-store",
        },
      });
    } else {
      sellerProfile = await prisma.sellerProfile.create({
        data: {
          userId: sellerUser.id,
          storeName: "RAIZZ",
          slug: "raizz",
          description: "Магазин инструментов и техники",
          isVerified: true,
          kind: SellerKind.SHOP,
          logoUrl: "https://i.pravatar.cc/150?u=raizz-store",
        },
      });
    }
  }

  // Rename any leftover Demo Store rows (should not appear in UI).
  await prisma.sellerProfile.updateMany({
    where: {
      storeName: { contains: "Demo" },
      NOT: { id: sellerProfile.id },
    },
    data: {
      storeName: "Магазин инструментов",
      description: "Магазин на площадке Лот",
    },
  });

  const privateProfile = await prisma.sellerProfile.upsert({
    where: { slug: "private-seller" },
    update: {
      storeName: "Дом и техника",
      description: "Товары для дома, свет, мебель и уход",
      isVerified: true,
      kind: SellerKind.INDIVIDUAL,
      logoUrl: "https://i.pravatar.cc/150?u=home-tech-store",
    },
    create: {
      userId: privateSellerUser.id,
      storeName: "Дом и техника",
      slug: "private-seller",
      description: "Товары для дома, свет, мебель и уход",
      isVerified: true,
      kind: SellerKind.INDIVIDUAL,
      logoUrl: "https://i.pravatar.cc/150?u=home-tech-store",
    },
  });

  // Extra demo shops so the marketplace looks populated.
  const toolsProUser = await prisma.user.upsert({
    where: { email: "toolspro@demo.lot" },
    update: {
      name: "Сергей",
      role: UserRole.SELLER,
      passwordHash,
    },
    create: {
      email: "toolspro@demo.lot",
      name: "Сергей",
      role: UserRole.SELLER,
      passwordHash,
      image: "https://i.pravatar.cc/150?u=toolspro@demo.lot",
    },
  });

  const toolsProProfile = await prisma.sellerProfile.upsert({
    where: { slug: "tools-pro" },
    update: {
      storeName: "Инструменты PRO",
      description: "Профессиональный инструмент и материалы для ремонта",
      isVerified: true,
      kind: SellerKind.SHOP,
      logoUrl: "https://i.pravatar.cc/150?u=tools-pro-store",
      userId: toolsProUser.id,
    },
    create: {
      userId: toolsProUser.id,
      storeName: "Инструменты PRO",
      slug: "tools-pro",
      description: "Профессиональный инструмент и материалы для ремонта",
      isVerified: true,
      kind: SellerKind.SHOP,
      logoUrl: "https://i.pravatar.cc/150?u=tools-pro-store",
    },
  });

  const techStoreUser = await prisma.user.upsert({
    where: { email: "techstore@demo.lot" },
    update: {
      name: "Мария",
      role: UserRole.SELLER,
      passwordHash,
    },
    create: {
      email: "techstore@demo.lot",
      name: "Мария",
      role: UserRole.SELLER,
      passwordHash,
      image: "https://i.pravatar.cc/150?u=techstore@demo.lot",
    },
  });

  const techStoreProfile = await prisma.sellerProfile.upsert({
    where: { slug: "tech-store" },
    update: {
      storeName: "Tech Store",
      description: "Ноутбуки, смартфоны и гаджеты с официальной гарантией",
      isVerified: true,
      kind: SellerKind.SHOP,
      logoUrl: "https://i.pravatar.cc/150?u=tech-store",
      userId: techStoreUser.id,
    },
    create: {
      userId: techStoreUser.id,
      storeName: "Tech Store",
      slug: "tech-store",
      description: "Ноутбуки, смартфоны и гаджеты с официальной гарантией",
      isVerified: true,
      kind: SellerKind.SHOP,
      logoUrl: "https://i.pravatar.cc/150?u=tech-store",
    },
  });

  const sellerBySlug = new Map<string, string>([
    ["raizz", sellerProfile.id],
    ["demo-store", sellerProfile.id], // legacy product refs during seed
    ["private-seller", privateProfile.id],
    ["home-tech", privateProfile.id],
    ["tools-pro", toolsProProfile.id],
    ["tech-store", techStoreProfile.id],
  ]);

  const categoryBySlug = new Map<string, string>();

  // 1. Taxonomy snapshot first — canonical ProductType branches (Catalog Core)
  try {
    const { LocalSnapshotProvider } = await import(
      "../lib/catalog-taxonomy/providers/snapshot"
    );
    const { syncTaxonomyToDb } = await import("../lib/catalog-taxonomy/sync");
    const { unifyCatalogCore } = await import("../lib/catalog-taxonomy/unify");
    const taxonomy = await new LocalSnapshotProvider().fetchTaxonomy();
    const taxStats = await syncTaxonomyToDb(prisma, taxonomy, {
      deactivateMissing: false,
    });
    console.log(
      `Taxonomy sync: categories=${taxStats.categoriesUpserted} types=${taxStats.productTypesUpserted} chars=${taxStats.characteristicsUpserted}`,
    );
    // 2. Manual seed enriches tree (descriptions, images, seed-only branches)
    await upsertCategoryTree(categoryTree, null, 1, null, categoryBySlug);
    const unifyStats = await unifyCatalogCore(prisma);
    console.log(
      `Catalog unify: paths=${unifyStats.pathsRebuilt} legacy=${unifyStats.legacyCategoriesDeactivated} remapped=${unifyStats.productsRemapped}`,
    );
  } catch (err) {
    console.warn("[seed] taxonomy / unify skipped:", err);
    await upsertCategoryTree(categoryTree, null, 1, null, categoryBySlug);
  }

  const activeSlugs = collectSlugs(categoryTree);

  // Align legacy «Дом и сад» → «Дом» (home)
  const legacyHome = await prisma.category.findUnique({
    where: { slug: "home-garden" },
    select: { id: true },
  });
  if (legacyHome) {
    const homeId = categoryBySlug.get("home");
    if (homeId) {
      await prisma.product.updateMany({
        where: { categoryId: legacyHome.id },
        data: { categoryId: homeId },
      });
    }
    await prisma.category.update({
      where: { id: legacyHome.id },
      data: {
        isActive: false,
        name: "Дом и сад (архив)",
        level: 1,
        parentId: null,
      },
    });
  }

  for (const archived of archivedRoots) {
    await prisma.category.upsert({
      where: { slug: archived.slug },
      update: {
        name: archived.name,
        isActive: false,
        parentId: null,
        level: 1,
      },
      create: {
        name: archived.name,
        slug: archived.slug,
        isActive: false,
        parentId: null,
        level: 1,
        sortOrder: 90,
      },
    });
  }

  // Deactivate any leftover categories not in the active tree (except archived-demo)
  const leftovers = await prisma.category.findMany({
    where: {
      isActive: true,
      slug: { notIn: [...activeSlugs, "archived-demo"] },
    },
    select: { id: true, slug: true, name: true },
  });
  for (const leftover of leftovers) {
    // Remap products off archived leftovers onto nearest known leaf if possible
    await prisma.category.update({
      where: { id: leftover.id },
      data: {
        isActive: false,
        name: leftover.name.includes("(архив)")
          ? leftover.name
          : `${leftover.name} (архив)`,
      },
    });
  }

  // Inactive category for public-visibility tests / demos
  await prisma.category.upsert({
    where: { slug: "archived-demo" },
    update: {
      name: "Архив (неактивна)",
      isActive: false,
      parentId: null,
      level: 1,
    },
    create: {
      name: "Архив (неактивна)",
      slug: "archived-demo",
      isActive: false,
      sortOrder: 99,
      level: 1,
    },
  });

  for (const product of products) {
    const categoryId = categoryBySlug.get(product.categorySlug);
    if (!categoryId) {
      throw new Error(`Missing category ${product.categorySlug}`);
    }

    const sellerId =
      sellerBySlug.get(product.sellerSlug ?? "raizz") ?? sellerProfile.id;

    const existing = await prisma.product.findUnique({
      where: {
        sellerId_slug: {
          sellerId,
          slug: product.slug,
        },
      },
      select: { id: true },
    });

    const productData = {
      name: product.name,
      description: product.description,
      price: product.price,
      compareAt: product.compareAt ?? null,
      categoryId,
      stock: product.stock,
      city: product.city,
      condition: product.condition,
      status: ProductStatus.ACTIVE,
      currency: "RUB",
      views: product.views,
      favoritesCount: product.favoritesCount,
    };

    if (existing) {
      await prisma.productImage.deleteMany({
        where: { productId: existing.id },
      });
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          ...productData,
          images: {
            create: product.images.map((url, index) => ({
              url,
              alt: product.name,
              sortOrder: index,
              isPrimary: index === 0,
            })),
          },
        },
      });
    } else {
      await prisma.product.create({
        data: {
          sellerId,
          slug: product.slug,
          ...productData,
          images: {
            create: product.images.map((url, index) => ({
              url,
              alt: product.name,
              sortOrder: index,
              isPrimary: index === 0,
            })),
          },
        },
      });
    }
  }

  const treeStats = countTreeNodes(categoryTree);
  const counts = await Promise.all([
    prisma.category.count({ where: { isActive: true, parentId: null } }),
    prisma.category.count({
      where: { isActive: true, parentId: { not: null } },
    }),
    prisma.category.count({ where: { isActive: true } }),
    prisma.product.count(),
    prisma.productImage.count(),
  ]);

  console.log(
    `Tree defined: roots=${treeStats.roots}, totalNodes=${treeStats.total}`,
  );
  console.log(
    `Done. activeRoots=${counts[0]}, activeSubs=${counts[1]}, activeCategories=${counts[2]}, products=${counts[3]}, images=${counts[4]}`,
  );
  console.log(`Sellers: RAIZZ, Дом и техника, Инструменты PRO, Tech Store`);
  console.log(`SellerProfile id: ${sellerProfile.id} (RAIZZ)`);
  console.log(`Home-tech id: ${privateProfile.id} (Дом и техника)`);
  console.log(`Tools PRO id: ${toolsProProfile.id}`);
  console.log(`Tech Store id: ${techStoreProfile.id}`);
  console.log(`Demo seller: seller@demo.lot / ${DEMO_PASSWORD}`);
  console.log(`Demo buyer:  buyer@demo.lot / ${DEMO_PASSWORD}`);
  console.log(`Private:     private@demo.lot / ${DEMO_PASSWORD}`);
  console.log(`Tools PRO:   toolspro@demo.lot / ${DEMO_PASSWORD}`);
  console.log(`Tech Store:  techstore@demo.lot / ${DEMO_PASSWORD}`);
  console.log(`Demo admin:  admin@demo.lot / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
