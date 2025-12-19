import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import type { DynamoDBStreamEvent } from "aws-lambda";
import { EntityParser } from "dynamodb-toolbox";
import {
  AgencyCreatedEvent,
  AgencyDeletedEvent,
  AgencyUpdatedEvent,
} from "vimo-events";
import { AgencyEntity } from "../core/agency/agency.entity";
import { tracer } from "../core/utils";

const eventBridge = tracer.captureAWSv3Client(new EventBridgeClient());

// TODO: faire un package pour simplifier tout ça
export const handler = async (event: DynamoDBStreamEvent) => {
  await Promise.all(
    event.Records.map(async (record) => {
      const object = record.dynamodb?.NewImage || record.dynamodb?.OldImage;

      if (object?._et.S === AgencyEntity.entityName) {
        const { item } = AgencyEntity.build(EntityParser).parse(
          unmarshall(object as Record<string, any>)
        );
        if (item.latched) return;
        if (record.eventName === "INSERT") {
          await eventBridge.send(AgencyCreatedEvent.build(item));
        } else if (record.eventName === "REMOVE") {
          await eventBridge.send(AgencyDeletedEvent.build(item));
        } else if (record.eventName === "MODIFY") {
          await eventBridge.send(AgencyUpdatedEvent.build(item));
        }
      }
    })
  );
};
