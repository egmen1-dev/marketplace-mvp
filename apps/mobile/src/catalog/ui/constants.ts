import { Dimensions } from "react-native";

import { HOME_SCREEN_PADDING } from "../../home/constants";

export const CATALOG_SCREEN_PADDING = HOME_SCREEN_PADDING;
export const CATALOG_GRID_GAP = 12;

const screenWidth = Dimensions.get("window").width;

export const CATALOG_CARD_WIDTH = Math.floor(
  (screenWidth - CATALOG_SCREEN_PADDING * 2 - CATALOG_GRID_GAP) / 2,
);

export const CATALOG_SEARCH_HEIGHT = 54;
