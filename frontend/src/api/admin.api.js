import { http } from "./http";

export async function getAdminStats() {
  const { data } = await http.get("/admin/stats");
  return data;
}

export async function getAdminPosts() {
  const { data } = await http.get("/admin/posts");
  return data;
}

export async function getAdminPostById(postId) {
  const { data } = await http.get(`/admin/posts/${postId}`);
  return data;
}

export async function deleteAdminPost(postId) {
  const { data } = await http.delete(`/admin/posts/${postId}`);
  return data;
}

export async function getAdminPostComments(postId) {
  const { data } = await http.get(`/admin/posts/${postId}/comments`);
  return data;
}

export async function deleteAdminPostComment(postId, commentId) {
  const { data } = await http.delete(
    `/admin/posts/${postId}/comments/${commentId}`
  );

  return data;
}

export async function getAdminCommunities() {
  const { data } = await http.get("/admin/communities");
  return data;
}

export async function getAdminCommunityById(communityId) {
  const { data } = await http.get(`/admin/communities/${communityId}`);
  return data;
}

export async function deleteAdminCommunity(communityId) {
  const { data } = await http.delete(`/admin/communities/${communityId}`);
  return data;
}

export async function getAdminHelpRequests() {
  const { data } = await http.get("/admin/help-requests");
  return data;
}

export async function getAdminHelpRequestById(requestId) {
  const { data } = await http.get(`/admin/help-requests/${requestId}`);
  return data;
}

export async function deleteAdminHelpRequest(requestId) {
  const { data } = await http.delete(`/admin/help-requests/${requestId}`);
  return data;
}