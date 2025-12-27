import { Entity, item, string, InputItem, number, map, boolean } from "dynamodb-toolbox"
import { AdminMgtBffTable } from "../dynamodb"

export const AgencyEntity = new Entity({
  name: "Agency",
  schema: item({
    agencyId: string().key(),
    name: string(),
    contactMail: string(),
    contactPhone: string().optional(),
    address: map({
      number: string(),
      street: string(),
      city: string(),
      zipCode: string(),
      country: string(),
    }),
    timezone: string(),

    oplock: number(),
    latched: boolean().optional(),
  }),
  computeKey: ({ agencyId }: { agencyId: string }) => ({
    PK: "AGENCIES",
    SK: `AGENCY#${agencyId}`,
  }),
  table: AdminMgtBffTable,
})
export type AgencyEntityType = Omit<
  InputItem<typeof AgencyEntity>,
  "created" | "entity" | "modified"
>