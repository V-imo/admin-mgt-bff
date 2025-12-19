import { faker } from "@faker-js/faker";
import { AgencyInput } from "./api";

const makeGenerator =
  <T>(generator: () => T) =>
  (overrides: Partial<T> = {}) => ({ ...generator(), ...overrides });

export const generateAgency = makeGenerator<AgencyInput>(() => {
  return {
    agencyId: `agency_${faker.string.uuid()}`,
    name: faker.company.name(),
    contactMail: faker.internet.email(),
    contactPhone: faker.phone.number(),
    address: {
      number: faker.location.buildingNumber(),
      street: faker.location.street(),
      city: faker.location.city(),
      zipCode: faker.location.zipCode(),
      country: faker.location.country(),
    },
  };
});
