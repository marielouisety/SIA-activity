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
import "./index.css"; // Import the styled CSS file

// Set up Apollo Client for GraphQL
const httpLink = new HttpLink({
  uri: "http://localhost:4002/graphql",
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: "ws://localhost:4002/graphql",
    connectionParams: { reconnect: true },
  })
);

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

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

// GraphQL Queries & Subscriptions
const GET_POSTS = gql`
  query GetPosts {
    posts {
      id
      title
      content
    }
  }
`;

const POST_CREATED_SUBSCRIPTION = gql`
  subscription OnPostCreated {
    postCreated {
      id
      title
      content
    }
  }
`;

// PostsTable Component
function PostsTable() {
  const { data, loading, error } = useQuery(GET_POSTS);
  const { data: subscriptionData } = useSubscription(POST_CREATED_SUBSCRIPTION);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    if (data?.posts) {
      setPosts(data.posts);
    }
  }, [data]);

  useEffect(() => {
    if (subscriptionData) {
      setPosts((prev) => [...prev, subscriptionData.postCreated]);
    }
  }, [subscriptionData]);

  return (
    <div className="container">
      <h1>My Posts</h1>

      {loading && <p className="message loading">Loading posts...</p>}
      {error && <p className="message error">Error: {error.message}</p>}

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Content</th>
          </tr>
        </thead>
        <tbody>
          {posts.length > 0 ? (
            posts.map((post) => (
              <tr key={post.id}>
                <td>{post.id}</td>
                <td>{post.title}</td>
                <td>{post.content}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" className="message">No posts available.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Main App Component
function App() {
  return (
    <ApolloProvider client={client}>
      <div className="app">
        <PostsTable />
      </div>
    </ApolloProvider>
  );
}

export default App;
