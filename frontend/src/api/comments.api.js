import { http } from "./http";

export async function getPostComments(postId) {
  const { data } = await http.get(`/posts/${postId}/comments`);
  return data;
}

export async function createPostComment(postId, content) {
  const { data } = await http.post(`/posts/${postId}/comments`, {
    content,
  });

  return data;
}

export async function deletePostComment(postId, commentId) {
  const { data } = await http.delete(
    `/posts/${postId}/comments/${commentId}`
  );

  return data;
}