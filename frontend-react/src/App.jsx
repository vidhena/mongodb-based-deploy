import { useState } from "react";
import "./App.css";

const API_URL = "https://mongodb-based-deploy-1.onrender.com";

function App() {
  const [page, setPage] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const endpoint =
      page === "register" ? "/api/register" : "/api/login";

    const body =
      page === "register"
        ? { name, email, password }
        : { email, password };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Request failed");
      }

      if (page === "register") {
        setMessage("Registration successful! Please log in.");
        setPage("login");
        setPassword("");
      } else {
        const authToken = data.token || data.accessToken;

        if (!authToken) {
          throw new Error("Login succeeded, but the token was not returned.");
        }

        setToken(authToken);
        setPage("welcome");
        setMessage("");
      }
    } catch (error) {
      setMessage(
        error.message === "Failed to fetch"
          ? "Cannot connect to the backend. Check the server and CORS settings."
          : error.message
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleWelcome() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/welcome`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load welcome message.");
      }

      setMessage(data.message || data.welcomeMessage || "Welcome!");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setToken("");
    setName("");
    setEmail("");
    setPassword("");
    setMessage("");
    setPage("login");
  }

  return (
    <main className="app">
      <section className="card">
        <h1>My Application</h1>
        <p className="subtitle">MongoDB User Portal</p>

        {page !== "welcome" ? (
          <>
            <div className="tabs">
              <button
                className={page === "login" ? "active" : ""}
                onClick={() => {
                  setPage("login");
                  setMessage("");
                }}
              >
                Login
              </button>

              <button
                className={page === "register" ? "active" : ""}
                onClick={() => {
                  setPage("register");
                  setMessage("");
                }}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {page === "register" && (
                <label>
                  Name
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    required
                  />
                </label>
              )}

              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </label>

              <button className="primary" type="submit" disabled={loading}>
                {loading
                  ? "Please wait..."
                  : page === "register"
                    ? "Create Account"
                    : "Login"}
              </button>
            </form>
          </>
        ) : (
          <div className="welcome">
            <h2>Welcome!</h2>
            <p>You have logged in successfully.</p>

            <button
              className="primary"
              onClick={handleWelcome}
              disabled={loading}
            >
              {loading ? "Loading..." : "Load Welcome Message"}
            </button>

            <button className="secondary" onClick={logout}>
              Logout
            </button>
          </div>
        )}

        {message && <p className="message">{message}</p>}
      </section>
    </main>
  );
}

export default App;