export function assertSellerOwnsProduct(input: {
  sellerProfileId: string;
  productSellerId: string;
}): void {
  if (input.sellerProfileId !== input.productSellerId) {
    throw new Error("Нет доступа к этому товару");
  }
}

export function assertAdminRole(role: string | undefined): void {
  if (role !== "ADMIN") {
    throw new Error("Только для администратора");
  }
}
