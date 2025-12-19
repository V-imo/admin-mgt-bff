import { injectLambdaContext } from "@aws-lambda-powertools/logger/middleware";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer/middleware";
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import middy from "@middy/core";
import { handle } from "hono/aws-lambda";
import { HTTPException } from "hono/http-exception";
import { logger as loggerMiddleware } from "hono/logger";
import { route as AgencyRoute } from "./agency";
import { logger, tracer } from "../../core/utils";

const app = new OpenAPIHono();

app.use(
  loggerMiddleware((message: string, ...params: string[]) => {
    logger.info(message, params.length > 0 ? { params } : {});
  })
);

const routes = app
  .route("/agency", AgencyRoute)
  .onError((error, c) => {
    console.error("Error:", JSON.stringify(error, null, 2));

    if (error instanceof HTTPException) {
      return c.json(error.message, error.status);
    }
    return c.json(
      {
        code: "internal",
        message: "Internal server error",
      },
      500
    );
  });

app
  .doc("/doc", {
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "AdminMgtBff Api",
      description: "The api used to manage the admin",
    },
  })
  .get(
    "/ui",
    swaggerUI({
      url: "/doc",
    })
  );

export type Routes = typeof routes;

export const handler = middy(handle(app))
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }));