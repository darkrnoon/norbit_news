import { http } from "./http";

// ленты
export async function getFeed(params = {}) {
  const { data } = await http.get("/posts/feed", { params });
  return data;
}

export async function getMyCommunitiesFeed(params = {}) {
  const { data } = await http.get("/posts/feed/communities", { params });
  return data;
}

// CRUD
export async function createPost(payload) {
  const { data } = await http.post("/posts", payload);
  return data;
}

export async function getPostById(postId) {
  const { data } = await http.get(`/posts/${postId}`);
  return data;
}

export async function updatePost(postId, patch) {
  const { data } = await http.patch(`/posts/${postId}`, patch);
  return data;
}

export async function deletePost(postId) {
  const { data } = await http.delete(`/posts/${postId}`);
  return data;
}

// pin/unpin
export async function pinPost(postId) {
  const { data } = await http.post(`/posts/${postId}/pin`);
  return data;
}

export async function unpinPost(postId) {
  const { data } = await http.delete(`/posts/${postId}/pin`);
  return data;
}