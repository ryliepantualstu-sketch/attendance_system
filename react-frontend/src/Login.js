import React, { useState } from "react";
import "./Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });
      let data;
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        data = await res.json();
      } else {
        // Non-JSON response
        const text = await res.text();
        throw new Error(`Unexpected response: ${text.substring(0,120)}`);
      }
      if (!res.ok) {
        setMessage(data.error ? `Login failed: ${data.error}` : `Login failed (status ${res.status})`);
        return;
      }
      if (!data.token || !data.user) {
        setMessage("Login failed: malformed server response");
        return;
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("userRole", data.user.role);
      localStorage.setItem("userName", data.user.name);
      localStorage.setItem("userId", data.user.id);
      if (data.user.role === "admin") window.location.href = "/adminDashboard";
      else if (data.user.role === "teacher") window.location.href = "/teacherDashboard";
      else if (data.user.role === "student") window.location.href = "/studentDashboard";
    } catch (err) {
      if (err.name === "TypeError") {
        // Usually network error / failed to fetch
        setMessage("Network error: cannot reach server. Ensure backend is running on " + API_BASE);
      } else {
        setMessage("Error: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <img
        src="https://scontent-mnl3-3.xx.fbcdn.net/v/t39.30808-1/509362095_1121702283333386_5662152557247284806_n.jpg?stp=dst-jpg_s200x200_tt6&_nc_cat=108&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=s9jiqovhY80Q7kNvwGWrIDG&_nc_oc=Adnm8cwq9L49lNO_hxdNdAWDvPGhA7ifPtHMHQhK9ncwXRzWtF6xlLTz9aEHhje4mUA&_nc_zt=24&_nc_ht=scontent-mnl3-3.xx&_nc_gid=2DmpX5ge8c0T9XOWK2ApVA&oh=00_AfhKZxi67_iBrupPXu2JG5YiS-EZVimHzDF1iUM9pOizOw&oe=692E247E"
        alt="Logo"
        className="logo"
      />
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ paddingRight: '45px', width: '100%' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '10px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
              padding: '5px 8px',
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 'auto',
              margin: 0,
              minWidth: 'unset'
            }}
          >
            {showPassword ? '👁️' : '🔒'}
          </button>
        </div>
        <button type="submit" disabled={loading}>
          Login
          {loading && <div className="loading-spinner" />}
        </button>
      </form>
      {message && <div id="message">{message}</div>}
    </div>
  );
};

export default Login;
