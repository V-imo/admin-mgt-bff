import { hc } from "hono/client";
import { AgencySchema } from "../../src/functions/api/agency";
import { z } from "zod";
import { Routes } from "../../src/functions/api";

export type AgencyInput = z.infer<typeof AgencySchema>;

export class ApiClient {
  client: ReturnType<typeof hc<Routes>>;

  constructor(baseUrl: string, userId?: string) {
    this.client = hc<Routes>(baseUrl, {
      headers: { Authorization: userId ?? "" },
    });
  }

  async createAgency(agency: AgencyInput) {
    const response = await this.client.agency.$post({
      json: agency,
    });
    return response.json();
  }

  async getAgency(agencyId: string) {
    const response = await this.client.agency[":agencyId"].$get({
      param: { agencyId },
    });
    return response.json();
  }

  async getAllAgencies() {
    const response = await this.client.agency.$get();
    return response.json();
  }

  async deleteAgency(agencyId: string) {
    const response = await this.client.agency[":agencyId"].$delete({
      param: { agencyId },
    });
    return response.json();
  }

  async updateAgency(agency: AgencyInput) {
    const response = await this.client.agency.$patch({
      json: agency,
    });
    return response.json();
  }
}
