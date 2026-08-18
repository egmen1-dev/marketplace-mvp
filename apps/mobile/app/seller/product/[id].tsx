import { useMemo, useState } from "react";

import { getCommerceUseCases } from "../../../src/composition/commerce-container";
import type { SellerActionKind } from "../../../src/domain/contracts/entities/seller";
import { ActionResultBanner } from "../../../src/features/seller/action-center/ActionResultBanner";
import { SellerActionSheet } from "../../../src/features/seller/action-center/SellerActionSheet";
import { useSellerActionCenter } from "../../../src/features/seller/action-center/useSellerActionCenter";
import { SellerProductDetailExperience } from "../../../src/features/seller/SellerProductDetailExperience";
import { SellerProductActionsSheet } from "../../../src/features/seller/products/SellerProductActionsSheet";
import { productToActionTask } from "../../../src/features/seller/products/seller-products-view";
import { resolveProductMenuActions } from "../../../src/features/seller/products/seller-product-actions";
import { useSellerProductDetailData } from "../../../src/features/seller/useSellerProductDetailData";

export default function SellerProductDetailScreen() {
  const state = useSellerProductDetailData();
  const commerce = getCommerceUseCases();
  const [menuOpen, setMenuOpen] = useState(false);

  const actionCenter = useSellerActionCenter({
    onWorkspaceRefresh: state.refresh,
    onTelemetry: (event: string) => {
      commerce.trackScreenEvent({ screen: "seller_product_detail", event });
    },
  });

  const menuActions = useMemo(
    () => (state.detail ? resolveProductMenuActions(state.detail) : []),
    [state.detail],
  );

  const runAction = (actionKind: SellerActionKind) => {
    if (!state.detail) return;
    actionCenter.openTask(productToActionTask(state.detail, actionKind));
  };

  return (
    <>
      <SellerProductDetailExperience state={state} onActionPress={() => setMenuOpen(true)} />
      <ActionResultBanner
        result={actionCenter.result}
        onDismiss={actionCenter.dismissResult}
        onUndo={actionCenter.undo}
        undoLoading={actionCenter.executing}
      />
      <SellerProductActionsSheet
        visible={menuOpen}
        title={state.detail?.title ?? ""}
        actions={menuActions}
        onClose={() => setMenuOpen(false)}
        onSelect={runAction}
      />
      <SellerActionSheet
        task={actionCenter.activeTask}
        visible={Boolean(actionCenter.activeTask)}
        loading={actionCenter.executing}
        onClose={actionCenter.closeSheet}
        onExecute={(values: Record<string, string>) => void actionCenter.execute(values)}
      />
    </>
  );
}
