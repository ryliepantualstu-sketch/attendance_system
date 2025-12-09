import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const userName = localStorage.getItem("userName") || "Admin";
  const userRole = localStorage.getItem("userRole") || "admin";
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
  
  const [activeView, setActiveView] = useState("dashboard");
  const [users, setUsers] = useState([]);
  const [grades, setGrades] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("All");
  const [selectedSection, setSelectedSection] = useState("All");
  const [expandedStudents, setExpandedStudents] = useState({}); // Track expanded students in grades view
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    course: "",
    section: "",
    sections: [],
    courses: [],
    yearLevel: [],
    studentYearLevel: ""
  });
  
  const [stats, setStats] = useState({
    users: 0,
    teachers: 0,
    students: 0,
    courses: 5
  });

  // Fetch users from API
  const fetchUsers = async () => {
    console.log("=== FETCH USERS STARTED ===");
    console.log("API URL:", apiUrl);
    
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${apiUrl}/api/users`);
      
      console.log("Fetch response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch users");
      }
      
      const data = await response.json();
      console.log("Fetched users count:", data.length);
      setUsers(data);
      
      // Update stats
      const teachers = data.filter(u => u.role === "teacher").length;
      const students = data.filter(u => u.role === "student").length;
      setStats({
        users: data.length,
        teachers,
        students,
        courses: 5
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add new user
  const handleAddUser = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name || !formData.email || !formData.password || !formData.role) {
      setError("All fields are required");
      return;
    }
    
    console.log("=== ADD USER STARTED ===");
    console.log("Form Data:", formData);
    console.log("API URL:", apiUrl);
    
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const url = `${apiUrl}/api/users`;
      console.log("Sending POST request to:", url);
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });
      
      console.log("Response status:", response.status);
      
      let data;
      try {
        data = await response.json();
        console.log("Response data:", data);
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        throw new Error("Invalid response from server");
      }
      
      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      
      setSuccess(`${formData.role === "teacher" ? "Teacher" : "Student"} "${formData.name}" added successfully!`);
      setFormData({ name: "", email: "", password: "", role: "student", course: "" });
      setShowAddForm(false);
      await fetchUsers();
    } catch (err) {
      console.error("=== ERROR ADDING USER ===");
      console.error("Error:", err);
      console.error("Error message:", err.message);
      setError(err.message || "Failed to add user. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  // Update user
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const updateData = { ...formData };
      if (!updateData.password) delete updateData.password;
      
      const response = await fetch(`${apiUrl}/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update user");
      }
      
      setSuccess("User updated successfully!");
      setFormData({ name: "", email: "", password: "", role: "student", course: "" });
      setEditingUser(null);
      setShowAddForm(false);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete "${userName}"?`)) {
      console.log("Delete cancelled by user");
      return;
    }
    
    console.log("=== DELETE USER STARTED ===");
    console.log("User ID:", userId);
    console.log("User Name:", userName);
    
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const url = `${apiUrl}/api/users/${userId}`;
      console.log("Sending DELETE request to:", url);
      
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      console.log("Response status:", response.status);
      
      let data;
      try {
        data = await response.json();
        console.log("Response data:", data);
      } catch (parseError) {
        console.log("No JSON response (might be ok)");
      }
      
      if (!response.ok) {
        throw new Error(data?.error || `Failed to delete user (status: ${response.status})`);
      }
      
      setSuccess(`User "${userName}" deleted successfully!`);
      await fetchUsers();
    } catch (err) {
      console.error("=== ERROR DELETING USER ===");
      console.error("Error:", err);
      setError(err.message || "Failed to delete user. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  // Edit user
  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      course: user.course || "",
      section: user.section || "",
      sections: user.sections ? (typeof user.sections === 'string' ? JSON.parse(user.sections) : user.sections) : [],
      courses: user.courses ? (typeof user.courses === 'string' ? JSON.parse(user.courses) : user.courses) : [],
      yearLevel: user.yearLevel ? (typeof user.yearLevel === 'string' ? JSON.parse(user.yearLevel) : user.yearLevel) : [],
      studentYearLevel: user.studentYearLevel || ""
    });
    setShowAddForm(true);
    setError("");
    setSuccess("");
  };

  // Cancel form
  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingUser(null);
    setFormData({ name: "", email: "", password: "", role: "student", course: "", section: "", sections: [], courses: [], yearLevel: [], studentYearLevel: "" });
    setError("");
    setSuccess("");
  };

  useEffect(() => {
    document.title = "Admin Dashboard";
    
    // Initialize chart with proper cleanup
    if (chartRef.current && activeView === "dashboard") {
      const ctx = chartRef.current.getContext("2d");
      
      // Destroy existing chart instance
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      
      chartInstance.current = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
          datasets: [
            {
              label: "Active Users",
              data: [120, 150, 170, 160, 180, 195],
              backgroundColor: "rgba(43,89,62,0.7)",
              borderColor: "rgba(43,89,62,1)",
              borderWidth: 2,
              borderRadius: 8,
            },
          ],
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0,0,0,0.05)'
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          }
        },
      });
    }
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [activeView]);

  useEffect(() => {
    if (activeView === "users") {
      fetchUsers();
    }
    if (activeView === "grades") {
      fetchGrades();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  // Fetch grades from API
  const fetchGrades = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${apiUrl}/api/grades`);
      if (!response.ok) {
        throw new Error("Failed to fetch grades");
      }
      const data = await response.json();
      setGrades(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="app fade-in" data-theme="">
      {/* SIDEBAR */}
      <div className="sidebar">
        <h2>🎓 Admin Panel</h2>
        <a 
          href="#/dashboard" 
          className={activeView === "dashboard" ? "active" : ""}
          onClick={(e) => { e.preventDefault(); setActiveView("dashboard"); }}
        >
          <span>📊</span><span>Dashboard</span>
        </a>
        <a 
          href="#/users" 
          className={activeView === "users" ? "active" : ""}
          onClick={(e) => { e.preventDefault(); setActiveView("users"); }}
        >
          <span>👥</span><span>Manage Users</span>
        </a>
        <a 
          href="#/grades" 
          className={activeView === "grades" ? "active" : ""}
          onClick={(e) => { e.preventDefault(); setActiveView("grades"); }}
        >
          <span>📝</span><span>Student Grades</span>
        </a>
        <button
          type="button"
          onClick={handleLogout}
          className="logout-btn glass-btn"
          style={{ marginTop: 'auto' }}
        >
          <span>🚪</span><span>Logout</span>
        </button>
      </div>
      {/* MAIN */}
      <div className="main">
        <div className="topbar">
          <h1>Welcome, <span style={{ color: 'var(--accent)' }}>{userName}</span></h1>
          <div className="profile-box">
            <div className="avatar">{userName[0].toUpperCase()}</div>
            <div>
              <strong>{userName}</strong>
              <p style={{ fontSize: '12px', margin: 0, opacity: 0.8 }}>{userRole}</p>
            </div>
          </div>
        </div>

        {/* ALERTS */}
        {error && (
          <div className="alert alert-error fade-in">
            <span>⚠️</span> {error}
            <button onClick={() => setError("")}>×</button>
          </div>
        )}
        {success && (
          <div className="alert alert-success fade-in">
            <span>✓</span> {success}
            <button onClick={() => setSuccess("")}>×</button>
          </div>
        )}
        
        {/* DASHBOARD VIEW */}
        {activeView === "dashboard" && (
          <>
            {/* STATS CARDS */}
            <div className="cards">
              <div className="card fade-in">
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
                <h2>{stats.users}</h2>
                <p>Total Users</p>
                <div style={{ fontSize: '12px', color: 'var(--accent2)', marginTop: '8px' }}>
                  Teachers + Students
                </div>
              </div>
              <div className="card fade-in">
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>👨‍🏫</div>
                <h2>{stats.teachers}</h2>
                <p>Teachers</p>
                <div style={{ fontSize: '12px', color: 'var(--accent2)', marginTop: '8px' }}>
                  Active instructors
                </div>
              </div>
              <div className="card fade-in">
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎓</div>
                <h2>{stats.students}</h2>
                <p>Students</p>
                <div style={{ fontSize: '12px', color: 'var(--accent2)', marginTop: '8px' }}>
                  Enrolled learners
                </div>
              </div>
              <div className="card fade-in">
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📚</div>
                <h2>{stats.courses}</h2>
                <p>Active Courses</p>
                <div style={{ fontSize: '12px', color: 'var(--accent2)', marginTop: '8px' }}>
                  Available programs
                </div>
              </div>
            </div>
          </>
        )}

        {/* USERS MANAGEMENT VIEW */}
        {activeView === "users" && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '20px', gap: '15px' }}>
              <h2 style={{ color: 'var(--accent)', marginRight: 'auto' }}>👥 User Management</h2>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setEditingUser(null);
                  setFormData({ name: "", email: "", password: "", role: "student", course: "", sections: [], courses: [], yearLevel: [], studentYearLevel: "" });
                  setError("");
                  setSuccess("");
                }}
              >
                {showAddForm ? "✕ Cancel" : "+ Add User"}
              </button>
            </div>

            {/* ADD/EDIT FORM */}
            {showAddForm && (
              <div className="card fade-in" style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '15px', color: 'var(--accent)' }}>
                  {editingUser ? "✏️ Edit User" : "➕ Add New User"}
                </h3>
                <form onSubmit={editingUser ? handleUpdateUser : handleAddUser} className="user-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                        placeholder="Enter full name"
                      />
                    </div>
                    <div className="form-group">
                      <label>Email *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required
                        placeholder="Enter email address"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Password {editingUser && "(leave blank to keep current)"}</label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        required={!editingUser}
                        placeholder="Enter password"
                      />
                    </div>
                    <div className="form-group">
                      <label>Role *</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        required
                      >
                        <option value="student">🎓 Student</option>
                        <option value="teacher">👨‍🏫 Teacher</option>
                        <option value="admin">👑 Admin</option>
                      </select>
                    </div>
                  </div>
                  {formData.role === "student" && (
                    <>
                      <div className="form-group" style={{ position: 'relative', zIndex: 1 }}>
                        <label>Course *</label>
                        <select
                          value={formData.course}
                          onChange={(e) => setFormData({...formData, course: e.target.value})}
                          required
                        >
                          <option value="">Select a course</option>
                          <option value="Information System">📊 Information System</option>
                          <option value="Criminology">⚖️ Criminology</option>
                          <option value="Psychology">🧠 Psychology</option>
                          <option value="Tourism Management">✈️ Tourism Management</option>
                          <option value="Accountancy">💼 Accountancy</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ position: 'relative', zIndex: 1 }}>
                        <label>Year Level *</label>
                        <select
                          value={formData.studentYearLevel}
                          onChange={(e) => setFormData({...formData, studentYearLevel: e.target.value})}
                          required
                        >
                          <option value="">Select year level</option>
                          <option value="1st Year">1st Year</option>
                          <option value="2nd Year">2nd Year</option>
                          <option value="3rd Year">3rd Year</option>
                          <option value="4th Year">4th Year</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ position: 'relative', zIndex: 1 }}>
                        <label>Section *</label>
                        <select
                          value={formData.section}
                          onChange={(e) => setFormData({...formData, section: e.target.value})}
                          required
                        >
                          <option value="">Select section</option>
                          <option value="A">Section A</option>
                          <option value="B">Section B</option>
                          <option value="C">Section C</option>
                        </select>
                      </div>
                    </>
                  )}
                  {formData.role === "teacher" && (
                    <>
                      <div className="form-group" style={{ position: 'relative', zIndex: 1 }}>
                        <label>Courses to Teach *</label>
                        <div style={{ 
                          border: '1px solid rgba(0,0,0,0.1)', 
                          borderRadius: '8px', 
                          padding: '15px',
                          background: 'white'
                        }}>
                          {['Information System', 'Criminology', 'Psychology', 'Tourism Management', 'Accountancy'].map(course => (
                            <label key={course} style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              marginBottom: '10px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}>
                              <input
                                type="checkbox"
                                checked={formData.courses.includes(course)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({...formData, courses: [...formData.courses, course]});
                                  } else {
                                    setFormData({...formData, courses: formData.courses.filter(c => c !== course)});
                                  }
                                }}
                                style={{ marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
                              />
                              <span>
                                {course === 'Information System' && '📊 '}
                                {course === 'Criminology' && '⚖️ '}
                                {course === 'Psychology' && '🧠 '}
                                {course === 'Tourism Management' && '✈️ '}
                                {course === 'Accountancy' && '💼 '}
                                {course}
                              </span>
                            </label>
                          ))}
                        </div>
                        <small style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                          Selected: {formData.courses.length > 0 ? formData.courses.join(', ') : 'None'}
                        </small>
                      </div>
                      <div className="form-group" style={{ position: 'relative', zIndex: 1 }}>
                        <label>Year Levels to Teach *</label>
                        <div style={{ 
                          border: '1px solid rgba(0,0,0,0.1)', 
                          borderRadius: '8px', 
                          padding: '15px',
                          background: 'white'
                        }}>
                          {['1st Year', '2nd Year', '3rd Year', '4th Year'].map(year => (
                            <div key={year} style={{ marginBottom: '15px' }}>
                              <label style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                marginBottom: '10px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '600'
                              }}>
                                <input
                                  type="checkbox"
                                  checked={formData.yearLevel.includes(year)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData({...formData, yearLevel: [...formData.yearLevel, year]});
                                    } else {
                                      // Remove year and also remove sections for this year
                                      const newYearLevels = formData.yearLevel.filter(y => y !== year);
                                      const newSections = formData.sections.filter(s => !s.startsWith(`${year}-`));
                                      setFormData({
                                        ...formData, 
                                        yearLevel: newYearLevels,
                                        sections: newSections
                                      });
                                    }
                                  }}
                                  style={{ marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                {year}
                              </label>
                              
                              {/* Show sections for this year level if checked */}
                              {formData.yearLevel.includes(year) && (
                                <div style={{ 
                                  marginLeft: '30px', 
                                  padding: '10px',
                                  background: '#f8f9fa',
                                  borderRadius: '6px',
                                  border: '1px solid #e0e0e0'
                                }}>
                                  <small style={{ display: 'block', marginBottom: '8px', color: 'var(--muted)', fontWeight: '500' }}>
                                    Select sections for {year}:
                                  </small>
                                  {['A', 'B', 'C'].map(section => (
                                    <label key={section} style={{ 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      marginRight: '15px',
                                      marginBottom: '5px',
                                      cursor: 'pointer',
                                      fontSize: '13px'
                                    }}>
                                      <input
                                        type="checkbox"
                                        checked={formData.sections.includes(`${year}-${section}`)}
                                        onChange={(e) => {
                                          const sectionKey = `${year}-${section}`;
                                          if (e.target.checked) {
                                            setFormData({...formData, sections: [...formData.sections, sectionKey]});
                                          } else {
                                            setFormData({...formData, sections: formData.sections.filter(s => s !== sectionKey)});
                                          }
                                        }}
                                        style={{ marginRight: '6px', width: '16px', height: '16px', cursor: 'pointer' }}
                                      />
                                      Section {section}
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <small style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                          Selected: {formData.yearLevel.length > 0 ? formData.yearLevel.join(', ') : 'None'}
                        </small>
                        {formData.sections.length > 0 && (
                          <div style={{ marginTop: '10px' }}>
                            <small style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>
                              Sections Summary:
                            </small>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                              {formData.sections.map(sec => (
                                <span key={sec} className="badge" style={{ fontSize: '11px', background: 'var(--accent)', color: 'white' }}>
                                  {sec.replace('-', ' - Section ')}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? "⏳ Processing..." : (editingUser ? "💾 Update User" : "✓ Add User")}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={handleCancelForm}>
                      ✕ Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TEACHERS TABLE */}
            <div className="card fade-in">
              <h3 style={{ marginBottom: '15px', color: 'var(--accent)' }}>
                👨‍🏫 Teachers ({users.filter(u => u.role === 'teacher').length})
              </h3>
              {loading && !users.length ? (
                <p style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                  ⏳ Loading teachers...
                </p>
              ) : users.filter(u => u.role === 'teacher').length === 0 ? (
                <p style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                  No teachers found. Add a teacher using the form above!
                </p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Courses</th>
                        <th>Year Levels</th>
                        <th>Sections</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.filter(u => u.role === 'teacher').map((user) => (
                        <tr key={user.id}>
                          <td>#{user.id}</td>
                          <td><strong>{user.name}</strong></td>
                          <td>{user.email}</td>
                          <td>
                            {user.courses && JSON.parse(user.courses).length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                {JSON.parse(user.courses).map(course => (
                                  <span key={course} className="badge success" style={{ fontSize: '11px' }}>
                                    {course}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--muted)', fontSize: '12px' }}>None</span>
                            )}
                          </td>
                          <td>
                            {user.yearLevel && JSON.parse(user.yearLevel).length > 0 ? (
                              <span style={{ fontSize: '12px' }}>{JSON.parse(user.yearLevel).join(', ')}</span>
                            ) : (
                              <span style={{ color: 'var(--muted)', fontSize: '12px' }}>None</span>
                            )}
                          </td>
                          <td>
                            {user.sections && JSON.parse(user.sections).length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                {JSON.parse(user.sections).map(section => (
                                  <span key={section} className="badge" style={{ fontSize: '11px', background: 'var(--accent)', color: 'white' }}>
                                    Section {section}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--muted)', fontSize: '12px' }}>None</span>
                            )}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button 
                                className="btn-icon btn-edit" 
                                onClick={() => handleEditUser(user)}
                                title="Edit teacher"
                              >
                                ✏️
                              </button>
                              <button 
                                className="btn-icon btn-delete" 
                                onClick={() => handleDeleteUser(user.id, user.name)}
                                title="Delete teacher"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* STUDENTS TABLE */}
            <div className="card fade-in" style={{ marginTop: '30px' }}>
              <h3 style={{ marginBottom: '15px', color: 'var(--accent)' }}>
                🎓 Students ({users.filter(u => u.role === 'student').length})
              </h3>
              {loading && !users.length ? (
                <p style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                  ⏳ Loading students...
                </p>
              ) : users.filter(u => u.role === 'student').length === 0 ? (
                <p style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                  No students found. Add a student using the form above!
                </p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Course</th>
                        <th>Year Level</th>
                        <th>Section</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.filter(u => u.role === 'student').map((user) => (
                        <tr key={user.id}>
                          <td>#{user.id}</td>
                          <td><strong>{user.name}</strong></td>
                          <td>{user.email}</td>
                          <td>
                            {user.course ? (
                              <span className="badge info">{user.course}</span>
                            ) : (
                              <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Not set</span>
                            )}
                          </td>
                          <td>
                            {user.studentYearLevel ? (
                              <span style={{ fontSize: '12px' }}>{user.studentYearLevel}</span>
                            ) : (
                              <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Not set</span>
                            )}
                          </td>
                          <td>
                            {user.section ? (
                              <span className="badge" style={{ background: 'var(--accent)', color: 'white' }}>Section {user.section}</span>
                            ) : (
                              <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Not set</span>
                            )}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button 
                                className="btn-icon btn-edit" 
                                onClick={() => handleEditUser(user)}
                                title="Edit student"
                              >
                                ✏️
                              </button>
                              <button 
                                className="btn-icon btn-delete" 
                                onClick={() => handleDeleteUser(user.id, user.name)}
                                title="Delete student"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* GRADES VIEW */}
        {activeView === "grades" && (
          <>
            <div className="card fade-in">
              <h3 style={{ marginBottom: '15px', color: 'var(--accent)' }}>
                📝 Student Grades Overview
              </h3>
              
              {/* FILTER BUTTONS */}
              <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {/* Course Filter */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                    Filter by Course:
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setSelectedCourse("All")}
                      className={`btn ${selectedCourse === "All" ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      All Courses
                    </button>
                    {['Information System', 'Criminology', 'Psychology', 'Tourism Management', 'Accountancy'].map(course => (
                      <button
                        key={course}
                        onClick={() => setSelectedCourse(course)}
                        className={`btn ${selectedCourse === course ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                      >
                        {course}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Section Filter */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                    Filter by Section:
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setSelectedSection("All")}
                      className={`btn ${selectedSection === "All" ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      All Sections
                    </button>
                    {['A', 'B', 'C'].map(section => (
                      <button
                        key={section}
                        onClick={() => setSelectedSection(section)}
                        className={`btn ${selectedSection === section ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                      >
                        Section {section}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {loading ? (
                <p style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                  ⏳ Loading grades...
                </p>
              ) : grades.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                  No grades found in the system.
                </p>
              ) : (
                <div>
                  {Object.values(grades
                    .filter(grade => {
                      // Filter by course
                      if (selectedCourse !== "All" && grade.course !== selectedCourse) {
                        return false;
                      }
                      // Filter by section
                      if (selectedSection !== "All" && grade.section !== selectedSection) {
                        return false;
                      }
                      return true;
                    })
                    .reduce((acc, grade) => {
                      // Group by student
                      const studentKey = `${grade.student_id}`;
                      if (!acc[studentKey]) {
                        acc[studentKey] = {
                          student_id: grade.student_id,
                          student_name: grade.student_name,
                          course: grade.course,
                          year_level: grade.year_level,
                          section: grade.section,
                          subjects: []
                        };
                      }
                      acc[studentKey].subjects.push({
                        subject: grade.subject,
                        semester: grade.semester,
                        prelim: grade.prelim,
                        midterm: grade.midterm,
                        finals: grade.finals
                      });
                      return acc;
                    }, {}))
                    .map((studentData) => {
                      const isExpanded = expandedStudents[studentData.student_id] || false;
                      
                      // Calculate overall average
                      let totalGrades = 0;
                      let gradeCount = 0;
                      studentData.subjects.forEach(subj => {
                        ['prelim', 'midterm', 'finals'].forEach(term => {
                          const gradeValue = subj[term];
                          if (gradeValue && gradeValue !== '' && !isNaN(parseFloat(gradeValue))) {
                            totalGrades += parseFloat(gradeValue);
                            gradeCount++;
                          }
                        });
                      });
                      const overallAverage = gradeCount > 0 ? (totalGrades / gradeCount).toFixed(2) : 'N/A';
                      
                      return (
                        <div 
                          key={studentData.student_id}
                          style={{
                            marginBottom: '15px',
                            border: '1px solid rgba(0,0,0,0.1)',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            transition: 'all 0.2s'
                          }}
                        >
                          {/* Student Header */}
                          <div
                            onClick={() => setExpandedStudents(prev => ({
                              ...prev,
                              [studentData.student_id]: !prev[studentData.student_id]
                            }))}
                            style={{
                              padding: '15px 20px',
                              background: isExpanded ? '#f8f9fa' : 'white',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#f8f9fa';
                            }}
                            onMouseLeave={(e) => {
                              if (!isExpanded) e.currentTarget.style.background = 'white';
                            }}
                          >
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '15px' }}>
                              <span style={{ 
                                fontSize: '18px',
                                transition: 'transform 0.2s',
                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
                              }}>
                                ▶
                              </span>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <strong style={{ fontSize: '16px' }}>{studentData.student_name}</strong>
                                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>#{studentData.student_id}</span>
                                </div>
                                <div style={{ marginTop: '4px', fontSize: '13px', color: 'var(--muted)', display: 'flex', gap: '15px' }}>
                                  <span className="badge info" style={{ fontSize: '11px' }}>{studentData.course}</span>
                                  <span>Year {studentData.year_level}</span>
                                  {studentData.section && (
                                    <span className="badge" style={{ background: 'var(--accent)', color: 'white', fontSize: '11px' }}>
                                      Section {studentData.section}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '2px' }}>Subjects</div>
                                <div style={{ 
                                  fontSize: '16px', 
                                  fontWeight: '600',
                                  color: 'var(--accent2)'
                                }}>
                                  {studentData.subjects.length}
                                </div>
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '2px' }}>Overall</div>
                                <div style={{ 
                                  fontSize: '16px', 
                                  fontWeight: '600',
                                  color: 'var(--accent)'
                                }}>
                                  {overallAverage}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Expandable Content */}
                          {isExpanded && (
                            <div style={{ 
                              padding: '20px',
                              background: '#f8f9fa',
                              borderTop: '1px solid rgba(0,0,0,0.05)'
                            }}>
                              <h4 style={{ margin: '0 0 15px 0', color: 'var(--accent)', fontSize: '15px' }}>Subject Grades</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {studentData.subjects.map((subj, idx) => {
                                  const subjectAvg = (
                                    (parseFloat(subj.prelim || 0) + 
                                     parseFloat(subj.midterm || 0) + 
                                     parseFloat(subj.finals || 0)) / 3
                                  ).toFixed(2);
                                  
                                  return (
                                    <div 
                                      key={idx}
                                      style={{
                                        padding: '12px',
                                        background: 'white',
                                        borderRadius: '6px',
                                        border: '1px solid #e0e0e0'
                                      }}
                                    >
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                        <div>
                                          <div style={{ fontWeight: '600', color: 'var(--accent)', fontSize: '14px' }}>
                                            {subj.subject}
                                          </div>
                                          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                                            {subj.semester}
                                          </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Average</div>
                                          <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--accent)' }}>
                                            {subjectAvg}
                                          </div>
                                        </div>
                                      </div>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                        <div style={{ textAlign: 'center', padding: '8px', background: 'white', borderRadius: '4px' }}>
                                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Prelim</div>
                                          <div style={{ fontSize: '16px', fontWeight: '600' }}>
                                            {subj.prelim || '-'}
                                          </div>
                                        </div>
                                        <div style={{ textAlign: 'center', padding: '8px', background: 'white', borderRadius: '4px' }}>
                                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Midterm</div>
                                          <div style={{ fontSize: '16px', fontWeight: '600' }}>
                                            {subj.midterm || '-'}
                                          </div>
                                        </div>
                                        <div style={{ textAlign: 'center', padding: '8px', background: 'white', borderRadius: '4px' }}>
                                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Finals</div>
                                          <div style={{ fontSize: '16px', fontWeight: '600' }}>
                                            {subj.finals || '-'}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
