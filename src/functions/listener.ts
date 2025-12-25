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
    const detail = AgencyUpdatedEvent.parse(event.detail);
    if(detail.source === process.env.SERVICE) return;
    await Agency.update({
      ...detail.data,
      oplock: detail.timestamp,
      latched: true,
    });
  }
};
