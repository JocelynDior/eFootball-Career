export const ADMIN_KEY = "4975";

export function verifyAdminKey(inputKey) {
  return inputKey === ADMIN_KEY;
}
