import React, { useState, useEffect } from "react";
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  useQuery,
  useSubscription,
  gql,
  split,
  HttpLink,
} from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { getMainDefinition } from "@apollo/client/utilities";

// HTTP link for queries and mutations
const httpLink = new HttpLink({
  uri: "http://localhost:4002/graphql",
});

// WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: "ws://localhost:4002/graphql",
    connectionParams: {
      reconnect: true, // Ensures reconnection on failure
    },
  })
);

// Split link to route subscriptions via WebSockets
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  wsLink,
  httpLink
);

// Initialize Apollo Client
const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

// GraphQL query to fetch posts
const GET_POSTS = gql`
  query GetPosts {
    posts {
      id
      title
      content
    }
  }
`;

// GraphQL subscription for real-time updates
const POST_CREATED_SUBSCRIPTION = gql`
  subscription OnPostCreated {
    postCreated {
      id
      title
      content
    }
  }
`;

function PostsTable() {
  const { data, loading, error } = useQuery(GET_POSTS);
  const { data: subscriptionData } = useSubscription(POST_CREATED_SUBSCRIPTION);
  const [posts, setPosts] = useState([]);

  // Update posts when fetched
  useEffect(() => {
    if (data && data.posts) {
      setPosts(data.posts);
    }
  }, [data]);

  // Append new post when received via subscription
  useEffect(() => {
    if (subscriptionData) {
      setPosts((prev) => [...prev, subscriptionData.postCreated]);
    }
  }, [subscriptionData]);

  if (loading)
    return <p className="text-center text-gray-600 text-lg">Loading posts...</p>;

  if (error)
    return (
      <p className="text-center text-red-500 text-lg">
        Error loading posts: {error.message}
      </p>
    );

  return (
    <div className="max-w-3xl mx-auto mt-6">
      <table className="w-full border border-gray-300 rounded-lg shadow-md">
        <thead>
          <tr className="bg-blue-600 text-white">
            <th className="p-3">ID</th>
            <th className="p-3">Title</th>
            <th className="p-3">Content</th>
          </tr>
        </thead>
        <tbody>
          {posts.length > 0 ? (
            posts.map((post) => (
              <tr
                key={post.id}
                className="border-t hover:bg-blue-100 transition duration-200"
              >
                <td className="p-3 text-center">{post.id}</td>
                <td className="p-3">{post.title}</td>
                <td className="p-3">{post.content}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan="3"
                className="text-center text-gray-500 p-4 italic"
              >
                No posts available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function App() {
  return (
    <ApolloProvider client={client}>
      <div className="min-h-screen bg-gray-100 p-6">
        <h1 className="text-3xl font-bold text-center text-blue-700 mb-4">
          Live Posts Table
        </h1>
        <PostsTable />
      </div>
    </ApolloProvider>
  );
}

export default App;
