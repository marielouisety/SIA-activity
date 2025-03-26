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
import { FaEdit, FaTrash, FaSave, FaTimes } from "react-icons/fa"; // Import icons
import "./index.css"; // Import CSS

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

function PostsTable() {
  const { data, loading, error } = useQuery(GET_POSTS);
  const { data: subscriptionData } = useSubscription(POST_CREATED_SUBSCRIPTION);
  const [posts, setPosts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedPost, setEditedPost] = useState({ title: "", content: "" });

  useEffect(() => {
    if (data?.posts) {
      setPosts(data.posts.map((post, index) => ({ ...post, id: index + 1 })));
    }
  }, [data]);

  useEffect(() => {
    if (subscriptionData) {
      setPosts((prev) => [
        ...prev,
        { ...subscriptionData.postCreated, id: prev.length + 1 },
      ]);
    }
  }, [subscriptionData]);

  // Delete a post and reset IDs
  const handleDelete = (id) => {
    setPosts((prev) => {
      const updatedPosts = prev.filter((post) => post.id !== id);
      return updatedPosts.map((post, index) => ({
        ...post,
        id: index + 1, // Reset ID numbering from 1
      }));
    });
  };

  // Enable edit mode for a post
  const handleEdit = (post) => {
    setEditingId(post.id);
    setEditedPost({ title: post.title, content: post.content });
  };

  // Save edited post
  const handleSave = (id) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === id ? { ...post, title: editedPost.title, content: editedPost.content } : post
      )
    );
    setEditingId(null);
  };

  // Cancel edit mode
  const handleCancel = () => {
    setEditingId(null);
  };

  return (
    <div className="container">
      <h1>📌 My Posts</h1>

      {loading && <p className="message loading">Loading posts...</p>}
      {error && <p className="message error">Error: {error.message}</p>}

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Content</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {posts.length > 0 ? (
            posts.map((post) => (
              <tr key={post.id}>
                <td>{post.id}</td>
                <td>
                  {editingId === post.id ? (
                    <input
                      type="text"
                      value={editedPost.title}
                      onChange={(e) => setEditedPost({ ...editedPost, title: e.target.value })}
                    />
                  ) : (
                    post.title
                  )}
                </td>
                <td>
                  {editingId === post.id ? (
                    <textarea
                      value={editedPost.content}
                      onChange={(e) => setEditedPost({ ...editedPost, content: e.target.value })}
                    />
                  ) : (
                    post.content
                  )}
                </td>
                <td>
                  {editingId === post.id ? (
                    <>
                      <button className="icon-btn save-btn" onClick={() => handleSave(post.id)}>
                        <FaSave />
                      </button>
                      <button className="icon-btn cancel-btn" onClick={handleCancel}>
                        <FaTimes />
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="icon-btn edit-btn" onClick={() => handleEdit(post)}>
                        <FaEdit />
                      </button>
                      <button className="icon-btn delete-btn" onClick={() => handleDelete(post.id)}>
                        <FaTrash />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="message">No posts available.</td>
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
