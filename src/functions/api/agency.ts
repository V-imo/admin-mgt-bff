import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getUnixTime } from "date-fns";
import { z } from "zod";
import { Agency } from "../../core/agency";

export const AgencySchema = z
  .object({
    agencyId: z.string(),
    name: z.string(),
    contactMail: z.string(),
    contactPhone: z.string().optional(),
    address: z.object({
      number: z.string(),
      street: z.string(),
      city: z.string(),
      zipCode: z.string(),
      country: z.string(),
    }),
    timezone: z.string(),
  })
  .openapi("Agency");

export const AgencyAllSchema = z.array(
  z.object({
    agencyId: z.string(),
    name: z.string(),
  })
);

export const route = new OpenAPIHono()
  .openapi(
    createRoute({
      method: "get",
      path: "/{agencyId}",
      request: {
        params: z.object({
          agencyId: z.string(),
        }),
      },
      responses: {
        200: {
          description: "Get an agency",
          content: {
            "application/json": {
              schema: AgencySchema,
            },
          },
        },
        404: {
          description: "Agency not found",
          content: {
            "application/json": {
              schema: z.object({ message: z.string() }),
            },
          },
        },
      },
      description: "Get an agency",
    }),
    async (c) => {
      const { agencyId } = c.req.valid("param");

      const agency = await Agency.get(agencyId);
      if (!agency) {
        return c.json({ message: "Agency not found" }, 404);
      }
      return c.json(AgencySchema.parse(agency), 200);
    }
  )
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      responses: {
        200: {
          description: "Get all agencies",
          content: {
            "application/json": {
              schema: AgencyAllSchema,
            },
          },
        },
      },
      description: "Get all agencies",
    }),
    async (c) => {
      const agencies = await Agency.getAll();
      return c.json(AgencyAllSchema.parse(agencies), 200);
    }
  )
  .openapi(
    createRoute({
      method: "patch",
      path: "/",
      request: {
        body: {
          content: {
            "application/json": {
              schema: AgencySchema,
            },
          },
        },
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.string(),
            },
          },
          description: "Update an agency",
        },
      },
    }),
    async (c) => {
      const agency = await c.req.json();
      await Agency.update({
        ...agency,
        oplock: getUnixTime(new Date()),
        latched: false,
      });
      return c.json("Agency updated", 200);
    }
  )
  .openapi(
    createRoute({
      method: "delete",
      path: "/{agencyId}",
      request: {
        params: z.object({
          agencyId: z.string(),
        }),
      },
      responses: {
        200: {
          description: "Delete an agency",
          content: {
            "application/json": {
              schema: z.string(),
            },
          },
        },
      },
    }),
    async (c) => {
      const { agencyId } = c.req.valid("param");
      await Agency.del(agencyId);
      return c.json("Agency deleted", 200);
    }
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/",
      request: {
        body: {
          content: {
            "application/json": {
              schema: AgencySchema.omit({ agencyId: true }),
            },
          },
        },
      },
      responses: {
        200: {
          description: "Create an agency",
          content: {
            "application/json": {
              schema: z.string(),
            },
          },
        },
      },
    }),
    async (c) => {
      const agency = await c.req.json();
      const agencyId = "agency_" + crypto.randomUUID();
      await Agency.update({
        ...agency,
        agencyId,
        oplock: getUnixTime(new Date()),
        latched: false,
      });
      return c.json(agencyId, 200);
    }
  );
