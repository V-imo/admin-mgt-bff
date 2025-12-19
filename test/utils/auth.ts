import {
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

/**
 * Create a Cognito employee user for tests,
 * and return credentials plus tokens.
 *
 * This expects:
 * - a User Pool with ID `userPoolId`
 * - an App Client with ID `clientId` that allows the `USER_PASSWORD_AUTH` flow
 */
export const createEmployee = async (params: {
  userPoolId: string;
  clientId: string;
}) => {
  const cognitoClient = new CognitoIdentityProviderClient({});

  // Simple deterministic-but-unique-enough test credentials
  const username = `test-emp-${Date.now()}-${Math.floor(
    Math.random() * 1_000_000
  )}`;
  const password = `P@ssw0rd!${Math.floor(Math.random() * 1_000_000)}`;

  // 1. Create the user with a temporary password and custom attributes
  await cognitoClient.send(
    new AdminCreateUserCommand({
      UserPoolId: params.userPoolId,
      Username: username,
      TemporaryPassword: password,
      MessageAction: "SUPPRESS", // we don't want emails/SMS in tests
    })
  );

  // 2. Set a permanent password so we can authenticate with USER_PASSWORD_AUTH
  await cognitoClient.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: params.userPoolId,
      Username: username,
      Password: password,
      Permanent: true,
    })
  );

  // 5. Authenticate to get tokens for use in tests
  const auth = await cognitoClient.send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: params.clientId,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    })
  );

  return {
    username,
    password,
    idToken: auth.AuthenticationResult?.IdToken,
    accessToken: auth.AuthenticationResult?.AccessToken,
  };
};