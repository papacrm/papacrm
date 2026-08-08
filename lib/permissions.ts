import type { IUser } from "./models/User";

// The User model is intentionally minimal ({_id, email, otp, expired}), so
// there's no roles/permissions field to read from yet. Every signed-in user
// gets this baseline permission set, which is what ends up inside the access
// token payload ({_id, permissions}) and in the client-readable cookie. Swap
// this out for a real lookup (e.g. `user.role`) once the model grows one.
export const DEFAULT_PERMISSIONS = ["dashboard:access"];

export function getPermissionsForUser(_user: Pick<IUser, "_id" | "email">): string[] {
    return DEFAULT_PERMISSIONS;
}
