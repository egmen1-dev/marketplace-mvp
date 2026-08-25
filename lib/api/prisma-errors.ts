import { Prisma } from "@prisma/client";

export type MappedApiError = {
  code: string;
  message: string;
  status: number;
  prismaCode?: string;
  constraint?: string;
};

export function mapPrismaError(err: unknown): MappedApiError | null {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  if (err.code === "P2002") {
    const target = Array.isArray(err.meta?.target)
      ? err.meta.target.join(",")
      : String(err.meta?.target ?? "unique");
    return {
      code: "UNIQUE_CONSTRAINT",
      message: "Запись с такими данными уже существует",
      status: 409,
      prismaCode: err.code,
      constraint: target,
    };
  }

  if (err.code === "P2003") {
    return {
      code: "FOREIGN_KEY_CONSTRAINT",
      message: "Связанные данные не найдены",
      status: 409,
      prismaCode: err.code,
      constraint: String(err.meta?.field_name ?? "foreign_key"),
    };
  }

  if (err.code === "P2025") {
    return {
      code: "NOT_FOUND",
      message: "Запись не найдена",
      status: 404,
      prismaCode: err.code,
    };
  }

  if (err.code === "P1017" || err.code === "P1001" || err.code === "P2024") {
    return {
      code: "DATABASE_UNAVAILABLE",
      message: "База данных временно недоступна",
      status: 503,
      prismaCode: err.code,
    };
  }

  return {
    code: "DATABASE_ERROR",
    message: "Ошибка базы данных",
    status: 500,
    prismaCode: err.code,
  };
}
