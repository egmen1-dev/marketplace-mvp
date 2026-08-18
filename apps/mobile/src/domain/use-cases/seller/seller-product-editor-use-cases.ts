import type {
  SellerCategoryOption,
  SellerProductEditor,
  SellerProductEditorInput,
  SellerProductEditorSaveResult,
  SellerProductImageUploadResult,
  SellerTaxonomyBrowse,
} from "../../contracts/entities/seller";
import type { ProductId } from "../../contracts/value-objects/ids";
import type { DomainError } from "../../contracts/errors";
import type { SellerRepository } from "../../contracts/repositories/index";
import type { DomainEventBus } from "../../contracts/events";
import type { Result } from "../../contracts/result";
import type { CommandUseCase, QueryUseCase } from "../../contracts/use-cases/index";
import { productId } from "../../contracts/value-objects/ids";

export class LoadSellerProductEditor implements QueryUseCase<{ productId: ProductId | null }, SellerProductEditor> {
  constructor(private readonly sellerRepository: SellerRepository) {}

  execute(input: { productId: ProductId | null }): Promise<Result<SellerProductEditor, DomainError>> {
    return this.sellerRepository.loadSellerProductEditor(input.productId);
  }
}

export class SaveSellerProduct implements CommandUseCase<
  { productId: ProductId | null; input: SellerProductEditorInput },
  SellerProductEditorSaveResult
> {
  constructor(
    private readonly sellerRepository: SellerRepository,
    private readonly events: DomainEventBus,
  ) {}

  async execute(input: {
    productId: ProductId | null;
    input: SellerProductEditorInput;
  }): Promise<Result<SellerProductEditorSaveResult, DomainError>> {
    const result = await this.sellerRepository.saveSellerProduct(input.productId, input.input);
    if (result.ok) {
      this.events.publish({
        type: "SellerProductChanged",
        productId: result.value.id,
        change: input.productId ? "updated" : "created",
      });
    }
    return result;
  }
}

export class LoadSellerCategories implements QueryUseCase<Record<string, never>, ReadonlyArray<SellerCategoryOption>> {
  constructor(private readonly sellerRepository: SellerRepository) {}

  execute(_input: Record<string, never>): Promise<Result<ReadonlyArray<SellerCategoryOption>, DomainError>> {
    return this.sellerRepository.loadSellerCategories();
  }
}

export class LoadSellerTaxonomyBrowse implements QueryUseCase<
  { categoryId?: string | null; productTypeId?: string | null },
  SellerTaxonomyBrowse
> {
  constructor(private readonly sellerRepository: SellerRepository) {}

  execute(input: {
    categoryId?: string | null;
    productTypeId?: string | null;
  }): Promise<Result<SellerTaxonomyBrowse, DomainError>> {
    return this.sellerRepository.loadSellerTaxonomyBrowse(input);
  }
}

export class UploadSellerProductImage implements CommandUseCase<
  { localUri: string; fileName?: string | null },
  SellerProductImageUploadResult
> {
  constructor(private readonly sellerRepository: SellerRepository) {}

  execute(input: {
    localUri: string;
    fileName?: string | null;
  }): Promise<Result<SellerProductImageUploadResult, DomainError>> {
    return this.sellerRepository.uploadSellerProductImage(input.localUri, input.fileName ?? null);
  }
}

export function editorProductIdOrNull(raw: string | null | undefined): ProductId | null {
  if (!raw || !raw.trim()) return null;
  return productId(raw);
}
