import { Dimensions } from "react-native";

import { spacing } from "../theme/tokens";

export const HOME_SCREEN_PADDING = spacing.lg;
export const HOME_SECTION_GAP = spacing.lg;
export const HOME_CARD_GAP = 10;
export const HOME_VISIBLE_PRODUCT_CARDS = 3.4;

const screenWidth = Dimensions.get("window").width;

export const HOME_PRODUCT_CARD_WIDTH = Math.floor(
  (screenWidth - HOME_SCREEN_PADDING * 2 - HOME_CARD_GAP * 2) / HOME_VISIBLE_PRODUCT_CARDS,
);

export const HOME_CATEGORY_CIRCLE = 52;
export const HOME_SEARCH_HEIGHT = 54;
export const HOME_FILTER_SIZE = 54;
