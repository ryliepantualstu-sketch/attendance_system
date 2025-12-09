import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";
import "./StudentDashboard.css";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const userName = localStorage.getItem("userName") || "Student";
  const userRole = localStorage.getItem("userRole") || "student";
  const userId = localStorage.getItem("userId");
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [activePage, setActivePage] = useState("dashboard");
  const [studentCourse, setStudentCourse] = useState("Not Assigned");
  const [studentYearLevel, setStudentYearLevel] = useState("");
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [grades, setGrades] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({
    presentCount: 0,
    totalDays: 0,
    attendanceRate: 0
  });

  // Fetch student's course and attendance
  useEffect(() => {
    if (userId) {
      // Fetch user data
      fetch(`${apiUrl}/api/users/${userId}`)
        .then(res => res.json())
        .then(data => {
          console.log("Fetched user data:", data);
          if (data.course && data.course.trim() !== "") {
            setStudentCourse(data.course);
          }
          if (data.studentYearLevel) {
            setStudentYearLevel(data.studentYearLevel);
          }
        })
        .catch(err => console.error("Error fetching course:", err));

      // Fetch attendance history
      fetch(`${apiUrl}/api/attendance/student/${userId}`)
        .then(res => res.json())
        .then(data => {
          console.log("Fetched attendance:", data);
          setAttendanceHistory(data);
          
          // Calculate stats
          const presentCount = data.filter(record => record.status === 'present').length;
          const totalDays = data.length;
          const rate = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;
          
          setAttendanceStats({
            presentCount,
            totalDays,
            attendanceRate: rate
          });
        })
        .catch(err => console.error("Error fetching attendance:", err));

      // Fetch grades
      fetch(`${apiUrl}/api/grades/student/${userId}`)
        .then(res => res.json())
        .then(data => {
          console.log("Fetched grades:", data);
          setGrades(data);
        })
        .catch(err => console.error("Error fetching grades:", err));
    }
  }, [userId, apiUrl]);

  useEffect(() => {
    document.title = "Student Dashboard";
    
    if (chartRef.current) {
      const ctx = chartRef.current.getContext("2d");
      
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      
      chartInstance.current = new Chart(ctx, {
        type: "line",
        data: {
          labels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"],
          datasets: [
            {
              label: "Average Grade",
              data: [85, 88, 87, 90, 89, 91],
              borderColor: "rgba(43,89,62,1)",
              backgroundColor: "rgba(43,89,62,0.12)",
              tension: 0.3,
              fill: true,
              pointRadius: 5,
              pointBackgroundColor: "rgba(43,89,62,1)",
              pointBorderColor: "#fff",
              pointBorderWidth: 2,
              borderWidth: 3,
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
              beginAtZero: false,
              min: 70,
              max: 100,
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
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="app fade-in" data-theme="">
      {/* SIDEBAR */}
      <div className="sidebar">
        <h2>🎓 Student Panel</h2>
        <button
          type="button"
          className={activePage === "dashboard" ? "nav-link active" : "nav-link"}
          onClick={() => setActivePage("dashboard")}
        >
          <span>📊</span><span>Dashboard</span>
        </button>
        <button
          type="button"
          className={activePage === "courses" ? "nav-link active" : "nav-link"}
          onClick={() => setActivePage("courses")}
        >
          <span>📚</span><span>My Course</span>
        </button>
        <button
          type="button"
          className={activePage === "attendance" ? "nav-link active" : "nav-link"}
          onClick={() => setActivePage("attendance")}
        >
          <span>📅</span><span>Attendance</span>
        </button>
        <button
          type="button"
          className={activePage === "grades" ? "nav-link active" : "nav-link"}
          onClick={() => setActivePage("grades")}
        >
          <span>🎯</span><span>Grades</span>
        </button>
        <button 
          type="button" 
          onClick={handleLogout} 
          className="logout-btn"
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
        {/* DASHBOARD PAGE */}
        {activePage === "dashboard" && (
          <section className="page-section active">
            <div className="row">
              <div className="card stat fade-in">
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📚</div>
                  <div>
                    <h2>1</h2>
                    <p>Enrolled Course</p>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--accent2)', marginTop: '8px' }}>
                    ✓ {studentCourse} {studentYearLevel && `- ${studentYearLevel}`}
                  </div>
                </div>
              <div className="card stat fade-in">
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>✓</div>
                <div>
                  <h2>{attendanceStats.attendanceRate}%</h2>
                  <p>Attendance Rate</p>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--accent2)', marginTop: '8px' }}>
                  {attendanceStats.attendanceRate >= 75 ? 'Good standing' : 'Need improvement'}
                </div>
              </div>
              <div className="card stat fade-in">
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📅</div>
                <div>
                  <h2>{attendanceStats.presentCount}</h2>
                  <p>Classes Attended</p>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--accent2)', marginTop: '8px' }}>
                  Out of {attendanceStats.totalDays} total
                </div>
              </div>
              <div className="card stat fade-in">
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏆</div>
                <div>
                  <h2>91%</h2>
                  <p>Average Grade</p>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--accent2)', marginTop: '8px' }}>
                  A- Grade
                </div>
              </div>
            </div>
            
            {/* RECENT ATTENDANCE */}
            <div className="card fade-in" style={{ marginTop: '20px' }}>
              <h3 style={{ marginBottom: '15px', color: 'var(--accent)' }}>
                📋 Recent Attendance
              </h3>
              {attendanceHistory.length === 0 ? (
                <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px' }}>
                  No attendance records yet
                </p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Course</th>
                      <th>Year Level</th>
                      <th>Teacher</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceHistory.slice(0, 5).map((record, index) => (
                      <tr key={index}>
                        <td>{new Date(record.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}</td>
                        <td><strong>{record.course}</strong></td>
                        <td>{record.year_level}</td>
                        <td>{record.teacher_name || 'N/A'}</td>
                        <td>
                          <span className={`badge ${record.status === 'present' ? 'success' : 'danger'}`}>
                            {record.status === 'present' ? '✓ Present' : '✗ Absent'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}
        {/* COURSES PAGE */}
        {activePage === "courses" && (
          <div className="fade-in">
            <h2 style={{ color: 'var(--accent)', marginBottom: '20px' }}>📚 My Course</h2>
            {studentCourse === "Not Assigned" ? (
              <div className="card">
                <h3 style={{ color: 'var(--muted)' }}>No Course Assigned</h3>
                <p style={{ marginTop: '10px', color: 'var(--muted)' }}>
                  Please contact your administrator to be enrolled in a course.
                </p>
              </div>
            ) : (
              <div className="row">
                <div className="card fade-in" style={{ minWidth: '300px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>
                    {studentCourse === "Information System" && "📊"}
                    {studentCourse === "Criminology" && "⚖️"}
                    {studentCourse === "Psychology" && "🧠"}
                    {studentCourse === "Tourism Management" && "✈️"}
                    {studentCourse === "Accountancy" && "💼"}
                  </div>
                  <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>{studentCourse}</h2>
                  
                  {/* Course Description */}
                  {studentCourse === "Information System" && (
                    <p style={{ marginTop: '10px', color: 'var(--muted)', fontSize: '13px', lineHeight: '1.6' }}>
                      Learn to design, implement, and manage information systems that support business operations and decision-making. 
                      Focus on database management, systems analysis, software development, and IT infrastructure.
                    </p>
                  )}
                  {studentCourse === "Criminology" && (
                    <p style={{ marginTop: '10px', color: 'var(--muted)', fontSize: '13px', lineHeight: '1.6' }}>
                      Study the nature, causes, and control of criminal behavior. Explore criminal justice systems, law enforcement, 
                      forensic science, crime prevention strategies, and rehabilitation programs.
                    </p>
                  )}
                  {studentCourse === "Psychology" && (
                    <p style={{ marginTop: '10px', color: 'var(--muted)', fontSize: '13px', lineHeight: '1.6' }}>
                      Understand human behavior, mental processes, and emotional development. Study cognitive psychology, 
                      clinical psychology, developmental psychology, and research methodologies in behavioral science.
                    </p>
                  )}
                  {studentCourse === "Tourism Management" && (
                    <p style={{ marginTop: '10px', color: 'var(--muted)', fontSize: '13px', lineHeight: '1.6' }}>
                      Master the business of travel and hospitality. Learn tourism planning, destination management, 
                      customer service excellence, travel operations, and sustainable tourism practices.
                    </p>
                  )}
                  {studentCourse === "Accountancy" && (
                    <p style={{ marginTop: '10px', color: 'var(--muted)', fontSize: '13px', lineHeight: '1.6' }}>
                      Prepare for a career in accounting, auditing, and financial management. Study financial accounting, 
                      taxation, auditing principles, cost accounting, and business law to become a Certified Public Accountant.
                    </p>
                  )}
                  
                  <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                    <span className="badge success">✓ Enrolled</span>
                    <span className="badge success">Active</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {/* ATTENDANCE PAGE */}
        {activePage === "attendance" && (
          <div className="fade-in">
            <h2 style={{ color: 'var(--accent)', marginBottom: '20px' }}>📅 Attendance History</h2>
            
            {/* Summary Stats */}
            <div className="row" style={{ marginBottom: '20px' }}>
              <div className="card stat">
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>✓</div>
                <div>
                  <h2>{attendanceStats.presentCount}</h2>
                  <p>Present</p>
                </div>
              </div>
              <div className="card stat">
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>✗</div>
                <div>
                  <h2>{attendanceStats.totalDays - attendanceStats.presentCount}</h2>
                  <p>Absent</p>
                </div>
              </div>
              <div className="card stat">
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
                <div>
                  <h2>{attendanceStats.attendanceRate}%</h2>
                  <p>Attendance Rate</p>
                </div>
              </div>
            </div>

            {/* Full Attendance Table */}
            <div className="card">
              {attendanceHistory.length === 0 ? (
                <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px' }}>
                  No attendance records found. Your teacher will mark your attendance.
                </p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Course</th>
                      <th>Year Level</th>
                      <th>Teacher</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceHistory.map((record, index) => (
                      <tr key={index}>
                        <td>{new Date(record.date).toLocaleDateString('en-US', { 
                          weekday: 'short',
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}</td>
                        <td><strong>{record.course}</strong></td>
                        <td>{record.year_level}</td>
                        <td>{record.teacher_name || 'N/A'}</td>
                        <td>
                          <span className={`badge ${record.status === 'present' ? 'success' : 'danger'}`}>
                            {record.status === 'present' ? '✓ Present' : '✗ Absent'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
        {/* GRADES PAGE */}
        {activePage === "grades" && (
          <div className="fade-in">
            <h2 style={{ color: 'var(--accent)', marginBottom: '20px' }}>🎯 My Grades</h2>
            
            {grades.length === 0 ? (
              <div className="card">
                <p style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                  No grades available yet. Your teacher will post grades soon.
                </p>
              </div>
            ) : (
              <>
                {/* Summary Card */}
                <div className="row" style={{ marginBottom: '20px' }}>
                  <div className="card stat">
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📚</div>
                    <div>
                      <h2>{grades.length}</h2>
                      <p>Subjects</p>
                    </div>
                  </div>
                  <div className="card stat">
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
                    <div>
                      <h2>
                        {(() => {
                          if (grades.length === 0) return 'N/A';
                          
                          let totalGrades = 0;
                          let gradeCount = 0;
                          
                          grades.forEach(g => {
                            ['prelim', 'midterm', 'finals'].forEach(term => {
                              const gradeValue = g[term];
                              if (gradeValue && gradeValue !== '' && !isNaN(parseFloat(gradeValue))) {
                                totalGrades += parseFloat(gradeValue);
                                gradeCount++;
                              }
                            });
                          });
                          
                          if (gradeCount === 0) return 'N/A';
                          return (totalGrades / gradeCount).toFixed(2);
                        })()}
                      </h2>
                      <p>Average Grade</p>
                    </div>
                  </div>
                  <div className="card stat">
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>✓</div>
                    <div>
                      <h2>{attendanceStats.attendanceRate}%</h2>
                      <p>Attendance</p>
                    </div>
                  </div>
                </div>

                {/* Grades Table */}
                <div className="card">
                  <table>
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Year Level</th>
                        <th>Subject</th>
                        <th>Semester</th>
                        <th>Prelim</th>
                        <th>Midterm</th>
                        <th>Finals</th>
                        <th>Average</th>
                        <th>Teacher</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grades.map((grade, index) => {
                        const prelim = grade.prelim ? parseFloat(grade.prelim) : null;
                        const midterm = grade.midterm ? parseFloat(grade.midterm) : null;
                        const finals = grade.finals ? parseFloat(grade.finals) : null;
                        
                        // Calculate average
                        const gradeValues = [prelim, midterm, finals].filter(g => g !== null);
                        const average = gradeValues.length > 0 
                          ? (gradeValues.reduce((sum, g) => sum + g, 0) / gradeValues.length).toFixed(2)
                          : null;
                        
                        const getGradeBadge = (gradeValue) => {
                          if (!gradeValue) return null;
                          
                          if (gradeValue === 'INC') {
                            return <span className="badge warning">INC</span>;
                          }
                          
                          const numGrade = parseFloat(gradeValue);
                          let badgeClass = 'success';
                          
                          if (numGrade >= 1.00 && numGrade <= 1.75) {
                            badgeClass = 'success';
                          } else if (numGrade >= 2.00 && numGrade <= 3.00) {
                            badgeClass = 'success';
                          } else if (numGrade === 4.00) {
                            badgeClass = 'warning';
                          } else if (numGrade === 5.00) {
                            badgeClass = 'danger';
                          }
                          
                          return <span className={`badge ${badgeClass}`}>{gradeValue}</span>;
                        };
                        
                        return (
                          <tr key={index}>
                            <td><strong>{grade.course}</strong></td>
                            <td>Year {grade.year_level}</td>
                            <td>{grade.subject}</td>
                            <td>
                              <span style={{ 
                                fontSize: '12px', 
                                padding: '4px 8px', 
                                background: '#f0f0f0', 
                                borderRadius: '4px',
                                color: 'var(--accent)'
                              }}>
                                {grade.semester}
                              </span>
                            </td>
                            <td>{grade.prelim ? getGradeBadge(grade.prelim) : <span style={{color: 'var(--muted)'}}>-</span>}</td>
                            <td>{grade.midterm ? getGradeBadge(grade.midterm) : <span style={{color: 'var(--muted)'}}>-</span>}</td>
                            <td>{grade.finals ? getGradeBadge(grade.finals) : <span style={{color: 'var(--muted)'}}>-</span>}</td>
                            <td>
                              {average ? (
                                <strong style={{ color: 'var(--accent)' }}>{average}</strong>
                              ) : (
                                <span style={{color: 'var(--muted)'}}>-</span>
                              )}
                            </td>
                            <td>{grade.teacher_name || 'N/A'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
        {/* OTHER PAGES PLACEHOLDER */}
        {activePage !== "dashboard" && activePage !== "courses" && activePage !== "attendance" && activePage !== "grades" && (
          <div className="card fade-in">
            <h3 style={{ color: 'var(--accent)' }}>{activePage.charAt(0).toUpperCase() + activePage.slice(1)}</h3>
            <p style={{ marginTop: '10px', color: 'var(--muted)' }}>This section is coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
