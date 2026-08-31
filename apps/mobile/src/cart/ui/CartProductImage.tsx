import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { ProductImageFallback } from "../../components/ui";
import { colors, radii } from "../../theme/tokens";
import { CART_ITEM_IMAGE } from "./constants";

export function CartProductImage({ uri }: { uri: string | null }) {
  return (
    <View style={styles.wrap}>
      {uri ? (
        <Image source={{ uri }} style={styles.image} contentFit="contain" transition={200} />
      ) : (
        <ProductImageFallback />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: CART_ITEM_IMAGE,
    height: CART_ITEM_IMAGE,
    borderRadius: radii.md,
    backgroundColor: "#FAFAFA",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
