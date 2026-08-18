import type { WalletRepository } from "../../domain/contracts/repositories/index";
import type { WalletBalance } from "../../domain/contracts/entities/wallet";
import type { Result } from "../../domain/contracts/result";
import { err, ok } from "../../domain/contracts/result";
import { mapApiErrorToDomain } from "../network/map-api-error";
import type { CommerceTransport } from "../transport/types";
import { mapWalletDto, type WalletDto } from "../mappers/wallet-mapper";

export class RestWalletRepository implements WalletRepository {
  constructor(private readonly transport: CommerceTransport) {}

  async loadWallet(): Promise<Result<WalletBalance>> {
    try {
      const dto = await this.transport.request<WalletDto>({ path: "/api/mobile/wallet" });
      return ok(mapWalletDto(dto));
    } catch (error) {
      return err(mapApiErrorToDomain(error));
    }
  }
}
