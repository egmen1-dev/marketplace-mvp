import { useLocalSearchParams } from "expo-router";

import { getCommerceUseCases } from "../../../../src/composition/commerce-container";
import { ActionResultBanner } from "../../../../src/features/seller/action-center/ActionResultBanner";
import { SellerActionSheet } from "../../../../src/features/seller/action-center/SellerActionSheet";
import { useSellerActionCenter } from "../../../../src/features/seller/action-center/useSellerActionCenter";
import { SellerProductEditorExperience } from "../../../../src/features/seller/SellerProductEditorExperience";
import { productToActionTaskFromEditor } from "../../../../src/features/seller/editor/seller-product-editor-view";
import { useSellerProductEditor } from "../../../../src/features/seller/editor/useSellerProductEditor";

export default function SellerProductEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useSellerProductEditor(id ?? null);
  const commerce = getCommerceUseCases();

  const actionCenter = useSellerActionCenter({
    onWorkspaceRefresh: state.refresh,
    onTelemetry: (event: string) => {
      commerce.trackScreenEvent({ screen: "seller_product_editor", event });
    },
  });

  const publish = async () => {
    const saved = await state.save({ forceDraft: false });
    if (!saved || !state.form) return;
    actionCenter.openTask(
      productToActionTaskFromEditor(String(saved.id), state.form.title, "publish_product"),
    );
  };

  return (
    <>
      <SellerProductEditorExperience state={state} onPublishPress={() => void publish()} />
      <ActionResultBanner
        result={actionCenter.result}
        onDismiss={actionCenter.dismissResult}
        onUndo={actionCenter.undo}
        undoLoading={actionCenter.executing}
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
