/**
 * LOT curated taxonomy (WB-inspired, source-agnostic).
 *
 * This is the maintainable source of truth for the LocalSnapshotProvider.
 * It is intentionally broad (all major marketplace segments) so that smart
 * category matching works for real queries, not just a few demo cases.
 *
 * `externalSource` is "snapshot"; external ids are LOT-internal (`lot-*`) and
 * never leak WB primary keys. A real WB live import (WbTaxonomyProvider) can
 * later co-exist by using externalSource "wildberries".
 */

import type {
  CharacteristicType,
  MatchCandidate,
  NormalizedCategory,
  NormalizedCharacteristic,
  NormalizedProductType,
  NormalizedTaxonomy,
} from "../types";

type CharTemplate = {
  name: string;
  slug: string;
  type: CharacteristicType;
  required?: boolean;
  unit?: string;
  options?: string[];
  filterable?: boolean;
};

/**
 * Reusable characteristic sets per product-type family. Keeping them shared
 * makes the taxonomy consistent (e.g. every power tool has «Мощность»).
 */
const TEMPLATES: Record<string, CharTemplate[]> = {
  heatGun: [
    { name: "Мощность", slug: "power-kw", type: "NUMBER", unit: "кВт", required: true, filterable: true },
    {
      name: "Тип нагрева",
      slug: "heat-type",
      type: "SELECT",
      required: true,
      filterable: true,
      options: ["электрический", "газовый", "дизельный", "инфракрасный"],
    },
    { name: "Производительность", slug: "airflow", type: "NUMBER", unit: "м³/ч", filterable: true },
    { name: "Площадь обогрева", slug: "heat-area", type: "NUMBER", unit: "м²", filterable: true },
  ],
  heater: [
    { name: "Мощность", slug: "power-w", type: "NUMBER", unit: "Вт", required: true, filterable: true },
    {
      name: "Тип обогревателя",
      slug: "heater-type",
      type: "SELECT",
      filterable: true,
      options: ["конвектор", "масляный", "керамический", "инфракрасный", "тепловентилятор"],
    },
    { name: "Площадь обогрева", slug: "heat-area", type: "NUMBER", unit: "м²", filterable: true },
  ],
  powerTool: [
    { name: "Мощность", slug: "power-w", type: "NUMBER", unit: "Вт", required: true, filterable: true },
    {
      name: "Тип питания",
      slug: "power-source",
      type: "SELECT",
      required: true,
      filterable: true,
      options: ["сеть", "аккумулятор"],
    },
    { name: "Напряжение аккумулятора", slug: "battery-voltage", type: "NUMBER", unit: "В", filterable: true },
    { name: "Бренд", slug: "brand", type: "TEXT", filterable: true },
  ],
  drill: [
    { name: "Мощность", slug: "power-w", type: "NUMBER", unit: "Вт", required: true, filterable: true },
    {
      name: "Тип питания",
      slug: "power-source",
      type: "SELECT",
      required: true,
      filterable: true,
      options: ["сеть", "аккумулятор"],
    },
    { name: "Макс. крутящий момент", slug: "torque", type: "NUMBER", unit: "Н·м", filterable: true },
    { name: "Ударный режим", slug: "impact", type: "BOOLEAN", filterable: true },
    { name: "Бренд", slug: "brand", type: "TEXT", filterable: true },
  ],
  grinder: [
    { name: "Мощность", slug: "power-w", type: "NUMBER", unit: "Вт", required: true, filterable: true },
    { name: "Диаметр диска", slug: "disc-diameter", type: "NUMBER", unit: "мм", required: true, filterable: true },
    { name: "Регулировка оборотов", slug: "speed-control", type: "BOOLEAN", filterable: true },
    { name: "Бренд", slug: "brand", type: "TEXT", filterable: true },
  ],
  constructionVacuum: [
    { name: "Мощность", slug: "power-w", type: "NUMBER", unit: "Вт", required: true, filterable: true },
    { name: "Объём бака", slug: "tank-volume", type: "NUMBER", unit: "л", filterable: true },
    { name: "Сухая/влажная уборка", slug: "wet-dry", type: "BOOLEAN", filterable: true },
  ],
  welder: [
    { name: "Макс. ток", slug: "max-current", type: "NUMBER", unit: "А", required: true, filterable: true },
    {
      name: "Тип сварки",
      slug: "weld-type",
      type: "SELECT",
      filterable: true,
      options: ["MMA", "MIG/MAG", "TIG"],
    },
  ],
  handTool: [
    { name: "Материал", slug: "material", type: "TEXT", filterable: true },
    { name: "Количество предметов", slug: "pieces", type: "NUMBER", unit: "шт", filterable: true },
  ],
  paint: [
    { name: "Объём", slug: "volume-l", type: "NUMBER", unit: "л", required: true, filterable: true },
    { name: "Цвет", slug: "color", type: "COLOR", filterable: true },
    { name: "Основа", slug: "base", type: "SELECT", filterable: true, options: ["водная", "акриловая", "масляная"] },
  ],
  fastener: [
    { name: "Количество", slug: "count", type: "NUMBER", unit: "шт", filterable: true },
    { name: "Материал", slug: "material", type: "TEXT", filterable: true },
  ],
  laptop: [
    { name: "Процессор", slug: "cpu", type: "TEXT", required: true, filterable: true },
    { name: "Оперативная память", slug: "ram", type: "NUMBER", unit: "ГБ", required: true, filterable: true },
    { name: "Накопитель SSD", slug: "ssd", type: "NUMBER", unit: "ГБ", required: true, filterable: true },
    { name: "Диагональ экрана", slug: "screen", type: "NUMBER", unit: '"', required: true, filterable: true },
    { name: "Видеокарта", slug: "gpu", type: "TEXT", filterable: true },
  ],
  monitor: [
    { name: "Диагональ экрана", slug: "screen", type: "NUMBER", unit: '"', required: true, filterable: true },
    {
      name: "Разрешение",
      slug: "resolution",
      type: "SELECT",
      filterable: true,
      options: ["Full HD", "2K", "4K", "5K"],
    },
    { name: "Частота обновления", slug: "refresh", type: "NUMBER", unit: "Гц", filterable: true },
  ],
  smartphone: [
    { name: "Встроенная память", slug: "storage", type: "NUMBER", unit: "ГБ", required: true, filterable: true },
    { name: "Оперативная память", slug: "ram", type: "NUMBER", unit: "ГБ", filterable: true },
    { name: "Диагональ экрана", slug: "screen", type: "NUMBER", unit: '"', filterable: true },
    { name: "Цвет", slug: "color", type: "COLOR", filterable: true },
  ],
  tv: [
    { name: "Диагональ экрана", slug: "screen", type: "NUMBER", unit: '"', required: true, filterable: true },
    {
      name: "Разрешение",
      slug: "resolution",
      type: "SELECT",
      required: true,
      filterable: true,
      options: ["HD", "Full HD", "4K", "8K"],
    },
    { name: "Smart TV", slug: "smart", type: "BOOLEAN", filterable: true },
  ],
  headphones: [
    {
      name: "Тип",
      slug: "form",
      type: "SELECT",
      filterable: true,
      options: ["вкладыши", "внутриканальные", "накладные", "полноразмерные"],
    },
    { name: "Беспроводные", slug: "wireless", type: "BOOLEAN", filterable: true },
    { name: "Шумоподавление", slug: "anc", type: "BOOLEAN", filterable: true },
  ],
  speaker: [
    { name: "Мощность", slug: "power-w", type: "NUMBER", unit: "Вт", filterable: true },
    { name: "Беспроводная", slug: "wireless", type: "BOOLEAN", filterable: true },
  ],
  wearable: [
    { name: "Диагональ экрана", slug: "screen", type: "NUMBER", unit: '"', filterable: true },
    { name: "Цвет", slug: "color", type: "COLOR", filterable: true },
  ],
  homeAppliance: [
    { name: "Мощность", slug: "power-w", type: "NUMBER", unit: "Вт", filterable: true },
    { name: "Цвет", slug: "color", type: "COLOR", filterable: true },
  ],
  vacuum: [
    { name: "Мощность", slug: "power-w", type: "NUMBER", unit: "Вт", required: true, filterable: true },
    {
      name: "Тип",
      slug: "vacuum-type",
      type: "SELECT",
      filterable: true,
      options: ["с мешком", "циклонный", "вертикальный", "робот", "моющий"],
    },
    { name: "Объём контейнера", slug: "container", type: "NUMBER", unit: "л", filterable: true },
  ],
  hairDryer: [
    { name: "Мощность", slug: "power-w", type: "NUMBER", unit: "Вт", required: true, filterable: true },
    { name: "Количество режимов", slug: "modes", type: "NUMBER", filterable: true },
    { name: "Цвет", slug: "color", type: "COLOR", filterable: true },
  ],
  fridge: [
    { name: "Общий объём", slug: "volume-l", type: "NUMBER", unit: "л", required: true, filterable: true },
    { name: "Класс энергопотребления", slug: "energy", type: "SELECT", filterable: true, options: ["A", "A+", "A++", "A+++"] },
    { name: "No Frost", slug: "no-frost", type: "BOOLEAN", filterable: true },
  ],
  washer: [
    { name: "Загрузка", slug: "load-kg", type: "NUMBER", unit: "кг", required: true, filterable: true },
    { name: "Класс отжима", slug: "spin", type: "SELECT", filterable: true, options: ["A", "B", "C"] },
  ],
  furniture: [
    { name: "Материал", slug: "material", type: "TEXT", filterable: true },
    { name: "Ширина", slug: "width", type: "NUMBER", unit: "см", filterable: true },
    { name: "Цвет", slug: "color", type: "COLOR", filterable: true },
  ],
  lighting: [
    { name: "Мощность", slug: "power-w", type: "NUMBER", unit: "Вт", filterable: true },
    { name: "Цветовая температура", slug: "color-temp", type: "NUMBER", unit: "K", filterable: true },
  ],
  kitchenware: [
    { name: "Материал", slug: "material", type: "TEXT", filterable: true },
    { name: "Количество предметов", slug: "pieces", type: "NUMBER", unit: "шт", filterable: true },
  ],
  textile: [
    { name: "Материал", slug: "material", type: "TEXT", filterable: true },
    { name: "Размер", slug: "size-text", type: "TEXT", filterable: true },
  ],
  compressor: [
    { name: "Производительность", slug: "airflow-lmin", type: "NUMBER", unit: "л/мин", required: true, filterable: true },
    { name: "Максимальное давление", slug: "pressure", type: "NUMBER", unit: "бар", filterable: true },
    { name: "Питание", slug: "power-source", type: "SELECT", filterable: true, options: ["12В", "220В"] },
  ],
  autoAccessory: [
    { name: "Материал", slug: "material", type: "TEXT", filterable: true },
    { name: "Цвет", slug: "color", type: "COLOR", filterable: true },
  ],
  autoCare: [
    { name: "Объём", slug: "volume-ml", type: "NUMBER", unit: "мл", filterable: true },
    { name: "Тип", slug: "care-type", type: "TEXT", filterable: true },
  ],
  tire: [
    { name: "Диаметр", slug: "diameter", type: "NUMBER", unit: '"', required: true, filterable: true },
    { name: "Сезон", slug: "season", type: "SELECT", filterable: true, options: ["летние", "зимние", "всесезонные"] },
  ],
  outerwear: [
    { name: "Размер", slug: "size", type: "SIZE", required: true, filterable: true },
    { name: "Цвет", slug: "color", type: "COLOR", filterable: true },
    { name: "Сезон", slug: "season", type: "SELECT", filterable: true, options: ["зима", "демисезон", "лето"] },
    { name: "Материал", slug: "material", type: "TEXT", filterable: true },
  ],
  clothing: [
    { name: "Размер", slug: "size", type: "SIZE", required: true, filterable: true },
    { name: "Цвет", slug: "color", type: "COLOR", filterable: true },
    { name: "Материал", slug: "material", type: "TEXT", filterable: true },
  ],
  shoes: [
    { name: "Размер", slug: "shoe-size", type: "SIZE", required: true, filterable: true },
    { name: "Цвет", slug: "color", type: "COLOR", filterable: true },
    { name: "Материал", slug: "material", type: "TEXT", filterable: true },
  ],
  skincare: [
    { name: "Объём", slug: "volume-ml", type: "NUMBER", unit: "мл", filterable: true },
    { name: "Тип кожи", slug: "skin-type", type: "SELECT", filterable: true, options: ["сухая", "жирная", "нормальная", "комбинированная"] },
  ],
  perfume: [
    { name: "Объём", slug: "volume-ml", type: "NUMBER", unit: "мл", required: true, filterable: true },
    { name: "Тип аромата", slug: "scent", type: "TEXT", filterable: true },
  ],
  dumbbell: [
    { name: "Вес", slug: "weight-kg", type: "NUMBER", unit: "кг", required: true, filterable: true },
    { name: "Материал", slug: "material", type: "TEXT", filterable: true },
  ],
  fitnessGear: [
    { name: "Материал", slug: "material", type: "TEXT", filterable: true },
    { name: "Цвет", slug: "color", type: "COLOR", filterable: true },
  ],
  bicycle: [
    { name: "Диаметр колёс", slug: "wheel-size", type: "NUMBER", unit: '"', required: true, filterable: true },
    { name: "Тип", slug: "bike-type", type: "SELECT", filterable: true, options: ["горный", "городской", "шоссейный", "детский"] },
    { name: "Материал рамы", slug: "frame", type: "TEXT", filterable: true },
  ],
  generic: [
    { name: "Бренд", slug: "brand", type: "TEXT", filterable: true },
    { name: "Цвет", slug: "color", type: "COLOR", filterable: true },
  ],
};

type PTDef = {
  name: string;
  slug: string;
  template: keyof typeof TEMPLATES;
  aliases?: string[];
};

type CatDef = {
  name: string;
  slug: string;
  children?: CatDef[];
  types?: PTDef[];
};

/**
 * Category tree. Root slugs intentionally match the seed catalog roots so the
 * idempotent sync merges (no duplicate roots). Product types are the leaves.
 */
const TREE: CatDef[] = [
  {
    name: "Строительство и ремонт",
    slug: "construction",
    children: [
      {
        name: "Климатическая техника",
        slug: "climate-tech",
        types: [
          { name: "Тепловые пушки", slug: "heat-guns-type", template: "heatGun", aliases: ["тепловая пушка", "теплопушка", "пушка тепловая", "тепловентилятор промышленный", "тепловая пушка электрическая", "газовая пушка"] },
          { name: "Обогреватели", slug: "heaters-type", template: "heater", aliases: ["обогреватель", "конвектор", "масляный обогреватель", "инфракрасный обогреватель", "керамический обогреватель"] },
          { name: "Тепловентиляторы", slug: "fan-heaters-type", template: "heater", aliases: ["тепловентилятор", "дуйка", "тепловой вентилятор"] },
        ],
      },
      {
        name: "Электроинструмент",
        slug: "power-tools",
        types: [
          { name: "Дрели", slug: "drills-type", template: "drill", aliases: ["дрель", "дрель ударная", "электродрель", "ударная дрель"] },
          { name: "Шуруповёрты", slug: "screwdrivers-type", template: "drill", aliases: ["шуруповерт", "шуруповёрт", "дрель-шуруповерт", "аккумуляторный шуруповерт", "шуруповерт аккумуляторный"] },
          { name: "Перфораторы", slug: "rotary-hammers-type", template: "drill", aliases: ["перфоратор", "бур перфоратор", "перфоратор sds"] },
          { name: "Угловые шлифовальные машины (УШМ)", slug: "angle-grinders-type", template: "grinder", aliases: ["болгарка", "ушм", "угловая шлифовальная машина", "шлифмашина угловая", "болгарка ушм"] },
          { name: "Строительные пылесосы", slug: "construction-vacuums-type", template: "constructionVacuum", aliases: ["строительный пылесос", "пылесос строительный", "промышленный пылесос", "пылесос для стройки"] },
          { name: "Лобзики", slug: "jigsaws-type", template: "powerTool", aliases: ["лобзик", "электролобзик", "лобзик электрический"] },
          { name: "Сварочные аппараты", slug: "welders-type", template: "welder", aliases: ["сварочный аппарат", "сварочник", "сварка инвертор", "инвертор сварочный"] },
          { name: "Шлифовальные машины", slug: "sanders-type", template: "powerTool", aliases: ["шлифмашина", "шлифовальная машина", "эксцентриковая шлифмашина"] },
        ],
      },
      {
        name: "Ручной инструмент",
        slug: "hand-tools",
        types: [
          { name: "Наборы инструментов", slug: "tool-sets-type", template: "handTool", aliases: ["набор инструментов", "набор бит", "набор ключей", "кейс с инструментом"] },
          { name: "Гаечные ключи", slug: "wrenches-type", template: "handTool", aliases: ["гаечный ключ", "ключи гаечные", "набор ключей", "рожковый ключ"] },
          { name: "Отвёртки", slug: "screwdrivers-hand-type", template: "handTool", aliases: ["отвертка", "отвёртка", "набор отверток"] },
        ],
      },
      {
        name: "Строительные материалы",
        slug: "building-materials",
        types: [
          { name: "Краски", slug: "paints-type", template: "paint", aliases: ["краска", "краска интерьерная", "эмаль", "краска для стен"] },
          { name: "Крепёж", slug: "fasteners-type", template: "fastener", aliases: ["крепеж", "саморезы", "дюбели", "набор крепежа", "болты"] },
        ],
      },
    ],
  },
  {
    name: "Электроника",
    slug: "electronics",
    children: [
      {
        name: "Компьютеры",
        slug: "computers",
        types: [
          { name: "Ноутбуки", slug: "laptops-type", template: "laptop", aliases: ["ноутбук", "ноут", "laptop", "ультрабук", "игровой ноутбук"] },
          { name: "Мониторы", slug: "monitors-type", template: "monitor", aliases: ["монитор", "экран для компьютера", "игровой монитор"] },
          { name: "Системные блоки", slug: "desktops-type", template: "laptop", aliases: ["системный блок", "пк", "компьютер настольный", "игровой пк"] },
        ],
      },
      {
        name: "Смартфоны и телефоны",
        slug: "phones",
        types: [
          { name: "Смартфоны", slug: "smartphones-type", template: "smartphone", aliases: ["смартфон", "телефон", "айфон", "iphone", "смартфон samsung", "смартфон xiaomi", "мобильный телефон"] },
        ],
      },
      {
        name: "ТВ и аудио",
        slug: "tv-audio",
        types: [
          { name: "Телевизоры", slug: "tvs-type", template: "tv", aliases: ["телевизор", "тв", "smart tv", "телек", "телевизор 4к"] },
          { name: "Наушники", slug: "headphones-type", template: "headphones", aliases: ["наушники", "гарнитура", "беспроводные наушники", "tws наушники"] },
          { name: "Колонки", slug: "speakers-type", template: "speaker", aliases: ["колонка", "портативная колонка", "bluetooth колонка", "акустика"] },
        ],
      },
      {
        name: "Носимая электроника",
        slug: "wearables-cat",
        types: [
          { name: "Смарт-часы", slug: "smartwatches-type", template: "wearable", aliases: ["смарт часы", "умные часы", "смарт-часы", "фитнес браслет", "часы фитнес"] },
        ],
      },
    ],
  },
  {
    name: "Дом",
    slug: "home",
    children: [
      {
        name: "Мебель",
        slug: "furniture-cat",
        types: [
          { name: "Диваны", slug: "sofas-type", template: "furniture", aliases: ["диван", "диван-кровать", "угловой диван", "софа"] },
          { name: "Кровати", slug: "beds-type", template: "furniture", aliases: ["кровать", "двуспальная кровать", "кровать с матрасом"] },
          { name: "Столы", slug: "tables-type", template: "furniture", aliases: ["стол", "письменный стол", "компьютерный стол", "обеденный стол"] },
          { name: "Шкафы", slug: "wardrobes-type", template: "furniture", aliases: ["шкаф", "шкаф-купе", "гардероб"] },
        ],
      },
      {
        name: "Бытовая техника для дома",
        slug: "home-appliances",
        types: [
          { name: "Пылесосы", slug: "vacuums-type", template: "vacuum", aliases: ["пылесос", "пылесос для дома", "робот пылесос", "моющий пылесос", "вертикальный пылесос"] },
          { name: "Фены", slug: "hair-dryers-type", template: "hairDryer", aliases: ["фен", "фен для волос", "фен профессиональный"] },
          { name: "Холодильники", slug: "fridges-type", template: "fridge", aliases: ["холодильник", "двухкамерный холодильник", "холодильник no frost"] },
          { name: "Стиральные машины", slug: "washers-type", template: "washer", aliases: ["стиральная машина", "стиралка", "машинка стиральная"] },
          { name: "Микроволновые печи", slug: "microwaves-type", template: "homeAppliance", aliases: ["микроволновка", "микроволновая печь", "свч"] },
          { name: "Утюги", slug: "irons-type", template: "homeAppliance", aliases: ["утюг", "утюг с парогенератором", "паровой утюг"] },
        ],
      },
      {
        name: "Освещение",
        slug: "lighting-cat",
        types: [
          { name: "Настольные лампы", slug: "desk-lamps-type", template: "lighting", aliases: ["настольная лампа", "лампа", "светильник настольный"] },
          { name: "Светодиодные ленты", slug: "led-strips-type", template: "lighting", aliases: ["светодиодная лента", "led лента", "подсветка"] },
        ],
      },
      {
        name: "Посуда",
        slug: "kitchenware-cat",
        types: [
          { name: "Наборы посуды", slug: "dinnerware-type", template: "kitchenware", aliases: ["набор посуды", "посуда", "тарелки", "сервиз"] },
        ],
      },
      {
        name: "Домашний текстиль",
        slug: "home-textile-cat",
        types: [
          { name: "Постельное бельё", slug: "bedding-type", template: "textile", aliases: ["постельное белье", "комплект белья", "простыни", "пододеяльник"] },
        ],
      },
    ],
  },
  {
    name: "Авто",
    slug: "auto",
    children: [
      {
        name: "Автоаксессуары",
        slug: "auto-accessories-cat",
        types: [
          { name: "Автомобильные компрессоры", slug: "car-compressors-type", template: "compressor", aliases: ["автомобильный компрессор", "компрессор автомобильный", "насос автомобильный", "компрессор для шин"] },
          { name: "Видеорегистраторы", slug: "dashcams-type", template: "autoAccessory", aliases: ["видеорегистратор", "регистратор автомобильный", "dvr"] },
          { name: "Держатели для телефона", slug: "phone-mounts-type", template: "autoAccessory", aliases: ["держатель телефона", "автодержатель", "держатель для телефона в машину"] },
        ],
      },
      {
        name: "Автохимия и уход",
        slug: "auto-care-cat",
        types: [
          { name: "Автохимия", slug: "car-chemicals-type", template: "autoCare", aliases: ["автохимия", "полироль", "антифриз", "омыватель"] },
          { name: "Щётки и аксессуары для мойки", slug: "car-wash-type", template: "autoCare", aliases: ["щетка для авто", "щетка для дисков", "мойка авто"] },
        ],
      },
      {
        name: "Шины и диски",
        slug: "tires-wheels-cat",
        types: [
          { name: "Шины", slug: "tires-type", template: "tire", aliases: ["шины", "покрышки", "резина автомобильная", "зимние шины", "летние шины"] },
        ],
      },
    ],
  },
  {
    name: "Одежда",
    slug: "clothing",
    children: [
      {
        name: "Женская одежда",
        slug: "women-clothing",
        types: [
          { name: "Куртки женские", slug: "women-jackets-type", template: "outerwear", aliases: ["женская куртка", "зимняя женская куртка", "куртка женская", "пуховик женский"] },
          { name: "Платья", slug: "dresses-type", template: "clothing", aliases: ["платье", "платье женское", "вечернее платье"] },
        ],
      },
      {
        name: "Мужская одежда",
        slug: "men-clothing",
        types: [
          { name: "Куртки мужские", slug: "men-jackets-type", template: "outerwear", aliases: ["мужская куртка", "зимняя мужская куртка", "куртка мужская", "пуховик мужской"] },
          { name: "Футболки", slug: "tshirts-type", template: "clothing", aliases: ["футболка", "футболка мужская", "футболка хлопок"] },
        ],
      },
    ],
  },
  {
    name: "Обувь",
    slug: "shoes",
    children: [
      {
        name: "Обувь",
        slug: "shoes-all",
        types: [
          { name: "Кроссовки", slug: "sneakers-type", template: "shoes", aliases: ["кроссовки", "мужские кроссовки", "женские кроссовки", "кеды", "беговые кроссовки"] },
          { name: "Ботинки", slug: "boots-type", template: "shoes", aliases: ["ботинки", "зимние ботинки", "ботинки мужские"] },
          { name: "Сапоги", slug: "high-boots-type", template: "shoes", aliases: ["сапоги", "сапоги женские", "резиновые сапоги"] },
        ],
      },
    ],
  },
  {
    name: "Красота",
    slug: "beauty",
    children: [
      {
        name: "Уход за кожей",
        slug: "skincare-cat",
        types: [
          { name: "Кремы для лица", slug: "face-creams-type", template: "skincare", aliases: ["крем для лица", "крем", "увлажняющий крем", "крем ночной"] },
          { name: "Сыворотки", slug: "serums-type", template: "skincare", aliases: ["сыворотка", "сыворотка для лица", "серум"] },
        ],
      },
      {
        name: "Парфюмерия",
        slug: "perfume-cat",
        types: [
          { name: "Духи и парфюмерная вода", slug: "perfume-type", template: "perfume", aliases: ["духи", "парфюм", "туалетная вода", "парфюмерная вода", "аромат"] },
        ],
      },
    ],
  },
  {
    name: "Спорт",
    slug: "sport",
    children: [
      {
        name: "Фитнес",
        slug: "fitness-cat",
        types: [
          { name: "Гантели", slug: "dumbbells-type", template: "dumbbell", aliases: ["гантели", "гантель", "гантели наборные", "гантели неопреновые"] },
          { name: "Коврики для йоги", slug: "yoga-mats-type", template: "fitnessGear", aliases: ["коврик для йоги", "коврик йога", "фитнес коврик"] },
          { name: "Тренажёры", slug: "trainers-type", template: "fitnessGear", aliases: ["тренажер", "домашний тренажер", "эспандер"] },
        ],
      },
      {
        name: "Велоспорт",
        slug: "cycling-cat",
        types: [
          { name: "Велосипеды", slug: "bicycles-type", template: "bicycle", aliases: ["велосипед", "горный велосипед", "городской велосипед", "велик"] },
        ],
      },
    ],
  },
];

const SOURCE = "snapshot";

/**
 * Color is a cross-category attribute (HOTFIX-UX-001 #3). Every product type
 * exposes a normalized, filterable «Цвет» characteristic so sellers can always
 * set it and buyers can always filter by it — without a bespoke Product field.
 */
/** Canonical color palette shared by every product type. */
export const UNIVERSAL_COLOR_OPTIONS = [
  "Белый",
  "Чёрный",
  "Серый",
  "Серебристый",
  "Красный",
  "Оранжевый",
  "Жёлтый",
  "Зелёный",
  "Голубой",
  "Синий",
  "Фиолетовый",
  "Розовый",
  "Коричневый",
  "Бежевый",
  "Золотистый",
  "Прозрачный",
  "Разноцветный",
];

const UNIVERSAL_COLOR: CharTemplate = {
  name: "Цвет",
  slug: "color",
  type: "COLOR",
  filterable: true,
  options: UNIVERSAL_COLOR_OPTIONS,
};

function buildCharacteristics(
  ptSlug: string,
  templateKey: keyof typeof TEMPLATES,
): NormalizedCharacteristic[] {
  const base = TEMPLATES[templateKey] ?? TEMPLATES.generic;
  // Guarantee a color characteristic without duplicating templates that
  // already define one (e.g. smartphone, furniture, paint).
  const tpl = base.some((c) => c.slug === "color")
    ? base
    : [...base, UNIVERSAL_COLOR];
  return tpl.map((c, i) => ({
    key: `charc:${ptSlug}:${c.slug}`,
    name: c.name,
    slug: c.slug,
    type: c.type,
    required: Boolean(c.required),
    unit: c.unit ?? null,
    options: c.options ?? null,
    sortOrder: i,
    filterable: c.filterable ?? false,
    externalId: `lot-ch-${ptSlug}-${c.slug}`,
    externalSource: SOURCE,
  }));
}

/** Build the full normalized LOT taxonomy (source = snapshot). */
export function buildLotTaxonomy(): NormalizedTaxonomy {
  const categories: NormalizedCategory[] = [];
  const productTypes: NormalizedProductType[] = [];

  let rootOrder = 0;
  const walk = (
    node: CatDef,
    parentKey: string | null,
    parentPath: string | null,
    level: number,
    order: number,
  ) => {
    const key = `cat:${node.slug}`;
    const path = parentPath ? `${parentPath}/${node.slug}` : node.slug;
    categories.push({
      key,
      name: node.name,
      slug: node.slug,
      parentKey,
      level,
      path,
      sortOrder: order,
      externalSource: SOURCE,
      externalId: `lot-${node.slug}`,
      externalName: node.name,
    });

    node.children?.forEach((child, i) => walk(child, key, path, level + 1, i));

    node.types?.forEach((pt, i) => {
      productTypes.push({
        key: `subject:${pt.slug}`,
        name: pt.name,
        slug: pt.slug,
        categoryKey: key,
        sortOrder: i,
        externalSource: SOURCE,
        externalId: `lot-pt-${pt.slug}`,
        externalName: pt.name,
        aliases: pt.aliases ?? [],
        characteristics: buildCharacteristics(pt.slug, pt.template),
      });
    });
  };

  for (const root of TREE) {
    walk(root, null, null, 1, rootOrder++);
  }

  return {
    source: SOURCE,
    fetchedAt: new Date().toISOString(),
    categories,
    productTypes,
  };
}

/**
 * Convert a normalized taxonomy into matcher candidates without touching the DB.
 * Used by the matcher accuracy dataset test and offline tooling.
 */
export function taxonomyToMatchCandidates(
  taxonomy = buildLotTaxonomy(),
): MatchCandidate[] {
  const catByKey = new Map(taxonomy.categories.map((c) => [c.key, c]));
  const breadcrumb = (categoryKey: string): string[] => {
    const parts: string[] = [];
    let cur = catByKey.get(categoryKey);
    while (cur) {
      parts.unshift(cur.name);
      cur = cur.parentKey ? catByKey.get(cur.parentKey) : undefined;
    }
    return parts;
  };

  return taxonomy.productTypes.map((pt) => ({
    productTypeId: pt.externalId,
    name: pt.name,
    slug: pt.slug,
    categoryId: pt.categoryKey,
    breadcrumb: [...breadcrumb(pt.categoryKey), pt.name],
    aliases: pt.aliases ?? [],
  }));
}

/** Compact taxonomy stats for reports / tests. */
export function lotTaxonomyStats(taxonomy = buildLotTaxonomy()) {
  return {
    categories: taxonomy.categories.length,
    productTypes: taxonomy.productTypes.length,
    characteristics: taxonomy.productTypes.reduce(
      (s, t) => s + t.characteristics.length,
      0,
    ),
    aliases: taxonomy.productTypes.reduce(
      (s, t) => s + (t.aliases?.length ?? 0),
      0,
    ),
  };
}
