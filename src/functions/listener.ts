import { EventBridgeEvent } from "aws-lambda";
import { AgencyUpdatedEvent } from "vimo-events";
import { Agency } from "../core/agency";

type EventEnvelope = {
  type: string;
  data: Record<string, any>;
  timestamp: number;
  source: string;
  id: string;
};

export const handler = async (
  event: EventBridgeEvent<string, EventEnvelope>
) => {
  if (event["detail-type"] === AgencyUpdatedEvent.type) {
    console.log("AgencyUpdatedEvent", event.detail);
    const detail = AgencyUpdatedEvent.parse(event.detail);
    console.log("detail", detail);
    await Agency.update({
      ...detail.data,
      oplock: detail.timestamp,
      latched: true,
    });
  }
};
