import type { WorldsOptions } from "./worlds.ts";
import type { Plan } from "./types.ts";

/**
 * Plans is a TypeScript SDK for the Plans API.
 */
export class Plans {
  public constructor(
    public readonly options: WorldsOptions,
  ) {}

  /**
   * getPlans gets all plans from the Worlds API.
   */
  public async getPlans(): Promise<Plan[]> {
    const url = new URL(`${this.options.baseUrl}/v1/plans`);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * createPlan creates a plan in the Worlds API.
   */
  public async createPlan(
    data: Plan,
  ): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/v1/plans`);
    const response = await fetch(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  /**
   * getPlan gets a plan from the Worlds API.
   */
  public async getPlan(
    planType: string,
  ): Promise<Plan | null> {
    if (!planType) {
      return null;
    }
    const url = new URL(`${this.options.baseUrl}/v1/plans/${planType}`);
    const response = await fetch(
      url,
      {
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
        },
      },
    );
    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * updatePlan updates a plan in the Worlds API.
   */
  public async updatePlan(
    planType: string,
    data: Plan,
  ): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/v1/plans/${planType}`);
    const response = await fetch(
      url,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  /**
   * deletePlan deletes a plan from the Worlds API.
   */
  public async deletePlan(planType: string): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/v1/plans/${planType}`);
    const response = await fetch(
      url,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
        },
      },
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
}
