import { Dimensions } from "react-native";

import { HOME_SCREEN_PADDING } from "../../home/constants";
import { radii } from "../../theme/tokens";

export const PRODUCT_SCREEN_PADDING = HOME_SCREEN_PADDING;
export const PRODUCT_CARD_RADIUS = radii.lg;
export const PRODUCT_GALLERY_RADIUS = 18;

const screenWidth = Dimensions.get("window").width;

export const PRODUCT_GALLERY_WIDTH = screenWidth - PRODUCT_SCREEN_PADDING * 2;
export const PRODUCT_GALLERY_HEIGHT = Math.round(PRODUCT_GALLERY_WIDTH * 0.92);

export const STICKY_BAR_HEIGHT = 64;
