/** Auth feature — Auth.js credentials + session helpers. */

export {
  signInAction,
  signUpAction,
  signOutAction,
  becomeSellerAction,
  type AuthActionState,
} from "./actions";
export { SignInForm, SignUpForm, AuthNav } from "./components";
export {
  getSessionUser,
  requireUserSession,
  requireSellerSession,
  requireAdminSession,
  AuthRequiredError,
  SellerRequiredError,
  AdminRequiredError,
  type SessionUser,
} from "./session";
export { signInSchema, signUpSchema } from "./schemas";
export type { SignInInput, SignUpInput } from "./schemas";
export { hashPassword, verifyPassword } from "./lib/password";
