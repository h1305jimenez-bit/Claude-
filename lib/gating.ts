export interface UserPlan {
  plan: string;
  daily_refreshes_used: number;
  daily_refreshes_reset_at: string | null;
}

export const checkPaidAccess = (user: UserPlan): boolean =>
  user.plan === "paid";

export const checkRefreshLimit = (
  user: UserPlan
): { allowed: boolean; remaining: number } => {
  const today = new Date().toDateString();
  const resetDate = user.daily_refreshes_reset_at
    ? new Date(user.daily_refreshes_reset_at).toDateString()
    : null;

  if (today !== resetDate) return { allowed: true, remaining: 5 };
  return {
    allowed: user.daily_refreshes_used < 5,
    remaining: Math.max(0, 5 - user.daily_refreshes_used),
  };
};
