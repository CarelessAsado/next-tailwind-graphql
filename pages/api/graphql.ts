/* import { graphqlSchema } from "model/Task"; */
import { ApolloServer } from "apollo-server-micro";
import { NextApiRequest, NextApiResponse } from "next";
import { AuthChecker, buildSchema } from "type-graphql";
import dbConnect from "server/db/dbConnect";
import { TaskResolver } from "server/resolvers/tasks.resolvers";
import verifyJwt from "server/middleware/auth";

export type ContextType = { admin: boolean; name: string };

export const customAuthChecker: AuthChecker<ContextType> = (
  { root, args, context, info },
  roles
) => {
  console.log({ context, args, info, root });
  // here we can read the user from context
  // and check his permission in the db against the `roles` argument
  // that comes from the `@Authorized` decorator, eg. ["ADMIN", "MODERATOR"]
  console.log("this is typegraphql / @Authorized related in theory");
  return true; // or false if access is denied
};

const schema = await buildSchema({
  resolvers: [TaskResolver],
  /* https://github.com/MichalLytek/type-graphql/issues/1397 */
  validate: { forbidUnknownValues: false },
  authChecker: customAuthChecker,
  //authChecker https://typegraphql.com/docs/authorization.html
  //TESTING when getting validation error and I wanted to log the input being received
  /* validate: false, */
});

const server = new ApolloServer({
  schema,
  context: verifyJwt,
}); /*  async ({ req, res }) => {
    // Get the user token from the headers.
    //    const token = req.headers.authorization || ""; 
    console.log(req.headers.auth);
    console.log("AUTH MIDDLEWARE");
    // Try to retrieve a user with the token
    //const user = await getUser(token); 

    // Add the user to the context
    return { user: "Rodrigo" };
  }, */

//we need to tell Next.js not to parse the incoming request and let GraphQL handle it for us
export const config = {
  api: {
    bodyParser: false,
  },
};

// DO NOT await apolloServer.start() in the handler function. you'll get "Error: called start() with surprising state" as it was trying to start the server with every request
const start = server.start();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  //https://stackoverflow.com/questions/68745267/apollo-server-micro-response-is-missing-header-access-control-allow-methods-p
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://studio.apollographql.com"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Methods, Access-Control-Allow-Origin, Access-Control-Allow-Credentials, Access-Control-Allow-Headers"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, GET, PUT, PATCH, DELETE, OPTIONS, HEAD"
  );
  if (req.method === "OPTIONS") {
    res.end();
    return false;
  }
  await dbConnect();
  await start;
  const apolloHandler = server.createHandler({ path: "/api/graphql" });
  await apolloHandler(req, res);
}
