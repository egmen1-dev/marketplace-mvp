import { useMemo, useState } from "react";

import { getCommerceUseCases } from "../../../src/composition/commerce-container";
import type { SellerActionKind } from "../../../src/domain/contracts/entities/seller";
import { ActionResultBanner } from "../../../src/features/seller/action-center/ActionResultBanner";
import { SellerActionSheet } from "../../../src/features/seller/action-center/SellerActionSheet";
import { useSellerActionCenter } from "../../../src/features/seller/action-center/useSellerActionCenter";
import { SellerOrderDetailExperience } from "../../../src/features/seller/SellerOrderDetailExperience";
import { SellerOrderActionsSheet } from "../../../src/features/seller/orders/SellerOrderActionsSheet";
import { resolveOrderMenuActions } from "../../../src/features/seller/orders/seller-order-actions";
import { orderToActionTask } from "../../../src/features/seller/orders/seller-orders-view";
import { useSellerOrderDetailData } from "../../../src/features/seller/useSellerOrderDetailData";

export default function SellerOrderDetailScreen() {
  const state = useSellerOrderDetailData();
  const commerce = getCommerceUseCases();
  const [menuOpen, setMenuOpen] = useState(false);

  const actionCenter = useSellerActionCenter({
    onWorkspaceRefresh: state.refresh,
    onTelemetry: (event: string) => {
      commerce.trackScreenEvent({ screen: "seller_order_detail", event });
    },
  });

  const menuActions = useMemo(
    () => (state.detail ? resolveOrderMenuActions(state.detail) : []),
    [state.detail],
  );

  const runAction = (actionKind: SellerActionKind) => {
    if (!state.detail) return;
    actionCenter.openTask(orderToActionTask(state.detail, actionKind));
  };

  return (
    <>
      <SellerOrderDetailExperience state={state} onActionPress={() => setMenuOpen(true)} />
      <ActionResultBanner
        result={actionCenter.result}
        onDismiss={actionCenter.dismissResult}
        onUndo={actionCenter.undo}
        undoLoading={actionCenter.executing}
      />
      <SellerOrderActionsSheet
        visible={menuOpen}
        title={state.detail ? `№ ${state.detail.orderNumber}` : ""}
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
