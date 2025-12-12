import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";
import "./TeacherDashboard.css";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const userName = localStorage.getItem("userName") || "Teacher";
  const userRole = localStorage.getItem("userRole") || "teacher";
  const userId = localStorage.getItem("userId");
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [activePage, setActivePage] = useState("dashboard");
  const [students, setStudents] = useState([]);
  const [teacherData, setTeacherData] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    classes: 0,
    students: 0,
    attendance: 0,
    totalPresent: 0,
    totalDays: 0
  });

  // Load attendance stats for classes page
  const loadAttendanceStats = useCallback(async () => {
    if (!selectedClass) return;
    
    try {
      const response = await fetch(
        `${apiUrl}/api/attendance/stats?course=${encodeURIComponent(selectedClass.course)}&yearLevel=${encodeURIComponent(selectedClass.year)}`
      );
      const data = await response.json();
      setAttendanceStats(data);
      console.log("Attendance stats:", data);
    } catch (err) {
      console.error("Error loading attendance stats:", err);
    }
  }, [selectedClass, apiUrl]);

  // Load attendance for specific date
  const loadAttendance = useCallback(async () => {
    if (!selectedClass) return;
    
    try {
      const response = await fetch(
        `${apiUrl}/api/attendance?date=${selectedDate}&course=${encodeURIComponent(selectedClass.course)}&yearLevel=${encodeURIComponent(selectedClass.year)}`
      );
      const data = await response.json();
      
      // Convert array to object format
      const records = {};
      data.forEach(record => {
        records[`${selectedDate}-${record.student_id}`] = record.status === 'present';
      });
      setAttendanceRecords(records);
      console.log("Loaded attendance:", records);
    } catch (err) {
      console.error("Error loading attendance:", err);
    }
  }, [selectedClass, selectedDate, apiUrl]);

  // Save attendance to database
  const saveAttendance = async () => {
    if (!selectedClass) {
      alert("Please select a class first");
      return;
    }

    setIsSaving(true);
    
    // Convert attendance records to array format
    const records = students
      .filter(s => s.course === selectedClass.course && s.studentYearLevel === selectedClass.year)
      .map(student => {
        const attendanceKey = `${selectedDate}-${student.id}`;
        return {
          studentId: student.id,
          status: attendanceRecords[attendanceKey] ? 'present' : 'absent'
        };
      });

    try {
      const response = await fetch(`${apiUrl}/api/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId: userId,
          course: selectedClass.course,
          yearLevel: selectedClass.year,
          date: selectedDate,
          records: records
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('✓ Attendance saved successfully!');
      } else {
        alert('Error saving attendance: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error("Error saving attendance:", err);
      alert('Error saving attendance. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Load attendance when dependencies change
  useEffect(() => {
    if (selectedClass && selectedDate && activePage === 'attendance') {
      loadAttendance();
    }
  }, [selectedDate, selectedClass, activePage, loadAttendance]);

  // Load stats when class changes on classes page
  useEffect(() => {
    if (selectedClass && (activePage === 'classes' || activePage === 'records')) {
      loadAttendanceStats();
    }
}, [selectedClass, activePage, loadAttendanceStats]);

useEffect(() => {
    document.title = "Teacher Dashboard";
    
    // Fetch teacher data
    if (userId) {
      fetch(`${apiUrl}/api/users/${userId}`)
        .then(res => res.json())
        .then(data => {
          console.log("Teacher data received:", data);
          console.log("Courses:", data.courses);
          console.log("Year levels:", data.yearLevel);
          setTeacherData(data);
          
          // Calculate number of classes (courses × year levels)
          const courses = data.courses ? JSON.parse(data.courses) : [];
          const yearLevels = data.yearLevel ? JSON.parse(data.yearLevel) : [];
          const totalClasses = courses.length * yearLevels.length;
          
          setDashboardStats(prev => ({ ...prev, classes: totalClasses }));
        })
        .catch(err => console.error("Error fetching teacher data:", err));
    }
    
    // Fetch students
    fetch(`${apiUrl}/api/users`)
      .then(res => res.json())
      .then(data => {
        const studentList = data.filter(user => user.role === 'student');
        console.log("Students loaded:", studentList);
        setStudents(studentList);
      })
      .catch(err => console.error("Error fetching students:", err));
    
    if (chartRef.current) {
      const ctx = chartRef.current.getContext("2d");
      
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      
      chartInstance.current = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Class A", "Class B", "Class C", "Class D", "Class E"],
          datasets: [
            {
              label: "Average Performance",
              data: [85, 74, 92, 78, 88],
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
  }, [userId, apiUrl]);

  // Calculate dashboard stats from teacher's students
  useEffect(() => {
    if (!teacherData || students.length === 0) return;
    
    const courses = teacherData.courses ? JSON.parse(teacherData.courses) : [];
    const yearLevels = teacherData.yearLevel ? JSON.parse(teacherData.yearLevel) : [];
    
    // Count students in teacher's classes
    const myStudents = students.filter(student => 
      courses.includes(student.course) && yearLevels.includes(student.studentYearLevel)
    );
    
    setDashboardStats(prev => ({ ...prev, students: myStudents.length }));
    
    // Fetch overall attendance stats for all teacher's classes
    if (myStudents.length > 0) {
      // Calculate average attendance across all students
      Promise.all(
        myStudents.map(student => 
          fetch(`${apiUrl}/api/attendance/student/${student.id}`)
            .then(res => res.json())
            .catch(err => {
              console.error('Error fetching student attendance:', err);
              return [];
            })
        )
      ).then(results => {
        let totalPresent = 0;
        let totalRecords = 0;
        
        results.forEach(records => {
          totalRecords += records.length;
          totalPresent += records.filter(r => r.status === 'present').length;
        });
        
        const avgAttendance = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;
        setDashboardStats(prev => ({
          ...prev,
          attendance: avgAttendance,
          totalPresent,
          totalDays: totalRecords
        }));
      });
    }
  }, [teacherData, students, apiUrl]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="app fade-in" data-theme="">
      {/* SIDEBAR */}
      <div className="sidebar">
        <h2>👨‍🏫 Teacher Panel</h2>
        <button
          type="button"
          className={activePage === "dashboard" ? "nav-link active" : "nav-link"}
          onClick={() => setActivePage("dashboard")}
        >
          <span>📊</span><span>Dashboard</span>
        </button>
        <button
          type="button"
          className={activePage === "classes" ? "nav-link active" : "nav-link"}
          onClick={() => setActivePage("classes")}
        >
          <span>🏫</span><span>Classes</span>
        </button>
        <button
          type="button"
          className={activePage === "attendance" ? "nav-link active" : "nav-link"}
          onClick={() => setActivePage("attendance")}
        >
          <span>✓</span><span>Attendance</span>
        </button>
        <button
          type="button"
          className={activePage === "records" ? "nav-link active" : "nav-link"}
          onClick={() => setActivePage("records")}
        >
          <span>📋</span><span>Attendance Records</span>
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
        
        {/* DASHBOARD PAGE */}
        {activePage === "dashboard" && (
          <>
            {/* CARDS */}
            <div className="cards">
              <div className="card fade-in">
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏫</div>
                <h2>{dashboardStats.classes}</h2>
                <p>Active Classes</p>
                <div style={{ fontSize: '12px', color: 'var(--accent2)', marginTop: '8px' }}>
                  {dashboardStats.classes > 0 ? '✓ All scheduled' : 'No classes assigned'}
                </div>
              </div>
              <div className="card fade-in">
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
                <h2>{dashboardStats.students}</h2>
                <p>Total Students</p>
                <div style={{ fontSize: '12px', color: 'var(--accent2)', marginTop: '8px' }}>
                  {dashboardStats.students > 0 ? `In your classes` : 'No students yet'}
                </div>
              </div>
              <div className="card fade-in">
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>✓</div>
                <h2>{dashboardStats.attendance}%</h2>
                <p>Attendance Rate</p>
                <div style={{ fontSize: '12px', color: 'var(--accent2)', marginTop: '8px' }}>
                  {dashboardStats.totalDays > 0 
                    ? `${dashboardStats.totalPresent}/${dashboardStats.totalDays} total`
                    : 'No records yet'
                  }
                </div>
              </div>
              <div className="card fade-in">
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
                <h2>{dashboardStats.totalDays}</h2>
                <p>Total Records</p>
                <div style={{ fontSize: '12px', color: 'var(--accent2)', marginTop: '8px' }}>
                  {dashboardStats.totalDays > 0 ? 'Attendance taken' : 'Start taking attendance'}
                </div>
              </div>
            </div>
            
            {/* QUICK STATS */}
            <div className="card fade-in" style={{ marginTop: '20px' }}>
              <h3 style={{ marginBottom: '15px', color: 'var(--accent)' }}>
                📋 Quick Stats
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div style={{ padding: '15px', background: 'rgba(43,89,62,0.05)', borderRadius: '12px', border: '1px solid rgba(43,89,62,0.1)' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📚</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent)' }}>
                    {teacherData?.courses ? JSON.parse(teacherData.courses).length : 0}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Courses Teaching</div>
                </div>
                <div style={{ padding: '15px', background: 'rgba(102,201,126,0.05)', borderRadius: '12px', border: '1px solid rgba(102,201,126,0.1)' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📝</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent2)' }}>
                    {teacherData?.yearLevel ? JSON.parse(teacherData.yearLevel).length : 0}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Year Levels</div>
                </div>
                <div style={{ padding: '15px', background: 'rgba(43,89,62,0.05)', borderRadius: '12px', border: '1px solid rgba(43,89,62,0.1)' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent)' }}>
                    {dashboardStats.totalPresent}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Present Records</div>
                </div>
                <div style={{ padding: '15px', background: 'rgba(102,201,126,0.05)', borderRadius: '12px', border: '1px solid rgba(102,201,126,0.1)' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>👨‍🎓</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent2)' }}>
                    {dashboardStats.students}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Students Enrolled</div>
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* CLASSES PAGE */}
        {activePage === "classes" && (
          <div className="fade-in">
            <h2 style={{ color: 'var(--accent)', marginBottom: '20px' }}>🏫 My Classes</h2>
            
            {(() => {
              // Safe parsing with error handling
              let coursesList = [];
              let yearLevelList = [];
              
              try {
                if (teacherData?.courses) {
                  coursesList = typeof teacherData.courses === 'string' 
                    ? JSON.parse(teacherData.courses) 
                    : teacherData.courses;
                }
                if (teacherData?.yearLevel) {
                  yearLevelList = typeof teacherData.yearLevel === 'string' 
                    ? JSON.parse(teacherData.yearLevel) 
                    : teacherData.yearLevel;
                }
              } catch (error) {
                console.error("Error parsing teacher data:", error);
              }
              
              if (!coursesList || coursesList.length === 0 || !yearLevelList || yearLevelList.length === 0) {
                return (
                  <div className="card">
                    <p style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                      No classes assigned. Contact administrator to assign courses and year levels.
                    </p>
                  </div>
                );
              }
              
              return (
                <>
                  {/* Class Selection */}
                  <div className="card" style={{ marginBottom: '20px' }}>
                    <h3 style={{ marginBottom: '15px', color: 'var(--accent)' }}>📚 Select a Class</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                      {coursesList.map(course => 
                        yearLevelList.map(year => {
                          const classKey = `${course}-${year}`;
                          const studentCount = students.filter(s => s.course === course && s.studentYearLevel === year).length;
                          return (
                            <button
                              key={classKey}
                              onClick={() => {
                                console.log("Selected class:", { course, year });
                                setSelectedClass({ course, year });
                              }}
                              style={{
                                padding: '15px',
                                border: selectedClass?.course === course && selectedClass?.year === year ? '2px solid var(--accent)' : '1px solid rgba(0,0,0,0.1)',
                                borderRadius: '8px',
                                background: selectedClass?.course === course && selectedClass?.year === year ? 'rgba(43,89,62,0.1)' : 'white',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.3s'
                              }}
                            >
                              <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                                {course === 'Information System' && '📊'}
                                {course === 'Criminology' && '⚖️'}
                                {course === 'Psychology' && '🧠'}
                                {course === 'Tourism Management' && '✈️'}
                                {course === 'Accountancy' && '💼'}
                              </div>
                              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{course}</div>
                              <div style={{ fontSize: '14px', color: 'var(--muted)' }}>{year}</div>
                              <div style={{ fontSize: '12px', color: 'var(--accent2)', marginTop: '8px' }}>
                                {studentCount} student{studentCount !== 1 ? 's' : ''}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Student List for Selected Class */}
                  {selectedClass && (
                    <div className="card">
                      <h3 style={{ marginBottom: '15px', color: 'var(--accent)' }}>
                        👥 Students in {selectedClass.course} - {selectedClass.year}
                      </h3>
                      <table>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Attendance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students
                            .filter(s => s.course === selectedClass.course && s.studentYearLevel === selectedClass.year)
                            .map(student => {
                              const stats = Array.isArray(attendanceStats) ? attendanceStats.find(stat => stat.student_id === student.id) : null;
                              const attendanceRate = stats?.attendance_rate || 0;
                              
                              return (
                                <tr key={student.id}>
                                  <td>{student.id}</td>
                                  <td><strong>{student.name}</strong></td>
                                  <td>{student.email}</td>
                                  <td>
                                    <span className={`badge ${attendanceRate >= 75 ? 'success' : attendanceRate >= 50 ? 'warning' : 'danger'}`}>
                                      {attendanceRate > 0 ? `${attendanceRate}%` : 'No records'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          {students.filter(s => s.course === selectedClass.course && s.studentYearLevel === selectedClass.year).length === 0 && (
                            <tr>
                              <td colSpan="4" style={{ textAlign: 'center', color: 'var(--muted)' }}>
                                No students enrolled in this class
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
        
        {/* ATTENDANCE PAGE */}
        {activePage === "attendance" && (
          <div className="fade-in">
            <h2 style={{ color: 'var(--accent)', marginBottom: '20px' }}>✓ Attendance Management</h2>
            
            {/* Date Selector */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '15px', color: 'var(--accent)' }}>📅 Select Date</h3>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  padding: '10px 15px',
                  fontSize: '16px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '8px',
                  width: '250px',
                  cursor: 'pointer'
                }}
              />
              <p style={{ marginTop: '10px', fontSize: '14px', color: 'var(--muted)' }}>
                Selected: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>

            {/* Class Selector for Attendance */}
            {(() => {
              let coursesList = [];
              let yearLevelList = [];
              
              try {
                if (teacherData?.courses) {
                  coursesList = typeof teacherData.courses === 'string' 
                    ? JSON.parse(teacherData.courses) 
                    : teacherData.courses;
                }
                if (teacherData?.yearLevel) {
                  yearLevelList = typeof teacherData.yearLevel === 'string' 
                    ? JSON.parse(teacherData.yearLevel) 
                    : teacherData.yearLevel;
                }
              } catch (error) {
                console.error("Error parsing teacher data:", error);
              }
              
              if (!coursesList || coursesList.length === 0 || !yearLevelList || yearLevelList.length === 0) {
                return (
                  <div className="card">
                    <p style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                      No classes assigned. Contact administrator to assign courses and year levels.
                    </p>
                  </div>
                );
              }
              
              return (
                <>
                  <div className="card" style={{ marginBottom: '20px' }}>
                    <h3 style={{ marginBottom: '15px', color: 'var(--accent)' }}>🏫 Select Class</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                      {coursesList.map(course => 
                        yearLevelList.map(year => {
                          const classKey = `${course}-${year}`;
                          const studentCount = students.filter(s => s.course === course && s.studentYearLevel === year).length;
                          return (
                            <button
                              key={classKey}
                              onClick={() => setSelectedClass({ course, year })}
                              style={{
                                padding: '15px',
                                border: selectedClass?.course === course && selectedClass?.year === year ? '2px solid var(--accent)' : '1px solid rgba(0,0,0,0.1)',
                                borderRadius: '8px',
                                background: selectedClass?.course === course && selectedClass?.year === year ? 'rgba(43,89,62,0.1)' : 'white',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.3s'
                              }}
                            >
                              <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                                {course === 'Information System' && '📊'}
                                {course === 'Criminology' && '⚖️'}
                                {course === 'Psychology' && '🧠'}
                                {course === 'Tourism Management' && '✈️'}
                                {course === 'Accountancy' && '💼'}
                              </div>
                              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{course}</div>
                              <div style={{ fontSize: '14px', color: 'var(--muted)' }}>{year}</div>
                              <div style={{ fontSize: '12px', color: 'var(--accent2)', marginTop: '8px' }}>
                                {studentCount} student{studentCount !== 1 ? 's' : ''}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Attendance Checklist */}
                  {selectedClass && (
                    <div className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ color: 'var(--accent)', margin: 0 }}>
                          ✓ Mark Attendance - {selectedClass.course} ({selectedClass.year})
                        </h3>
                        <button
                          onClick={() => {
                            const allStudents = students.filter(s => s.course === selectedClass.course && s.studentYearLevel === selectedClass.year);
                            const allPresent = {};
                            allStudents.forEach(s => {
                              allPresent[`${selectedDate}-${s.id}`] = true;
                            });
                            setAttendanceRecords({...attendanceRecords, ...allPresent});
                          }}
                          style={{
                            padding: '8px 15px',
                            background: 'var(--accent)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          ✓ Mark All Present
                        </button>
                      </div>
                      
                      <div style={{ 
                        maxHeight: '500px', 
                        overflowY: 'auto',
                        border: '1px solid rgba(0,0,0,0.05)',
                        borderRadius: '8px',
                        padding: '15px'
                      }}>
                        {students
                          .filter(s => s.course === selectedClass.course && s.studentYearLevel === selectedClass.year)
                          .map(student => {
                            const attendanceKey = `${selectedDate}-${student.id}`;
                            const isPresent = attendanceRecords[attendanceKey] || false;
                            
                            return (
                              <label
                                key={student.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '12px 15px',
                                  marginBottom: '8px',
                                  background: isPresent ? 'rgba(43,89,62,0.05)' : 'white',
                                  border: isPresent ? '2px solid rgba(43,89,62,0.3)' : '1px solid rgba(0,0,0,0.05)',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isPresent}
                                  onChange={(e) => {
                                    setAttendanceRecords({
                                      ...attendanceRecords,
                                      [attendanceKey]: e.target.checked
                                    });
                                  }}
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    marginRight: '15px',
                                    cursor: 'pointer'
                                  }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>{student.name}</div>
                                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                                    ID: {student.id} • {student.email}
                                  </div>
                                </div>
                                <span className={`badge ${isPresent ? 'success' : 'warning'}`}>
                                  {isPresent ? '✓ Present' : '○ Absent'}
                                </span>
                              </label>
                            );
                          })}
                        
                        {students.filter(s => s.course === selectedClass.course && s.studentYearLevel === selectedClass.year).length === 0 && (
                          <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px' }}>
                            No students enrolled in this class
                          </p>
                        )}
                      </div>

                      {students.filter(s => s.course === selectedClass.course && s.studentYearLevel === selectedClass.year).length > 0 && (
                        <div style={{ 
                          marginTop: '20px', 
                          padding: '15px', 
                          background: 'rgba(43,89,62,0.05)', 
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <strong>Summary:</strong>{' '}
                            {Object.keys(attendanceRecords).filter(key => 
                              key.startsWith(selectedDate) && 
                              students.some(s => `${selectedDate}-${s.id}` === key && s.course === selectedClass.course && s.studentYearLevel === selectedClass.year) &&
                              attendanceRecords[key]
                            ).length} present out of{' '}
                            {students.filter(s => s.course === selectedClass.course && s.studentYearLevel === selectedClass.year).length} students
                          </div>
                          <button
                            onClick={saveAttendance}
                            disabled={isSaving}
                            style={{
                              padding: '10px 20px',
                              background: isSaving ? '#ccc' : 'var(--accent)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: isSaving ? 'not-allowed' : 'pointer',
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}
                          >
                            {isSaving ? '⏳ Saving...' : '💾 Save Attendance'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
        
        {/* ATTENDANCE RECORDS PAGE */}
        {activePage === "records" && (
          <div className="fade-in">
            <h2 style={{ color: 'var(--accent)', marginBottom: '20px' }}>📋 Attendance Records</h2>
            
            {/* Class Selector */}
            {(() => {
              let coursesList = [];
              let yearLevelList = [];
              
              try {
                if (teacherData?.courses) {
                  coursesList = typeof teacherData.courses === 'string' 
                    ? JSON.parse(teacherData.courses) 
                    : teacherData.courses;
                }
                if (teacherData?.yearLevel) {
                  yearLevelList = typeof teacherData.yearLevel === 'string' 
                    ? JSON.parse(teacherData.yearLevel) 
                    : teacherData.yearLevel;
                }
              } catch (err) {
                console.error("Error parsing teacher data:", err);
              }

              const classes = [];
              coursesList.forEach(course => {
                yearLevelList.forEach(year => {
                  classes.push({ course, year });
                });
              });

              if (classes.length === 0) {
                return (
                  <div className="card">
                    <p style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                      No classes assigned. Please contact admin.
                    </p>
                  </div>
                );
              }

              return (
                <>
                  <div className="card" style={{ marginBottom: '20px' }}>
                    <h3 style={{ marginBottom: '15px', color: 'var(--accent)' }}>🏫 Select Class</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {classes.map((cls, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedClass(cls)}
                          style={{
                            padding: '10px 20px',
                            background: selectedClass?.course === cls.course && selectedClass?.year === cls.year 
                              ? 'var(--accent)' 
                              : 'white',
                            color: selectedClass?.course === cls.course && selectedClass?.year === cls.year 
                              ? 'white' 
                              : 'var(--accent)',
                            border: '2px solid var(--accent)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                          }}
                        >
                          {cls.course} - Year {cls.year}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedClass && (
                    <div className="card">
                      <h3 style={{ marginBottom: '20px', color: 'var(--accent)' }}>
                        📊 Attendance Records - {selectedClass.course} (Year {selectedClass.year})
                      </h3>
                      
                      {attendanceStats.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                          No attendance records found for this class.
                        </p>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table>
                            <thead>
                              <tr>
                                <th>Student ID</th>
                                <th>Student Name</th>
                                <th>Email</th>
                                <th>Total Present</th>
                                <th>Total Absent</th>
                                <th>Total Days</th>
                                <th>Attendance Rate</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {attendanceStats.map((stat, index) => {
                                const rate = stat.total_days > 0 
                                  ? ((stat.total_present / stat.total_days) * 100).toFixed(1)
                                  : 0;
                                
                                let statusBadge = 'success';
                                let statusText = 'Good';
                                
                                if (rate < 75) {
                                  statusBadge = 'danger';
                                  statusText = 'Poor';
                                } else if (rate < 85) {
                                  statusBadge = 'warning';
                                  statusText = 'Fair';
                                }
                                
                                return (
                                  <tr key={index}>
                                    <td>#{stat.student_id}</td>
                                    <td><strong>{stat.student_name}</strong></td>
                                    <td>{stat.email}</td>
                                    <td>
                                      <span style={{ 
                                        color: 'var(--accent)', 
                                        fontWeight: '600',
                                        fontSize: '16px'
                                      }}>
                                        {stat.total_present}
                                      </span>
                                    </td>
                                    <td>
                                      <span style={{ 
                                        color: '#f44336', 
                                        fontWeight: '600',
                                        fontSize: '16px'
                                      }}>
                                        {stat.total_absent}
                                      </span>
                                    </td>
                                    <td>{stat.total_days}</td>
                                    <td>
                                      <strong style={{ 
                                        color: rate >= 85 ? 'var(--accent)' : rate >= 75 ? '#ff9800' : '#f44336',
                                        fontSize: '16px'
                                      }}>
                                        {rate}%
                                      </strong>
                                    </td>
                                    <td>
                                      <span className={`badge ${statusBadge}`}>
                                        {statusText}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
        
        {/* GRADES PAGE */}
        {activePage === "grades" && (() => {
          if (!teacherData) {
            return <div className="card fade-in"><p>Loading...</p></div>;
          }

          const courses = teacherData.courses ? JSON.parse(teacherData.courses) : [];
          const yearLevels = teacherData.yearLevel ? JSON.parse(teacherData.yearLevel) : [];

          if (courses.length === 0 || yearLevels.length === 0) {
            return (
              <div className="card fade-in">
                <h3 style={{ color: 'var(--muted)' }}>No Classes Assigned</h3>
                <p style={{ marginTop: '10px', color: 'var(--muted)' }}>
                  Please contact the administrator to assign classes to you.
                </p>
              </div>
            );
          }

          return (
            <div className="fade-in">
              <h2 style={{ color: 'var(--accent)', marginBottom: '20px' }}>🎯 Student Grades</h2>
              
              {/* Class Selection */}
              {!selectedClass ? (
                <>
                  <p style={{ marginBottom: '15px', color: 'var(--muted)' }}>Select a class to manage grades:</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                    {courses.flatMap(course =>
                      yearLevels.map(year => (
                        <div
                          key={`${course}-${year}`}
                          className="card"
                          onClick={() => setSelectedClass({ course, year })}
                          style={{
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            border: '2px solid transparent'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'transparent';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <div style={{ fontSize: '32px', marginBottom: '10px' }}>📚</div>
                          <h3 style={{ fontSize: '16px', marginBottom: '5px' }}>{course}</h3>
                          <p style={{ fontSize: '14px', color: 'var(--muted)' }}>Year {year}</p>
                          <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--accent2)' }}>
                            {students.filter(s => s.course === course && s.studentYearLevel === year).length} students
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <GradesManager
                  teacherId={userId}
                  course={selectedClass.course}
                  yearLevel={selectedClass.year}
                  students={students.filter(s => s.course === selectedClass.course && s.studentYearLevel === selectedClass.year)}
                  apiUrl={apiUrl}
                  onBack={() => setSelectedClass(null)}
                />
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

// Grades Manager Component
const GradesManager = ({ teacherId, course, yearLevel, students, apiUrl, onBack }) => {
  const [grades, setGrades] = useState({});
  const [subjects, setSubjects] = useState({});
  const [semesters, setSemesters] = useState({});
  const [terms, setTerms] = useState({}); // Track selected term per student-subject
  const [isSaving, setIsSaving] = useState(false);
  const [expandedStudents, setExpandedStudents] = useState({}); // Track which students are expanded

  // Load existing grades
  useEffect(() => {
    fetch(`${apiUrl}/api/grades?course=${encodeURIComponent(course)}&yearLevel=${encodeURIComponent(yearLevel)}`)
      .then(res => res.json())
      .then(data => {
        const gradesMap = {};
        const subjectsMap = {};
        const semestersMap = {};
        const termsMap = {};
        
        data.forEach(record => {
          const studentId = record.student_id;
          const subject = record.subject;
          
          // Store all three term grades
          const baseKey = `${studentId}-${subject}`;
          gradesMap[`${baseKey}-prelim`] = record.prelim_grade || '';
          gradesMap[`${baseKey}-midterm`] = record.midterm_grade || '';
          gradesMap[`${baseKey}-finals`] = record.finals_grade || '';
          
          // Default to prelim term for display
          termsMap[baseKey] = 'prelim';
          
          semestersMap[baseKey] = record.semester;
          
          if (!subjectsMap[studentId]) {
            subjectsMap[studentId] = [];
          }
          if (!subjectsMap[studentId].includes(subject)) {
            subjectsMap[studentId].push(subject);
          }
        });
        
        setGrades(gradesMap);
        setSubjects(subjectsMap);
        setSemesters(semestersMap);
        setTerms(termsMap);
      })
      .catch(err => console.error('Error loading grades:', err));
  }, [apiUrl, course, yearLevel]);

  const addSubject = (studentId) => {
    const subjectName = prompt('Enter subject name:');
    if (!subjectName || !subjectName.trim()) return;
    
    setSubjects(prev => ({
      ...prev,
      [studentId]: [...(prev[studentId] || []), subjectName.trim()]
    }));
  };

  const removeSubject = async (studentId, subject) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`Remove "${subject}" for this student?`)) return;
    
    // Get the semester for this subject
    const baseKey = `${studentId}-${subject}`;
    const semester = semesters[baseKey] || '1st Semester';
    
    try {
      // Delete from database
      const response = await fetch(
        `${apiUrl}/api/grades/student/${studentId}/subject/${encodeURIComponent(subject)}/semester/${encodeURIComponent(semester)}`,
        { method: 'DELETE' }
      );
      
      if (!response.ok) {
        throw new Error('Failed to delete grade');
      }
      
      // Remove from frontend state
      setSubjects(prev => ({
        ...prev,
        [studentId]: (prev[studentId] || []).filter(s => s !== subject)
      }));
      
      // Remove grades for all terms for this subject
      setGrades(prev => {
        const newGrades = { ...prev };
        delete newGrades[`${baseKey}-prelim`];
        delete newGrades[`${baseKey}-midterm`];
        delete newGrades[`${baseKey}-finals`];
        return newGrades;
      });
      
      // Remove semester and term selection
      setSemesters(prev => {
        const newSemesters = { ...prev };
        delete newSemesters[baseKey];
        return newSemesters;
      });
      
      setTerms(prev => {
        const newTerms = { ...prev };
        delete newTerms[baseKey];
        return newTerms;
      });
      
      alert('✓ Subject and grades deleted successfully!');
    } catch (err) {
      console.error('Error deleting grade:', err);
      alert('Error deleting grade. Please try again.');
    }
  };

  const updateGrade = (studentId, subject, term, value) => {
    const key = `${studentId}-${subject}-${term}`;
    setGrades(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateTerm = (studentId, subject, value) => {
    const key = `${studentId}-${subject}`;
    setTerms(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateSemester = (studentId, subject, value) => {
    const key = `${studentId}-${subject}`;
    setSemesters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveGrades = async () => {
    setIsSaving(true);
    
    try {
      const promises = [];
      
      students.forEach(student => {
        const studentSubjects = subjects[student.id] || [];
        studentSubjects.forEach(subject => {
          const baseKey = `${student.id}-${subject}`;
          const semester = semesters[baseKey] || '1st Semester';
          
          // Save each term that has a grade
          ['prelim', 'midterm', 'finals'].forEach(term => {
            const gradeKey = `${baseKey}-${term}`;
            const grade = grades[gradeKey];
            
            if (grade !== undefined && grade !== null && grade !== '') {
              promises.push(
                fetch(`${apiUrl}/api/grades`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    teacherId,
                    studentId: student.id,
                    course,
                    yearLevel,
                    subject,
                    semester,
                    term,
                    grade: grade,
                    remarks: null
                  })
                })
              );
            }
          });
        });
      });
      
      await Promise.all(promises);
      alert('✓ Grades saved successfully!');
    } catch (err) {
      console.error('Error saving grades:', err);
      alert('Error saving grades. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <button
            onClick={onBack}
            style={{
              padding: '8px 15px',
              background: '#f0f0f0',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '10px'
            }}
          >
            ← Back to Classes
          </button>
          <h3 style={{ margin: 0, color: 'var(--accent)' }}>{course} - Year {yearLevel}</h3>
          <p style={{ margin: '5px 0 0 0', color: 'var(--muted)', fontSize: '14px' }}>
            {students.length} {students.length === 1 ? 'student' : 'students'}
          </p>
        </div>
        <button
          onClick={saveGrades}
          disabled={isSaving}
          style={{
            padding: '10px 20px',
            background: isSaving ? '#ccc' : 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {isSaving ? '⏳ Saving...' : '💾 Save All Grades'}
        </button>
      </div>

      <div className="card">
        {students.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
            No students enrolled in this class
          </p>
        ) : (
          <div>
            {students.map(student => {
              const studentSubjects = subjects[student.id] || [];
              const isExpanded = expandedStudents[student.id] || false;
              
              return (
                <div 
                  key={student.id}
                  style={{
                    marginBottom: '15px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    transition: 'all 0.2s'
                  }}
                >
                  {/* Student Header - Clickable */}
                  <div
                    onClick={() => setExpandedStudents(prev => ({
                      ...prev,
                      [student.id]: !prev[student.id]
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
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ 
                          fontSize: '18px',
                          transition: 'transform 0.2s',
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
                        }}>
                          ▶
                        </span>
                        <strong style={{ fontSize: '16px' }}>{student.name}</strong>
                      </div>
                      <div style={{ marginLeft: '28px', marginTop: '4px', fontSize: '13px', color: 'var(--muted)' }}>
                        {student.email}
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: '13px', 
                      color: 'var(--accent2)',
                      padding: '4px 12px',
                      background: 'rgba(43,89,62,0.1)',
                      borderRadius: '12px'
                    }}>
                      {studentSubjects.length} {studentSubjects.length === 1 ? 'subject' : 'subjects'}
                    </div>
                  </div>
                  
                  {/* Expandable Content */}
                  {isExpanded && (
                    <div style={{ 
                      padding: '20px',
                      background: 'white',
                      borderTop: '1px solid rgba(0,0,0,0.05)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h4 style={{ margin: 0, color: 'var(--accent)', fontSize: '15px' }}>Subjects & Grades</h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addSubject(student.id);
                          }}
                          style={{
                            padding: '6px 12px',
                            background: 'var(--accent)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          + Add Subject
                        </button>
                      </div>
                      
                      {studentSubjects.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)', fontSize: '13px' }}>
                          No subjects yet. Click "Add Subject" to get started.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                          {studentSubjects.map(subject => {
                            const baseKey = `${student.id}-${subject}`;
                            const semester = semesters[baseKey] || '1st Semester';
                            const selectedTerm = terms[baseKey] || 'prelim';
                            
                            // Current term's grade
                            const currentGrade = grades[`${baseKey}-${selectedTerm}`] || '';
                            
                            return (
                              <div
                                key={subject}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                  padding: '12px',
                                  background: '#f8f9fa',
                                  borderRadius: '6px',
                                  border: '1px solid #e0e0e0',
                                  minWidth: '240px'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent)', flex: 1 }}>{subject}</span>
                                  <button
                                    onClick={() => removeSubject(student.id, subject)}
                                    style={{
                                      padding: '0',
                                      background: '#ff4444',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '2px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                      lineHeight: '1',
                                      width: '14px',
                                      height: '14px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0
                                    }}
                                    title="Remove subject"
                                  >
                                    ×
                                  </button>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <label style={{ fontSize: '12px', color: 'var(--muted)' }}>Semester:</label>
                                  <select
                                    value={semester}
                                    onChange={(e) => updateSemester(student.id, subject, e.target.value)}
                                    style={{
                                      flex: 1,
                                      padding: '4px 6px',
                                      border: '1px solid #ddd',
                                      borderRadius: '4px',
                                      fontSize: '12px'
                                    }}
                                  >
                                    <option value="1st Semester">1st Semester</option>
                                    <option value="2nd Semester">2nd Semester</option>
                                    <option value="Summer">Summer</option>
                                  </select>
                                </div>
                                
                                {/* Term selector buttons */}
                                <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                  {['prelim', 'midterm', 'finals'].map(term => {
                                    const termGrade = grades[`${baseKey}-${term}`];
                                    const isSelected = selectedTerm === term;
                                    const hasGrade = termGrade && termGrade !== '';
                                    
                                    return (
                                      <button
                                        key={term}
                                        onClick={() => updateTerm(student.id, subject, term)}
                                        style={{
                                          flex: 1,
                                          padding: '6px 8px',
                                          background: isSelected ? 'var(--accent)' : (hasGrade ? '#e8f5e9' : '#fff'),
                                          color: isSelected ? 'white' : (hasGrade ? '#2e7d32' : '#666'),
                                          border: `1px solid ${isSelected ? 'var(--accent)' : (hasGrade ? '#4caf50' : '#ddd')}`,
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          fontSize: '11px',
                                          fontWeight: isSelected ? '600' : '400',
                                          textTransform: 'capitalize',
                                          transition: 'all 0.2s'
                                        }}
                                        title={hasGrade ? `${term}: ${termGrade}` : `No ${term} grade yet`}
                                      >
                                        {term}
                                        {hasGrade && !isSelected && (
                                          <span style={{ fontSize: '9px', display: 'block', marginTop: '2px' }}>✓</span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                                
                                {/* Grade input for selected term */}
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <label style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'capitalize' }}>
                                    {selectedTerm}:
                                  </label>
                                  <select
                                    value={currentGrade}
                                    onChange={(e) => updateGrade(student.id, subject, selectedTerm, e.target.value)}
                                    style={{
                                      flex: 1,
                                      padding: '4px 8px',
                                      border: '1px solid #ddd',
                                      borderRadius: '4px',
                                      fontSize: '13px'
                                    }}
                                  >
                                    <option value="">Select Grade</option>
                                    <option value="1.00">1.00</option>
                                    <option value="1.25">1.25</option>
                                    <option value="1.50">1.50</option>
                                    <option value="1.75">1.75</option>
                                    <option value="2.00">2.00</option>
                                    <option value="2.25">2.25</option>
                                    <option value="2.50">2.50</option>
                                    <option value="2.75">2.75</option>
                                    <option value="3.00">3.00</option>
                                    <option value="4.00">4.00</option>
                                    <option value="5.00">5.00</option>
                                    <option value="INC">INC</option>
                                  </select>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
