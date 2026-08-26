#!/usr/bin/env node
/** Generates tests/fixtures/policy-v2/fixtures.json (100+ cases) */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const base = [
  { id: "allow-clean-drill", tags: ["allow", "false-positive"], expected: "ALLOW", input: { title: "Дрель Bosch GSR 120", description: "Новая, в коробке", imageUrls: [] } },
  { id: "allow-kitchen-knife", tags: ["allow", "false-positive"], expected: "ALLOW", input: { title: "Кухонный нож поварской 20 см", description: "Нержавеющая сталь" } },
  { id: "allow-toy-gun-context", tags: ["manual", "false-positive"], expected: "MANUAL_REVIEW", input: { title: "Игрушечный пистолет Nerf", description: "Мягкие пули" } },
  { id: "allow-game-controller", tags: ["allow", "false-positive"], expected: "ALLOW", input: { title: "Геймпад в форме бластера", description: "Для PlayStation" } },
  { id: "allow-alcohol-free-perfume", tags: ["allow", "false-positive"], expected: "ALLOW", input: { title: "Парфюм безалкогольный спрей", description: "0% алкоголя" } },
  { id: "allow-vape-case", tags: ["manual", "false-positive"], expected: "MANUAL_REVIEW", input: { title: "Чехол для вейпа силиконовый", description: "Подходит для pod" } },
  { id: "allow-collectible-bottle", tags: ["allow"], expected: "ALLOW", input: { title: "Коллекционная бутылка пустая", description: "Декор, без содержимого" } },
  { id: "block-cigarettes", tags: ["hard-block", "false-negative"], expected: "HARD_BLOCK", input: { title: "Сигареты Marlboro", description: "Блок" } },
  { id: "block-iqos", tags: ["hard-block"], expected: "HARD_BLOCK", input: { title: "Стики IQOS HEETS", description: "" } },
  { id: "block-nicotine-liquid", tags: ["hard-block"], expected: "HARD_BLOCK", input: { title: "Жидкость для вейпа 20 mg/ml nicotine", description: "Манго" } },
  { id: "block-vape-device", tags: ["hard-block"], expected: "HARD_BLOCK", input: { title: "Pod-система вейп", description: "Новая" } },
  { id: "block-vape-obfuscation", tags: ["hard-block", "evasion"], expected: "HARD_BLOCK", input: { title: "в е й п одноразка", description: "" } },
  { id: "block-vape-latin", tags: ["hard-block"], expected: "HARD_BLOCK", input: { title: "Vape disposable", description: "mint" } },
  { id: "block-hookah", tags: ["hard-block"], expected: "HARD_BLOCK", input: { title: "Кальян Khalil Mamoon", description: "" } },
  { id: "block-alcohol-vodka", tags: ["hard-block"], expected: "HARD_BLOCK", input: { title: "Водка 0.5л", description: "" } },
  { id: "block-drugs", tags: ["hard-block"], expected: "HARD_BLOCK", input: { title: "Марихуана", description: "" } },
  { id: "block-cocaine-slang", tags: ["hard-block", "evasion"], expected: "HARD_BLOCK", input: { title: "Кокаин", description: "test" } },
  { id: "block-firearm", tags: ["hard-block"], expected: "HARD_BLOCK", input: { title: "Пистолет ТТ", description: "" } },
  { id: "block-ammo", tags: ["hard-block"], expected: "HARD_BLOCK", input: { title: "Патроны 9мм", description: "" } },
  { id: "block-taser", tags: ["hard-block"], expected: "HARD_BLOCK", input: { title: "Электрошокер", description: "" } },
  { id: "block-fake-passport", tags: ["hard-block"], expected: "HARD_BLOCK", input: { title: "Поддельный паспорт", description: "" } },
  { id: "block-bank-card", tags: ["hard-block"], expected: "HARD_BLOCK", input: { title: "Банковская карта с CVV", description: "" } },
  { id: "block-sim", tags: ["hard-block"], expected: "HARD_BLOCK", input: { title: "SIM-карта МТС", description: "" } },
  { id: "block-account", tags: ["hard-block"], expected: "HARD_BLOCK", input: { title: "Продам аккаунт Steam", description: "" } },
  { id: "block-counterfeit", tags: ["hard-block"], expected: "HARD_BLOCK", input: { title: "Реплика 1:1 Rolex", description: "" } },
  { id: "block-extremist", tags: ["hard-block"], expected: "HARD_BLOCK", input: { title: "Флаг со свастикой", description: "" } },
  { id: "restricted-medicine", tags: ["restricted"], expected: "RESTRICTED_REVIEW", input: { title: "Таблетки парацетамол", description: "Лекарство" } },
  { id: "restricted-supplement", tags: ["restricted"], expected: "RESTRICTED_REVIEW", input: { title: "БАД витамин D", description: "" } },
  { id: "restricted-food", tags: ["restricted"], expected: "RESTRICTED_REVIEW", input: { title: "Сыр пармезан", description: "Продукты питания" } },
  { id: "restricted-children", tags: ["restricted"], expected: "RESTRICTED_REVIEW", input: { title: "Игрушка для детей 0+", description: "" } },
  { id: "restricted-intimate", tags: ["restricted"], expected: "RESTRICTED_REVIEW", input: { title: "Интим-товар", description: "" } },
  { id: "restricted-pyrotechnics", tags: ["restricted"], expected: "RESTRICTED_REVIEW", input: { title: "Фейерверк салют", description: "" } },
  { id: "restricted-cold-weapon", tags: ["restricted"], expected: "RESTRICTED_REVIEW", input: { title: "Кинжал коллекционный", description: "" } },
  { id: "manual-services", tags: ["manual"], expected: "MANUAL_REVIEW", input: { title: "Окажу услугу ремонта", description: "" } },
  { id: "manual-nicotine-patch", tags: ["restricted"], expected: "RESTRICTED_REVIEW", input: { title: "Никотиновый пластырь Nicorette", description: "" } },
  { id: "vape-case-zhidkost", tags: ["manual", "vape-case"], expected: "MANUAL_REVIEW", input: { title: "Жидкость для вэйпа", description: "без никотина", imageUrls: ["/img/vape.jpg"] } },
  { id: "vape-conflict-ocr", tags: ["manual", "conflict"], expected: "MANUAL_REVIEW", input: { title: "Жидкость для вейпа", description: "без никотина", imageAltTexts: ["nicotine 20mg/ml label"] } },
  { id: "vape-nicotine-char", tags: ["hard-block"], expected: "HARD_BLOCK", input: { title: "Жижа", description: "", characteristics: [{ name: "Никотин", value: "20 mg/ml" }] } },
  { id: "category-guard-alcohol", tags: ["category-guard"], expected: "HARD_BLOCK", input: { title: "Напиток", productTypeSlug: "alcohol-wine" } },
  { id: "category-guard-tobacco", tags: ["category-guard"], expected: "HARD_BLOCK", input: { title: "Товар", productTypeSlug: "tobacco-cigarettes" } },
  { id: "category-guard-vape", tags: ["category-guard", "manual"], expected: "MANUAL_REVIEW", input: { title: "Товар", productTypeSlug: "vape-liquid" } },
  { id: "not-evaluated-images-only", tags: ["not-evaluated"], expected: "NOT_EVALUATED", input: { title: "Телефон Samsung", description: "Отличное состояние", imageUrls: ["https://cdn.example/a.jpg"] } },
  { id: "contact-in-image-url", tags: ["manual", "not-evaluated"], expected: "NOT_EVALUATED", input: { title: "Стол", imageUrls: ["https://t.me/seller123/photo.jpg"] } },
  { id: "qr-in-image", tags: ["manual", "not-evaluated"], expected: "NOT_EVALUATED", input: { title: "Книга", imageUrls: ["/qr-code-promo.png"] } },
  { id: "evasion-nicotine-zero", tags: ["evasion"], expected: "HARD_BLOCK", input: { title: "жидк0сть ник0тин 20mg", description: "" } },
  { id: "evasion-vape-at", tags: ["evasion"], expected: "HARD_BLOCK", input: { title: "v@pe pod", description: "" } },
  { id: "evasion-spaced", tags: ["evasion"], expected: "HARD_BLOCK", input: { title: "в е й п", description: "одноразка" } },
  { id: "wrong-category-vape", tags: ["false-negative"], expected: "MANUAL_REVIEW", input: { title: "Жидкость для вэйпа", categorySlug: "electronics", productTypeSlug: "cables" } },
  { id: "empty-description-vape", tags: ["vape-case"], expected: "MANUAL_REVIEW", input: { title: "Жидкость для вэйпа", description: "" } },
  { id: "image-only-vape-title", tags: ["vape-case", "not-evaluated"], expected: "MANUAL_REVIEW", input: { title: "Жидкость для вэйпа", description: "", imageUrls: ["/product.jpg"] } },
];

const evasionVariants = ["вейп", "vape", "вэйп", "жижа", "pod", "iqos", "снюс", "heets"];
const evasionMainExpected = {
  жижа: "MANUAL_REVIEW",
};
const evasionFixtures = evasionVariants.flatMap((term, i) => [
  {
    id: `evasion-main-${i}`,
    tags: ["evasion", evasionMainExpected[term] === "MANUAL_REVIEW" ? "manual" : "hard-block"],
    expected: evasionMainExpected[term] ?? "HARD_BLOCK",
    input: { title: `${term} новый`, description: "продам" },
  },
  {
    id: `evasion-accessory-${i}`,
    tags: ["evasion", "false-positive"],
    expected: ["iqos", "heets", "снюс"].includes(term) ? "ALLOW" : "MANUAL_REVIEW",
    input: { title: `Чехол для ${term}`, description: "аксессуар" },
  },
]);

const allowClean = Array.from({ length: 20 }, (_, i) => ({
  id: `allow-generic-${i}`,
  tags: ["allow"],
  expected: "ALLOW",
  input: {
    title: `Товар бытовой ${i + 1}`,
    description: "Обычный товар без ограничений",
    imageUrls: [],
  },
}));

const blockVariants = [
  "табак жевательный",
  "сигариллы",
  "одноразовая электронка",
  "salt nic juice",
  "спайс микс",
  "героин",
  "амфетамин",
  "взрывчатка",
  "ртуть",
  "радиоактивный",
  "краденый телефон",
  "база данных клиентов",
  "порно dvd",
  "щенок лабрадор",
  "золотой слиток",
  "б/у зубная щетка",
  "честный знак без маркировки",
  "18+ нож боевой",
  "рецептурный препарат",
  "поддельный диплом",
].map((title, i) => ({
  id: `block-variant-${i}`,
  tags: ["hard-block", "false-negative"],
  expected: title.includes("рецептур") ? "HARD_BLOCK" : title.includes("18+") ? "RESTRICTED_REVIEW" : title.includes("щенок") || title.includes("золот") || title.includes("б/у") || title.includes("честный") ? "RESTRICTED_REVIEW" : "HARD_BLOCK",
  input: { title, description: "" },
}));

const ambiguous = Array.from({ length: 15 }, (_, i) => ({
  id: `ambiguous-${i}`,
  tags: ["manual"],
  expected: "MANUAL_REVIEW",
  input: {
    title: `Жидкость для вэйпа вкус ${i}`,
    description: i % 2 === 0 ? "без никотина" : "",
    imageUrls: i % 3 === 0 ? ["/img.jpg"] : [],
  },
}));

const fixtures = [...base, ...evasionFixtures, ...allowClean, ...blockVariants, ...ambiguous];

const out = join(process.cwd(), "tests/fixtures/policy-v2/fixtures.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ generatedAt: "2026-08-26", count: fixtures.length, fixtures }, null, 2));
console.log(`Wrote ${fixtures.length} fixtures → ${out}`);
