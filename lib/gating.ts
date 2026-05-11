export interface UserPlan {
  plan: string;
  daily_refreshes_used: number;
  daily_refreshes_reset_at: string | null;
}

// During open beta every user gets full Pro access
const OPEN_BETA = true;

export const checkPaidAccess = (_user: UserPlan): boolean => OPEN_BETA || _user.plan === "paid";

export const checkRefreshLimit = (
  user: UserPlan
): { allowed: boolean; remaining: number; unlimited: boolean } => {
  if (OPEN_BETA || user.plan === "paid") return { allowed: true, remaining: Infinity, unlimited: true };

  const today = new Date().toDateString();
  const resetDate = user.daily_refreshes_reset_at
    ? new Date(user.daily_refreshes_reset_at).toDateString()
    : null;

  if (today !== resetDate) return { allowed: true, remaining: 5, unlimited: false };
  return {
    allowed: user.daily_refreshes_used < 5,
    remaining: Math.max(0, 5 - user.daily_refreshes_used),
    unlimited: false,
  };
};
