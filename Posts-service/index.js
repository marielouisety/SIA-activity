const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { PrismaClient } = require('@prisma/client');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { PubSub } = require('graphql-subscriptions');
const cors = require('cors');
const bodyParser = require('body-parser');

const prisma = new PrismaClient();
const pubsub = new PubSub();

const POST_CREATED = "POST_CREATED";
const POST_UPDATED = "POST_UPDATED";

const typeDefs = `#graphql
  type Post {
    id: Int!
    title: String!
    content: String!
  }

  type Query {
    posts: [Post!]!
    post(id: Int!): Post
  }

  type Mutation {
    createPost(title: String!, content: String!): Post!
    updatePost(id: Int!, title: String!, content: String!): Post!
    deletePost(id: Int!): Post!
  }

  type Subscription {
    postCreated: Post!
  }
`;

const resolvers = {
  Query: {
    posts: async () => await prisma.post.findMany(),
    post: async (_, { id }) => await prisma.post.findUnique({ where: { id } }),
  },

  Mutation: {
    createPost: async (_, { title, content }) => {
      const post = await prisma.post.create({ data: { title, content } });

      pubsub.publish(POST_CREATED, { postCreated: post });

      return post;
    },

    updatePost: async (_, { id, title, content }) => {
      const post = await prisma.post.update({
        where: { id },
        data: { title, content },
      });
      return post;
    },

    deletePost: async (_, { id }) => {
      return await prisma.post.delete({ where: { id } });
    },
  },

  Subscription: {
    postCreated: {
      subscribe: () => pubsub.asyncIterableIterator([POST_CREATED]),
    },
  },
};

// Create schema
const schema = makeExecutableSchema({ typeDefs, resolvers });

const app = express();
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
);
app.use(bodyParser.json());

const httpServer = createServer(app);

// Initialize WebSocket Server for Subscriptions
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

const serverCleanup = useServer({ schema }, wsServer);

// Initialize Apollo Server
async function startServer() {
  const server = new ApolloServer({
    schema,
    plugins: [
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();
  app.use('/graphql', expressMiddleware(server));

  // Start HTTP and WS Server
  const PORT = 4002;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
    console.log(`🔌 Subscriptions running at ws://localhost:${PORT}/graphql`);
  });
}

startServer().catch(console.error);
