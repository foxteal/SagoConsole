import { config } from "../config";

let sessionCookie: string | null = null;

async function login(): Promise<void> {
  const res = await fetch(`${config.tugtainer.url}/api/auth/password/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: config.tugtainer.password }),
  });

  if (!res.ok) {
    throw new Error(`Tugtainer login failed: ${res.status}`);
  }

  // Extract all set-cookie headers and build a combined cookie string
  const cookies = res.headers.getSetCookie?.() ?? [];
  if (cookies.length > 0) {
    sessionCookie = cookies.map((c) => c.split(";")[0]).join("; ");
  } else {
    // Fallback for older Node versions
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      sessionCookie = setCookie.split(",").map((c) => c.trim().split(";")[0]).join("; ");
    }
  }
  console.log("Tugtainer login successful");
}

async function authFetch(url: string): Promise<Response> {
  if (!sessionCookie) {
    await login();
  }

  let res = await fetch(url, {
    headers: sessionCookie ? { Cookie: sessionCookie } : {},
  });

  // Re-auth on 401
  if (res.status === 401) {
    sessionCookie = null;
    await login();
    res = await fetch(url, {
      headers: sessionCookie ? { Cookie: sessionCookie } : {},
    });
  }

  return res;
}

export interface ContainerUpdate {
  name: string;
  host: string;
  versionsBehind: number | null;
}

export async function getUpdates(): Promise<ContainerUpdate[]> {
  if (!config.tugtainer.password) {
    return [];
  }

  try {
    const hostsRes = await authFetch(`${config.tugtainer.url}/api/hosts/list`);
    if (!hostsRes.ok) {
      console.error("Tugtainer hosts list failed:", hostsRes.status);
      return [];
    }

    const hosts = (await hostsRes.json()) as Array<{ id: number; name: string }>;
    const updates: ContainerUpdate[] = [];

    for (const host of hosts) {
      const containersRes = await authFetch(
        `${config.tugtainer.url}/api/containers/${host.id}/list`
      );
      if (!containersRes.ok) continue;

      const containers = (await containersRes.json()) as Array<{
        name: string;
        update_available: boolean;
      }>;

      for (const c of containers) {
        if (c.update_available) {
          updates.push({
            name: c.name,
            host: host.name,
            versionsBehind: null,
          });
        }
      }
    }

    return updates;
  } catch (err) {
    console.error("Tugtainer fetch error:", err);
    return [];
  }
}
