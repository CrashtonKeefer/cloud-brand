const loginPanel = document.querySelector("#login-panel");
const editorPanel = document.querySelector("#editor-panel");
const loginForm = document.querySelector("#login-form");
const editorForm = document.querySelector("#editor-form");
const editorList = document.querySelector("#community-editor-list");
const communityTemplate = document.querySelector("#community-template");
const statusMessage = document.querySelector("#status-message");
const logoutButton = document.querySelector("#logout-button");

function setStatus(message, state = "") {
  statusMessage.textContent = message;
  if (state) statusMessage.dataset.state = state;
  else delete statusMessage.dataset.state;
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "The request could not be completed.");
  return result;
}

function showLogin() {
  loginPanel.hidden = false;
  editorPanel.hidden = true;
  logoutButton.hidden = true;
}

function renderCommunities(communities) {
  editorList.replaceChildren();
  for (const community of communities) {
    const row = communityTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.id = community.id;
    row.querySelector("legend").textContent = community.name;
    row.querySelector('[data-field="name"]').value = community.name;
    row.querySelector('[data-field="inviteCode"]').value = community.inviteCode;
    row.querySelector('[data-field="logoPath"]').value = community.logoPath;
    editorList.append(row);
  }
}

function showEditor(communities) {
  renderCommunities(communities);
  loginPanel.hidden = true;
  editorPanel.hidden = false;
  logoutButton.hidden = false;
  setStatus("");
}

async function loadCommunities() {
  const result = await request("/api/admin");
  showEditor(result.communities);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Signing in...");
  const password = new FormData(loginForm).get("password");
  try {
    await request("/api/admin", {
      method: "POST",
      body: JSON.stringify({ action: "login", password }),
    });
    loginForm.reset();
    await loadCommunities();
  } catch (error) {
    setStatus(error.message, "error");
  }
});

editorForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const communities = [...editorList.querySelectorAll(".community-editor-row")].map((row) => ({
    id: row.dataset.id,
    name: row.querySelector('[data-field="name"]').value,
    inviteCode: row.querySelector('[data-field="inviteCode"]').value,
    logoPath: row.querySelector('[data-field="logoPath"]').value,
  }));

  setStatus("Saving changes...");
  try {
    const result = await request("/api/admin", {
      method: "PUT",
      body: JSON.stringify({ communities }),
    });
    showEditor(result.communities);
    setStatus("Changes saved.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

document.querySelector("#reload-button").addEventListener("click", async () => {
  setStatus("Reloading...");
  try {
    await loadCommunities();
  } catch (error) {
    setStatus(error.message, "error");
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await request("/api/admin", {
      method: "POST",
      body: JSON.stringify({ action: "logout" }),
    });
  } finally {
    showLogin();
    setStatus("Signed out.");
  }
});

loadCommunities().catch((error) => {
  showLogin();
  if (error.message !== "Sign in to continue.") setStatus(error.message, "error");
});