// Local backend URL.
// Change this to your deployed Render backend URL later.
const API_URL = "http://localhost:3000";

const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const authSection = document.getElementById("authSection");
const welcomeSection = document.getElementById("welcomeSection");

const message = document.getElementById("message");
const welcomeTitle = document.getElementById("welcomeTitle");
const welcomeMessage = document.getElementById("welcomeMessage");
const logoutBtn = document.getElementById("logoutBtn");

function showMessage(text, type = "error") {
    message.textContent = text;
    message.className = `message ${type}`;
}

function clearMessage() {
    message.textContent = "";
    message.className = "message hidden";
}

function showLogin() {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");

    loginTab.classList.add("active");
    registerTab.classList.remove("active");

    clearMessage();
}

function showRegister() {
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");

    registerTab.classList.add("active");
    loginTab.classList.remove("active");

    clearMessage();
}

loginTab.addEventListener("click", showLogin);
registerTab.addEventListener("click", showRegister);

async function apiRequest(path, options = {}) {
    let response;

    try {
        response = await fetch(`${API_URL}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });
    } catch {
        throw new Error(
            "Cannot connect to the backend. Check that your server is running."
        );
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || data.error || "Request failed.");
    }

    return data;
}

// Registration
registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    const button = registerForm.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = "Creating account...";

    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    try {
        const data = await apiRequest("/api/register", {
            method: "POST",
            body: JSON.stringify({ name, email, password })
        });

        showMessage(
            data.message || "Registration successful! Please log in.",
            "success"
        );

        registerForm.reset();

        setTimeout(() => {
            showLogin();
            document.getElementById("loginEmail").value = email;
        }, 900);

    } catch (error) {
        showMessage(error.message);
    } finally {
        button.disabled = false;
        button.textContent = "Create Account";
    }
});

// Login
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    const button = loginForm.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = "Logging in...";

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
        const data = await apiRequest("/api/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });

        if (!data.token) {
            throw new Error("Login succeeded but the server did not return a token.");
        }

        // Simple demo storage. Prefer HttpOnly Secure cookies for production.
        sessionStorage.setItem("authToken", data.token);

        loginForm.reset();

        await loadWelcome();

    } catch (error) {
        showMessage(error.message);
    } finally {
        button.disabled = false;
        button.textContent = "Login";
    }
});

// Load the protected welcome page
async function loadWelcome() {
    const token = sessionStorage.getItem("authToken");

    if (!token) {
        showAuth();
        return;
    }

    try {
        const data = await apiRequest("/api/welcome", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        authSection.classList.add("hidden");
        welcomeSection.classList.remove("hidden");

        welcomeTitle.textContent = "You're logged in!";
        welcomeMessage.textContent =
            data.message || `Welcome, ${data.user?.name || "user"}!`;

    } catch (error) {
        sessionStorage.removeItem("authToken");
        showAuth();
        showMessage(error.message);
    }
}

function showAuth() {
    welcomeSection.classList.add("hidden");
    authSection.classList.remove("hidden");
}

// Logout
logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("authToken");

    welcomeSection.classList.add("hidden");
    authSection.classList.remove("hidden");

    loginForm.reset();
    showLogin();
    showMessage("You have logged out successfully.", "success");
});

// Restore the welcome page after a refresh, if the token is still valid.
document.addEventListener("DOMContentLoaded", loadWelcome);