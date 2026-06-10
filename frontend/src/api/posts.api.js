import { http } from "./http";

export async function getFeed(params = {}) {
  const { data } = await http.get("/posts/feed", { params });
  return data;
}

export async function getMyCommunitiesFeed(params = {}) {
  const { data } = await http.get("/posts/feed/communities", { params });
  return data;
}

export async function getPostById(postId) {
  const { data } = await http.get(`/posts/${postId}`);
  return data;
}

export async function createPost(formData) {
  const { data } = await http.post("/posts", formData);
  return data;
}

export async function updatePost(postId, formData) {
  const { data } = await http.patch(`/posts/${postId}`, formData);
  return data;
}

export async function deletePost(postId) {
  const { data } = await http.delete(`/posts/${postId}`);
  return data;
}

export async function pinPost(postId) {
  const { data } = await http.post(`/posts/${postId}/pin`);
  return data;
}

export async function unpinPost(postId) {
  const { data } = await http.delete(`/posts/${postId}/pin`);
  return data;
}