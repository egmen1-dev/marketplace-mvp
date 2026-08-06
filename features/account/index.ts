/** Buyer account — profile, history, dashboard shell. */

export {
  getUserProfile,
  updateUserProfile,
  recordProductView,
  listRecentlyViewedProducts,
  HISTORY_LIMIT,
} from "./queries";
export {
  getProfileAction,
  updateProfileAction,
  recordProductViewAction,
  listHistoryAction,
} from "./actions";
export { updateProfileSchema, type UpdateProfileInput } from "./schemas";
export type { UserProfile, ProfileUpdateResult } from "./types";
export {
  AccountSidebar,
  AccountShell,
  AccountDashboard,
  ProfileView,
  ProfileEditForm,
  HistoryGrid,
} from "./components";
