import "./bootstrap-env";

import * as sodium from "tweetsodium";

const requiredSecrets = [
  "RETAILCRM_BASE_URL",
  "RETAILCRM_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
] as const;

async function main() {
  const githubToken = process.env.GITHUB_TOKEN;
  const repoUrl = process.env.GITHUB_REPO_URL;

  if (!githubToken) {
    throw new Error("Missing GITHUB_TOKEN in the environment.");
  }

  if (!repoUrl) {
    throw new Error("Missing GITHUB_REPO_URL in the environment.");
  }

  const { owner, repo } = parseGitHubRepo(repoUrl);
  const publicKey = await githubRequest<{
    key_id: string;
    key: string;
  }>(`https://api.github.com/repos/${owner}/${repo}/actions/secrets/public-key`, {
    method: "GET",
    headers: buildGitHubHeaders(githubToken),
  });

  const secretsToUpload = new Map<string, string>();

  for (const key of requiredSecrets) {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing ${key} in the environment.`);
    }

    secretsToUpload.set(key, value);
  }

  if (process.env.RETAILCRM_SITE_CODE) {
    secretsToUpload.set("RETAILCRM_SITE_CODE", process.env.RETAILCRM_SITE_CODE);
  }

  if (process.env.HIGH_VALUE_THRESHOLD) {
    secretsToUpload.set("HIGH_VALUE_THRESHOLD", process.env.HIGH_VALUE_THRESHOLD);
  }

  for (const [name, value] of secretsToUpload.entries()) {
    const encryptedValue = Buffer.from(
      sodium.seal(Buffer.from(value), Buffer.from(publicKey.key, "base64")),
    ).toString("base64");

    await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/actions/secrets/${name}`,
      {
        method: "PUT",
        headers: buildGitHubHeaders(githubToken),
        body: JSON.stringify({
          encrypted_value: encryptedValue,
          key_id: publicKey.key_id,
        }),
      },
    );
  }

  console.log(
    JSON.stringify(
      {
        repository: `${owner}/${repo}`,
        configuredSecrets: Array.from(secretsToUpload.keys()),
      },
      null,
      2,
    ),
  );
}

function parseGitHubRepo(repoUrl: string): { owner: string; repo: string } {
  const cleaned = repoUrl.trim().replace(/\.git$/, "");
  const match = cleaned.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/);

  if (!match) {
    throw new Error("GITHUB_REPO_URL must look like https://github.com/owner/repo");
  }

  return {
    owner: match[1],
    repo: match[2],
  };
}

function buildGitHubHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
    "User-Agent": "codex-testing-task",
  };
}

async function githubRequest<T = void>(
  url: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(
      `GitHub API request failed with ${response.status}: ${await response.text()}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
