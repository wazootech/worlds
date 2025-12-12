import type { Account, AccountPlan } from "./accounts-service.ts";

/**
 * plans are the limits of resources an account can have access to.
 */
export const plans: Record<AccountPlan, { worlds: number }> = {
  free_plan: {
    worlds: 100,
  },
  pro_plan: {
    worlds: 1_000_000,
  },
};

/**
 * reachedPlanLimit checks if the plan limit has been reached.
 */
export function reachedPlanLimit(
  account: Account,
): boolean {
  const stores = account.accessControl.worlds.length;
  if (stores >= plans[account.plan].worlds) {
    return true;
  }

  return false;
}
