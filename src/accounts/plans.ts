import type { Account, AccountPlan } from "./accounts-service.ts";

/**
 * plans are the limits of resources an account can have access to.
 */
export const plans: Record<AccountPlan, { stores: number }> = {
  free_plan: {
    stores: 100,
  },
  pro_plan: {
    stores: 1_000_000,
  },
};

/**
 * reachedPlanLimit checks if the plan limit has been reached.
 */
export function reachedPlanLimit(
  account: Account,
): boolean {
  const stores = account.accessControl.stores.length;
  if (stores >= plans[account.plan].stores) {
    return true;
  }

  return false;
}
