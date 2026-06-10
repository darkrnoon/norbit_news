import { http } from "./http";

export async function likePost(postId) {
  const { data } = await http.post(`/posts/${postId}/like`);
  return data;
}

export async function unlikePost(postId) {
  const { data } = await http.delete(`/posts/${postId}/like`);
  return data;
}