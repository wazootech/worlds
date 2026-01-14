import type { WorldsOptions } from "#/sdk/types.ts";
import type { PlanRecord } from "./types.ts";

/**
 * Plans is a TypeScript SDK for the Plans API.
 */
export class Plans {
  public constructor(
    public readonly options: WorldsOptions,
  ) {}

  /**
   * list lists all plans from the Worlds API.
   */
  public async list(): Promise<PlanRecord[]> {
    const url = new URL(`${this.options.baseUrl}/plans`);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
      },
    });
    if (!response.ok) {
      throw new Error(
        `Failed to list plans: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * create creates a plan in the Worlds API.
   */
  public async create(
    data: PlanRecord,
  ): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/plans`);
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
      throw new Error(
        `Failed to create plan: ${response.status} ${response.statusText}`,
      );
    }
  }

  /**
   * get retrieves a plan from the Worlds API.
   */
  public async get(
    planType: string,
  ): Promise<PlanRecord | null> {
    if (!planType) {
      return null;
    }
    const url = new URL(`${this.options.baseUrl}/plans/${planType}`);
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
      throw new Error(
        `Failed to get plan: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * update updates a plan in the Worlds API.
   */
  public async update(
    planType: string,
    data: PlanRecord,
  ): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/plans/${planType}`);
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
      throw new Error(
        `Failed to update plan: ${response.status} ${response.statusText}`,
      );
    }
  }

  /**
   * delete deletes a plan from the Worlds API.
   */
  public async delete(planType: string): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/plans/${planType}`);
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
      throw new Error(
        `Failed to delete plan: ${response.status} ${response.statusText}`,
      );
    }
  }
}
