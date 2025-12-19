import fs from "fs";
import {
  ServerlessSpyListener,
  createServerlessSpyListener,
} from "serverless-spy";
import {
  AgencyCreatedEvent,
  AgencyCreatedEventEnvelope,
  AgencyDeletedEvent,
  AgencyDeletedEventEnvelope,
  AgencyUpdatedEvent,
  AgencyUpdatedEventEnvelope,
} from "vimo-events";
import { ServerlessSpyEvents } from "../spy";
import { EventBridge, eventualAssertion } from "../utils";
import { AgencyInput, ApiClient } from "../utils/api";
import { generateAgency } from "../utils/generators";
import { createEmployee } from "../utils/auth";

const {
  ApiUrl,
  ServerlessSpyWsUrl,
  UserPoolId,
  UserPoolClientId,
  EventBusName,
} = Object.values(
  JSON.parse(fs.readFileSync("test.output.json", "utf8"))
)[0] as Record<string, string>;
process.env.EVENT_BUS_NAME = EventBusName;

const eventBridge = new EventBridge(EventBusName);

let serverlessSpyListener: ServerlessSpyListener<ServerlessSpyEvents>;
beforeEach(async () => {
  serverlessSpyListener =
    await createServerlessSpyListener<ServerlessSpyEvents>({
      serverlessSpyWsUrl: ServerlessSpyWsUrl,
    });
});

afterEach(async () => {
  serverlessSpyListener.stop();
});

let apiClient: ApiClient;

beforeAll(async () => {
  const { idToken } = await createEmployee({
    userPoolId: UserPoolId,
    clientId: UserPoolClientId,
  });
  apiClient = new ApiClient(ApiUrl, idToken);
});

test("should create the agency", async () => {
  const agency = generateAgency();

  const agencyId = await apiClient.createAgency(agency);

  expect(agencyId).toBeDefined();

  const eventAgencyCreated = (
    await serverlessSpyListener.waitForEventBridgeEventBus<AgencyCreatedEventEnvelope>(
      {
        condition: ({ detail }) =>
          detail.type === AgencyCreatedEvent.type &&
          detail.data.agencyId === agencyId,
      }
    )
  ).getData();

  expect(eventAgencyCreated.detail.data.name).toEqual(agency.name);
});

test("should update an agency", async () => {
  const agency = generateAgency();
  const agencyId = await apiClient.createAgency(agency);

  const newAgency = generateAgency({ agencyId });

  await eventualAssertion(
    async () => {
      return await apiClient.updateAgency(newAgency);
    },
    (res) => {
      expect(res).toBe("Agency updated");
    }
  );

  const eventAgencyUpdated = (
    await serverlessSpyListener.waitForEventBridgeEventBus<AgencyUpdatedEventEnvelope>(
      {
        condition: ({ detail }) =>
          detail.type === AgencyUpdatedEvent.type &&
          detail.data.agencyId === agencyId,
      }
    )
  ).getData();
  expect(eventAgencyUpdated.detail.data.name).toEqual(newAgency.name);
});

test("should delete an agency", async () => {
  const agency = generateAgency();
  const agencyId = await apiClient.createAgency(agency);

  await apiClient.deleteAgency(agencyId);

  await serverlessSpyListener.waitForEventBridgeEventBus<AgencyDeletedEventEnvelope>(
    {
      condition: ({ detail }) =>
        detail.type === AgencyDeletedEvent.type &&
        detail.data.agencyId === agencyId,
    }
  );
});

test("should get modified by events", async () => {
  const agency = generateAgency();
  const agencyId = await apiClient.createAgency(agency);

  const newAgency = generateAgency({ agencyId });
  await eventBridge.send(AgencyUpdatedEvent.build(newAgency));

  await eventualAssertion(
    async () => await apiClient.getAgency(agencyId),
    (res) => {
      expect(res).toBeDefined();
      expect((res as AgencyInput).name).toEqual(newAgency.name);
    }
  );
});

test("should get an agency by id", async () => {
  const agency = generateAgency();
  const agencyId = await apiClient.createAgency(agency);

  await eventualAssertion(
    async () => await apiClient.getAgency(agencyId),
    (res) => {
      expect(res).toBeDefined();
      expect((res as AgencyInput).name).toEqual(agency.name);
    }
  );
});
