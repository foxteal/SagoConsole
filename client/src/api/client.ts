export async function apiClient(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("access_token");

  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && !url.includes("/api/auth/")) {
    localStorage.removeItem("access_token");
    window.location.href = "/login";
  }

  return res;
}
