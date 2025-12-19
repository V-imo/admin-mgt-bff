import {
  DeleteItemCommand,
  GetItemCommand,
  QueryCommand,
  UpdateAttributesCommand,
} from "dynamodb-toolbox";
import { AgencyEntity, AgencyEntityType } from "./agency.entity";
import { ignoreOplockError } from "../utils";
import { AdminMgtBffTable } from "../dynamodb";

export namespace Agency {
  export async function update(agency: AgencyEntityType) {
    AgencyEntity.build(UpdateAttributesCommand)
      .item(agency)
      .options({
        condition: {
          or: [
            { attr: "oplock", exists: false },
            { attr: "oplock", lte: agency.oplock },
          ],
        },
      })
      .send()
      .catch(ignoreOplockError);
  }

  export async function get(agencyId: string) {
    const { Item } = await AgencyEntity.build(GetItemCommand)
      .key({ agencyId })
      .send();
    return Item;
  }

  export async function getAll() {
    const { Items } = await AdminMgtBffTable.build(QueryCommand)
      .query({ partition: "AGENCIES" })
      .entities(AgencyEntity)
      .send();
    return Items;
  }

  export async function del(agencyId: string) {
    return AgencyEntity.build(DeleteItemCommand).key({ agencyId }).send();
  }
}
