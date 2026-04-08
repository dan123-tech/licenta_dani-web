function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for tenant provisioning`);
  return value;
}

async function neonFetch(path, init = {}) {
  const apiKey = required("NEON_API_KEY");
  const res = await fetch(`https://console.neon.tech/api/v2${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!res.ok) {
    throw new Error(`Neon API ${res.status}: ${typeof payload === "string" ? payload : JSON.stringify(payload)}`);
  }
  return payload;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function neonFetchWithRetry(path, init = {}, retries = 4) {
  let lastErr = null;
  for (let i = 0; i <= retries; i++) {
    try {
      return await neonFetch(path, init);
    } catch (e) {
      const msg = String(e?.message || "");
      lastErr = e;
      if (!msg.includes("Neon API 423")) throw e;
      if (i === retries) throw e;
      await sleep(1200 * (i + 1));
    }
  }
  throw lastErr || new Error("Neon request failed");
}

async function ensureReadWriteEndpoint(projectId, branchId) {
  try {
    await neonFetch(`/projects/${projectId}/endpoints`, {
      method: "POST",
      body: JSON.stringify({
        endpoint: {
          branch_id: branchId,
          type: "read_write",
        },
      }),
    });
  } catch (e) {
    const msg = String(e?.message || "");
    // Endpoint may already exist; keep flow idempotent.
    if (msg.includes("already exists") || msg.includes("409")) return;
    throw e;
  }
}

function normalizeDatabaseName(input) {
  return `tenant_${String(input || "company")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)}`;
}

export async function provisionNeonTenant({ companyId, companyName }) {
  const projectId = required("NEON_PROJECT_ID");
  const rootBranchId = process.env.NEON_ROOT_BRANCH_ID?.trim() || "br-main";
  const branchName = `tenant-${companyId}`;
  const databaseName = normalizeDatabaseName(companyName || companyId);
  const roleName = required("NEON_ROLE_NAME");

  const branch = await neonFetchWithRetry(`/projects/${projectId}/branches`, {
    method: "POST",
    body: JSON.stringify({
      branch: {
        name: branchName,
        parent_id: rootBranchId,
      },
    }),
  });

  try {
    await neonFetchWithRetry(`/projects/${projectId}/branches/${branch.branch.id}/databases`, {
      method: "POST",
      body: JSON.stringify({
        database: {
          name: databaseName,
          owner_name: roleName,
        },
      }),
    });
  } catch (e) {
    const msg = String(e?.message || "");
    if (msg.includes("could not apply config without read-write endpoint")) {
      await ensureReadWriteEndpoint(projectId, branch.branch.id);
      await neonFetchWithRetry(`/projects/${projectId}/branches/${branch.branch.id}/databases`, {
        method: "POST",
        body: JSON.stringify({
          database: {
            name: databaseName,
            owner_name: roleName,
          },
        }),
      });
    } else {
      throw e;
    }
  }

  const conn = await neonFetchWithRetry(
    `/projects/${projectId}/connection_uri?database_name=${encodeURIComponent(databaseName)}&role_name=${encodeURIComponent(roleName)}&branch_id=${encodeURIComponent(branch.branch.id)}`
  );

  return {
    provider: "neon",
    branchId: branch.branch.id,
    branchName,
    databaseName,
    databaseUrl: conn.uri,
  };
}
