import { DeliveryError, type DeliveryProvider } from "./provider";
import type {
  DeliveryMethodType,
  DeliveryQuote,
  DeliveryQuoteRequest,
  PickupPoint,
} from "./types";

/** Deterministic hash for stable mock prices per city. */
function citySeed(city: string): number {
  const normalized = city.trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    h = (h * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  return h;
}

type CityProfile = {
  aliases: string[];
  /** Base courier cost RUB */
  courierBase: number;
  /** Base pickup cost RUB */
  pickupBase: number;
  minDays: number;
  maxDays: number;
  points: Omit<PickupPoint, "city">[];
};

const CITY_PROFILES: CityProfile[] = [
  {
    aliases: ["москва", "moscow", "мск"],
    courierBase: 450,
    pickupBase: 250,
    minDays: 1,
    maxDays: 3,
    points: [
      {
        code: "MSK-001",
        name: "СДЭК на Тверской",
        address: "ул. Тверская, д. 12",
        postalCode: "125009",
        workTime: "Пн–Пт 10:00–20:00, Сб 10:00–18:00",
      },
      {
        code: "MSK-002",
        name: "СДЭК Арбат",
        address: "ул. Арбат, д. 25",
        postalCode: "119002",
        workTime: "Ежедневно 09:00–21:00",
      },
      {
        code: "MSK-003",
        name: "СДЭК Парк Культуры",
        address: "ул. Крымский Вал, д. 3",
        postalCode: "119049",
        workTime: "Пн–Вс 10:00–22:00",
      },
    ],
  },
  {
    aliases: ["санкт-петербург", "спб", "petersburg", "питер"],
    courierBase: 490,
    pickupBase: 280,
    minDays: 2,
    maxDays: 4,
    points: [
      {
        code: "SPB-001",
        name: "СДЭК Невский",
        address: "Невский пр., д. 48",
        postalCode: "191025",
        workTime: "Пн–Пт 10:00–20:00",
      },
      {
        code: "SPB-002",
        name: "СДЭК Василеостровская",
        address: "Средний пр. В.О., д. 36",
        postalCode: "199004",
        workTime: "Ежедневно 10:00–20:00",
      },
    ],
  },
  {
    aliases: ["казань", "kazan"],
    courierBase: 520,
    pickupBase: 300,
    minDays: 3,
    maxDays: 5,
    points: [
      {
        code: "KZN-001",
        name: "СДЭК Баумана",
        address: "ул. Баумана, д. 58",
        postalCode: "420111",
        workTime: "Пн–Сб 10:00–19:00",
      },
      {
        code: "KZN-002",
        name: "СДЭК Кремлёвская",
        address: "ул. Кремлёвская, д. 15",
        postalCode: "420111",
        workTime: "Пн–Пт 09:00–18:00",
      },
    ],
  },
  {
    aliases: ["новосибирск", "novosibirsk"],
    courierBase: 580,
    pickupBase: 320,
    minDays: 4,
    maxDays: 7,
    points: [
      {
        code: "NSK-001",
        name: "СДЭК Красный проспект",
        address: "Красный пр., д. 82",
        postalCode: "630091",
        workTime: "Пн–Пт 10:00–20:00",
      },
    ],
  },
  {
    aliases: ["екатеринбург", "ekaterinburg", "екат"],
    courierBase: 550,
    pickupBase: 310,
    minDays: 3,
    maxDays: 6,
    points: [
      {
        code: "EKB-001",
        name: "СДЭК Ленина",
        address: "пр. Ленина, д. 50",
        postalCode: "620075",
        workTime: "Ежедневно 10:00–21:00",
      },
      {
        code: "EKB-002",
        name: "СДЭК Уралмаш",
        address: "ул. Машиностроителей, д. 19",
        postalCode: "620012",
        workTime: "Пн–Пт 09:00–19:00",
      },
    ],
  },
  {
    aliases: ["нижний новгород", "н. новгород", "нижний"],
    courierBase: 500,
    pickupBase: 290,
    minDays: 3,
    maxDays: 5,
    points: [
      {
        code: "NN-001",
        name: "СДЭК Большая Покровская",
        address: "ул. Большая Покровская, д. 22",
        postalCode: "603005",
        workTime: "Пн–Сб 10:00–20:00",
      },
    ],
  },
];

function normalizeCity(city: string): string {
  return city.trim().toLowerCase().replace(/\s+/g, " ");
}

function findProfile(city: string): CityProfile | null {
  const key = normalizeCity(city);
  if (!key) return null;
  return (
    CITY_PROFILES.find((p) =>
      p.aliases.some((a) => key === a || key.includes(a) || a.includes(key)),
    ) ?? null
  );
}

function genericQuote(
  method: DeliveryMethodType,
  city: string,
): DeliveryQuote {
  const seed = citySeed(city);
  const pickupBase = 280 + (seed % 120);
  const courierBase = pickupBase + 180 + (seed % 80);
  const minDays = 3 + (seed % 3);
  const maxDays = minDays + 2 + (seed % 2);
  return {
    method,
    city: city.trim(),
    cost: method === "PICKUP" ? pickupBase : courierBase,
    currency: "RUB",
    estimatedMinDays: minDays,
    estimatedMaxDays: maxDays,
    provider: "CDEK",
    source: "mock",
  };
}

function buildPoints(city: string, profile: CityProfile | null): PickupPoint[] {
  const cityName = city.trim();
  if (profile) {
    return profile.points.map((p) => ({ ...p, city: cityName }));
  }
  // Generic fake PVZ for unknown cities so checkout still works.
  const seed = citySeed(city);
  return [
    {
      code: `GEN-${seed % 10000}`,
      name: `СДЭК ${cityName}`,
      address: `ул. Центральная, д. ${(seed % 40) + 1}`,
      city: cityName,
      workTime: "Пн–Пт 10:00–19:00",
    },
    {
      code: `GEN-${(seed % 10000) + 1}`,
      name: `СДЭК ${cityName} — 2`,
      address: `пр. Мира, д. ${(seed % 20) + 5}`,
      city: cityName,
      workTime: "Ежедневно 09:00–20:00",
    },
  ];
}

/**
 * Mock CDEK provider — always available, deterministic, no network.
 * Use for local/dev and when real credentials are missing or API fails.
 */
export function createMockCdekProvider(): DeliveryProvider {
  return {
    name: "cdek-mock",

    async listPickupPoints(city: string): Promise<PickupPoint[]> {
      const trimmed = city.trim();
      if (trimmed.length < 2) {
        throw new DeliveryError(
          "CITY_NOT_FOUND",
          "Укажите город для поиска пунктов выдачи",
        );
      }
      return buildPoints(trimmed, findProfile(trimmed));
    },

    async getQuote(request: DeliveryQuoteRequest): Promise<DeliveryQuote> {
      const city = request.city.trim();
      if (city.length < 2) {
        throw new DeliveryError("CITY_NOT_FOUND", "Укажите город доставки");
      }

      const profile = findProfile(city);
      let quote: DeliveryQuote;

      if (profile) {
        quote = {
          method: request.method,
          city,
          cost:
            request.method === "PICKUP"
              ? profile.pickupBase
              : profile.courierBase,
          currency: "RUB",
          estimatedMinDays: profile.minDays,
          estimatedMaxDays: profile.maxDays,
          provider: "CDEK",
          source: "mock",
        };
      } else {
        quote = genericQuote(request.method, city);
      }

      if (request.method === "PICKUP" && request.pickupPointCode) {
        const points = buildPoints(city, profile);
        const point = points.find((p) => p.code === request.pickupPointCode);
        if (!point) {
          throw new DeliveryError(
            "POINT_NOT_FOUND",
            "Выбранный пункт выдачи не найден",
          );
        }
        quote = { ...quote, pickupPointCode: point.code };
      }

      return quote;
    },
  };
}
