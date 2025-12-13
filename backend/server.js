require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SECRET = process.env.JWT_SECRET || "dev_fallback_secret";

// Root route - health check
app.get("/", (req, res) => {
  res.json({ 
    message: "Attendance System API is running!",
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

// MySQL connection with retry logic
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "attendance_system"
};

let db;
function connectWithRetry(attempt = 1) {
  db = mysql.createConnection(dbConfig);
  db.connect(err => {
    if (err) {
      console.error(`DB connection failed (attempt ${attempt}):`, err.code);
      if (attempt < 5) {
        const delay = attempt * 1000;
        console.log(`Retrying in ${delay}ms...`);
        setTimeout(() => connectWithRetry(attempt + 1), delay);
      } else {
        console.error("Max DB connection attempts reached.");
      }
    } else {
      console.log("Database connected!");
    }
  });
}
connectWithRetry();

// Create users table if not exists
const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  role ENUM('admin','teacher','student'),
  course VARCHAR(255) DEFAULT NULL,
  sections JSON DEFAULT NULL,
  courses JSON DEFAULT NULL,
  yearLevel JSON DEFAULT NULL,
  studentYearLevel VARCHAR(50) DEFAULT NULL
)
`;
db.query(createUsersTable, (err) => {
  if (err) console.error(err);
  else {
    console.log("Users table ready");
    
    // Add course column if it doesn't exist
    const alterTableSQL = `
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS course VARCHAR(255) DEFAULT NULL
    `;
    
    db.query(alterTableSQL, (alterErr) => {
      if (alterErr && !alterErr.message.includes("Duplicate column")) {
        console.error("Error adding course column:", alterErr);
      } else {
        console.log("Course column ready");
      }
    });
    
    // Add sections column if it doesn't exist
    const alterSectionsSQL = `
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS sections JSON DEFAULT NULL
    `;
    
    db.query(alterSectionsSQL, (alterErr) => {
      if (alterErr && !alterErr.message.includes("Duplicate column")) {
        console.error("Error adding sections column:", alterErr);
      } else {
        console.log("Sections column ready");
      }
    });
    
    // Add courses column if it doesn't exist
    const alterCoursesSQL = `
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS courses JSON DEFAULT NULL
    `;
    
    db.query(alterCoursesSQL, (alterErr) => {
      if (alterErr && !alterErr.message.includes("Duplicate column")) {
        console.error("Error adding courses column:", alterErr);
      } else {
        console.log("Courses column ready");
      }
    });
    
    // Add yearLevel column if it doesn't exist
    const alterYearLevelSQL = `
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS yearLevel JSON DEFAULT NULL
    `;
    
    db.query(alterYearLevelSQL, (alterErr) => {
      if (alterErr && !alterErr.message.includes("Duplicate column")) {
        console.error("Error adding yearLevel column:", alterErr);
      } else {
        console.log("YearLevel column ready");
      }
    });
    
    // Add studentYearLevel column if it doesn't exist
    const alterStudentYearLevelSQL = `
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS studentYearLevel VARCHAR(50) DEFAULT NULL
    `;
    
    db.query(alterStudentYearLevelSQL, (alterErr) => {
      if (alterErr && !alterErr.message.includes("Duplicate column")) {
        console.error("Error adding studentYearLevel column:", alterErr);
      } else {
        console.log("StudentYearLevel column ready");
      }
    });
    
    // Add section column if it doesn't exist
    const alterSectionSQL = `
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS section VARCHAR(10) DEFAULT NULL
    `;
    
    db.query(alterSectionSQL, (alterErr) => {
      if (alterErr && !alterErr.message.includes("Duplicate column")) {
        console.error("Error adding section column:", alterErr);
      } else {
        console.log("Section column ready");
      }
    });
  }
});

// Create attendance table if not exists (refactored: course and year_level removed, use JOIN with users table)
const createAttendanceTable = `
CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  teacher_id INT NOT NULL,
  date DATE NOT NULL,
  status ENUM('present','absent') DEFAULT 'absent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_attendance (student_id, date)
)
`;
db.query(createAttendanceTable, (err) => {
  if (err) console.error(err);
  else console.log("Attendance table ready");
});

// Create grades table if not exists (refactored: course and year_level removed, use JOIN with users table)
const createGradesTable = `
CREATE TABLE IF NOT EXISTS grades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  teacher_id INT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  semester ENUM('1st Semester','2nd Semester','Summer') NOT NULL,
  prelim_grade VARCHAR(10) DEFAULT NULL,
  midterm_grade VARCHAR(10) DEFAULT NULL,
  finals_grade VARCHAR(10) DEFAULT NULL,
  remarks TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_grade (student_id, subject, semester)
)
`;
db.query(createGradesTable, (err) => {
  if (err) console.error(err);
  else {
    console.log("Grades table ready");
    
    // Check if old grade column exists and new columns don't
    const checkColumns = `
      SELECT 
        SUM(CASE WHEN COLUMN_NAME = 'grade' THEN 1 ELSE 0 END) as has_grade,
        SUM(CASE WHEN COLUMN_NAME = 'prelim_grade' THEN 1 ELSE 0 END) as has_prelim,
        SUM(CASE WHEN COLUMN_NAME = 'midterm_grade' THEN 1 ELSE 0 END) as has_midterm,
        SUM(CASE WHEN COLUMN_NAME = 'finals_grade' THEN 1 ELSE 0 END) as has_finals
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'grades'
    `;
    
    db.query(checkColumns, (err, results) => {
      if (err) {
        console.error("Error checking grade columns:", err);
        return;
      }
      
      const { has_grade, has_prelim, has_midterm, has_finals } = results[0];
      const grade = parseInt(has_grade) || 0;
      const prelim = parseInt(has_prelim) || 0;
      const midterm = parseInt(has_midterm) || 0;
      const finals = parseInt(has_finals) || 0;
      
      console.log(`Column check: grade=${grade}, prelim=${prelim}, midterm=${midterm}, finals=${finals}`);
      
      // Add new columns if they don't exist
      if (prelim === 0 || midterm === 0 || finals === 0) {
        console.log("Adding term grade columns...");
        
        const alterStatements = [];
        if (prelim === 0) {
          alterStatements.push("ADD COLUMN prelim_grade VARCHAR(10) DEFAULT NULL");
        }
        if (midterm === 0) {
          alterStatements.push("ADD COLUMN midterm_grade VARCHAR(10) DEFAULT NULL");
        }
        if (finals === 0) {
          alterStatements.push("ADD COLUMN finals_grade VARCHAR(10) DEFAULT NULL");
        }
        
        const alterTable = `ALTER TABLE grades ${alterStatements.join(', ')}`;
        console.log("Executing ALTER TABLE:", alterTable);
        
        db.query(alterTable, (err) => {
          if (err) {
            console.error("Error adding term grade columns:", err);
            return;
          }
          
          console.log("Term grade columns added successfully");
          
          // Now migrate data if old grade column exists
          if (grade > 0) {
            console.log("Migrating old grade data to prelim_grade...");
            
            const migrateData = `
              UPDATE grades 
              SET prelim_grade = grade 
              WHERE grade IS NOT NULL AND grade != ''
            `;
            
            db.query(migrateData, (err, result) => {
              if (err) {
                console.error("Error migrating grade data:", err);
              } else {
                console.log(`Migrated ${result.affectedRows} grades to prelim_grade`);
                
                // Drop old grade column
                const dropColumn = `ALTER TABLE grades DROP COLUMN grade`;
                db.query(dropColumn, (err) => {
                  if (err) {
                    console.error("Error dropping old grade column:", err);
                  } else {
                    console.log("Old 'grade' column removed successfully");
                  }
                });
              }
            });
          }
        });
      } else if (grade > 0) {
        // Columns exist, just migrate data
        console.log("Migrating old grade data to prelim_grade...");
        
        const migrateData = `
          UPDATE grades 
          SET prelim_grade = grade 
          WHERE grade IS NOT NULL AND grade != ''
        `;
        
        db.query(migrateData, (err, result) => {
          if (err) {
            console.error("Error migrating grade data:", err);
          } else {
            console.log(`Migrated ${result.affectedRows} grades to prelim_grade`);
            
            // Drop old grade column
            const dropColumn = `ALTER TABLE grades DROP COLUMN grade`;
            db.query(dropColumn, (err) => {
              if (err) {
                console.error("Error dropping old grade column:", err);
              } else {
                console.log("Old 'grade' column removed successfully");
              }
            });
          }
        });
      } else {
        console.log("Grade columns are up to date");
      }
    });
  }
});

// Route: Login
app.get("/api/health", (_, res) => {
  db.ping(err => {
    if (err) return res.status(500).json({ status: "error", db: err.message });
    res.json({ status: "ok" });
  });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(401).json({ error: "Email not found" });
    const user = results[0];
    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) return res.status(401).json({ error: "Incorrect password" });
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: "1h" });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
  });
});

// Seed users route (optional use in development)
app.post("/api/users/seed", (req, res) => {
  const passwordHash = bcrypt.hashSync("1234", 10);
  const sql = `
    INSERT INTO users (name, email, password, role) VALUES
    ('Admin User','admin@example.com','${passwordHash}','admin'),
    ('Teacher User','teacher@example.com','${passwordHash}','teacher'),
    ('Student User','student@example.com','${passwordHash}','student')
    ON DUPLICATE KEY UPDATE password='${passwordHash}';
  `;
  db.query(sql, err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ seeded: true });
  });
});


// Route: Create user (admin only)
app.post("/api/users", (req, res) => {
  const { name, email, password, role, course, section, sections, courses, yearLevel, studentYearLevel } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "Missing fields" });
  }
  const passwordHash = bcrypt.hashSync(password, 10);
  const sectionsJSON = sections && sections.length > 0 ? JSON.stringify(sections) : null;
  const coursesJSON = courses && courses.length > 0 ? JSON.stringify(courses) : null;
  const yearLevelJSON = yearLevel && yearLevel.length > 0 ? JSON.stringify(yearLevel) : null;
  const sql = "INSERT INTO users (name, email, password, role, course, section, sections, courses, yearLevel, studentYearLevel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  db.query(sql, [name, email, passwordHash, role, course || null, section || null, sectionsJSON, coursesJSON, yearLevelJSON, studentYearLevel || null], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, userId: result.insertId });
  });
});

// Route: Get all users
app.get("/api/users", (req, res) => {
  db.query("SELECT id, name, email, role, course, section, sections, courses, yearLevel, studentYearLevel FROM users", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Route: Get user by ID
app.get("/api/users/:id", (req, res) => {
  db.query("SELECT id, name, email, role, course, section, sections, courses, yearLevel, studentYearLevel FROM users WHERE id = ?", [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(results[0]);
  });
});

// Route: Update user
app.put("/api/users/:id", (req, res) => {
  const { name, email, password, role, course, section, sections, courses, yearLevel, studentYearLevel } = req.body;
  const userId = req.params.id;
  
  // Build dynamic query based on provided fields
  let updates = [];
  let values = [];
  
  if (name) {
    updates.push("name = ?");
    values.push(name);
  }
  if (email) {
    updates.push("email = ?");
    values.push(email);
  }
  if (password) {
    updates.push("password = ?");
    values.push(bcrypt.hashSync(password, 10));
  }
  if (role) {
    updates.push("role = ?");
    values.push(role);
  }
  if (course !== undefined) {
    updates.push("course = ?");
    values.push(course || null);
  }
  if (section !== undefined) {
    updates.push("section = ?");
    values.push(section || null);
  }
  if (sections !== undefined) {
    updates.push("sections = ?");
    values.push(sections && sections.length > 0 ? JSON.stringify(sections) : null);
  }
  if (courses !== undefined) {
    updates.push("courses = ?");
    values.push(courses && courses.length > 0 ? JSON.stringify(courses) : null);
  }
  if (yearLevel !== undefined) {
    updates.push("yearLevel = ?");
    values.push(yearLevel && yearLevel.length > 0 ? JSON.stringify(yearLevel) : null);
  }
  if (studentYearLevel !== undefined) {
    updates.push("studentYearLevel = ?");
    values.push(studentYearLevel || null);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }
  
  values.push(userId);
  const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;
  
  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, message: "User updated successfully" });
  });
});

// Route: Delete user
app.delete("/api/users/:id", (req, res) => {
  const userId = req.params.id;
  
  // First, delete related attendance records
  db.query("DELETE FROM attendance WHERE student_id = ?", [userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Then delete the user
    db.query("DELETE FROM users WHERE id = ?", [userId], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: "User not found" });
      res.json({ success: true, message: "User deleted successfully" });
    });
  });
});

// Scaffold: Courses, Assignments, Reports (dummy endpoints)
app.get("/api/courses", (req, res) => {
  res.json([
    { id: 1, name: "Calculus I", teacher: "Dr. Santos", students: 30 },
    { id: 2, name: "Physics", teacher: "Prof. Cruz", students: 25 }
  ]);
});

app.get("/api/assignments", (req, res) => {
  res.json([
    { id: 1, title: "Homework 1", course: "Calculus I", due: "2025-12-03", status: "Pending" },
    { id: 2, title: "Lab Report", course: "Physics", due: "2025-12-05", status: "Submitted" }
  ]);
});

app.get("/api/reports", (req, res) => {
  res.json([
    { id: 1, type: "Quarterly", value: 78 },
    { id: 2, type: "Annual", value: 85 }
  ]);
});

// ============ ATTENDANCE ENDPOINTS ============

// Save attendance records (refactored: no course/year_level storage)
app.post("/api/attendance", (req, res) => {
  const { teacherId, course, yearLevel, date, records } = req.body;
  
  if (!teacherId || !course || !yearLevel || !date || !records) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Delete existing records for this date and these students
  const studentIds = records.map(r => r.studentId);
  const deleteSQL = `DELETE FROM attendance WHERE date = ? AND student_id IN (?)`;
  
  db.query(deleteSQL, [date, studentIds], (deleteErr) => {
    if (deleteErr) {
      console.error("Error deleting old attendance:", deleteErr);
      return res.status(500).json({ error: deleteErr.message });
    }

    // Insert new records (only student_id, teacher_id, date, status)
    const values = records.map(r => [r.studentId, teacherId, date, r.status]);
    const insertSQL = `INSERT INTO attendance (student_id, teacher_id, date, status) VALUES ?`;
    
    if (values.length === 0) {
      return res.json({ success: true, message: "No records to save" });
    }

    db.query(insertSQL, [values], (insertErr) => {
      if (insertErr) {
        console.error("Error inserting attendance:", insertErr);
        return res.status(500).json({ error: insertErr.message });
      }
      res.json({ success: true, message: "Attendance saved successfully" });
    });
  });
});

// Get attendance records for a specific date and class (with JOIN to users)
app.get("/api/attendance", (req, res) => {
  const { date, course, yearLevel } = req.query;
  
  if (!date || !course || !yearLevel) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const sql = `
    SELECT a.* 
    FROM attendance a
    JOIN users u ON a.student_id = u.id
    WHERE a.date = ? AND u.course = ? AND u.studentYearLevel = ?
  `;
  
  db.query(sql, [date, course, yearLevel], (err, results) => {
    if (err) {
      console.error("Error fetching attendance:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Get attendance summary for a student (with course info from users table)
app.get("/api/attendance/student/:studentId", (req, res) => {
  const { studentId } = req.params;
  
  const sql = `
    SELECT a.*, 
           t.name as teacher_name,
           s.course,
           s.studentYearLevel as year_level
    FROM attendance a
    LEFT JOIN users t ON a.teacher_id = t.id
    LEFT JOIN users s ON a.student_id = s.id
    WHERE a.student_id = ?
    ORDER BY a.date DESC
  `;
  
  db.query(sql, [studentId], (err, results) => {
    if (err) {
      console.error("Error fetching student attendance:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Get attendance statistics for a class (simplified JOIN)
app.get("/api/attendance/stats", (req, res) => {
  const { course, yearLevel } = req.query;
  
  if (!course || !yearLevel) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const sql = `
    SELECT 
      u.id as student_id,
      u.name as student_name,
      u.email,
      COUNT(CASE WHEN a.status = 'present' THEN 1 END) as total_present,
      COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as total_absent,
      COUNT(a.id) as total_days,
      ROUND((COUNT(CASE WHEN a.status = 'present' THEN 1 END) / COUNT(a.id)) * 100, 2) as attendance_rate
    FROM users u
    LEFT JOIN attendance a ON u.id = a.student_id
    WHERE u.role = 'student' AND u.course = ? AND u.studentYearLevel = ?
    GROUP BY u.id, u.name, u.email
    ORDER BY u.name
  `;
  
  db.query(sql, [course, yearLevel], (err, results) => {
    if (err) {
      console.error("Error fetching attendance stats:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// ============ GRADES ENDPOINTS ============

// Save or update grade (refactored: no course/year_level storage)
app.post("/api/grades", (req, res) => {
  const { teacherId, studentId, course, yearLevel, subject, semester, term, grade, remarks } = req.body;
  
  // Validate required fields
  if (!teacherId || !studentId || !subject || !semester || !term || grade === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Validate term value
  if (!['prelim', 'midterm', 'finals'].includes(term)) {
    return res.status(400).json({ error: "Invalid term. Must be prelim, midterm, or finals" });
  }

  // Map term to column name
  const gradeColumn = `${term}_grade`;

  const sql = `
    INSERT INTO grades (student_id, teacher_id, subject, semester, ${gradeColumn}, remarks)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      ${gradeColumn} = VALUES(${gradeColumn}),
      remarks = VALUES(remarks),
      teacher_id = VALUES(teacher_id),
      updated_at = CURRENT_TIMESTAMP
  `;
  
  db.query(sql, [studentId, teacherId, subject, semester, grade, remarks || null], (err, result) => {
    if (err) {
      console.error("Error saving grade:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, message: "Grade saved successfully" });
  });
});

// Get grades for a specific class (with JOIN to users for course/yearLevel)
app.get("/api/grades", (req, res) => {
  const { course, yearLevel } = req.query;
  
  // If no parameters provided, return all grades (for admin view)
  if (!course && !yearLevel) {
    const sql = `
      SELECT g.id,
             g.student_id,
             g.teacher_id,
             g.subject,
             g.semester,
             g.prelim_grade as prelim,
             g.midterm_grade as midterm,
             g.finals_grade as finals,
             g.remarks,
             g.created_at,
             g.updated_at,
             u.name as student_name, 
             u.email as student_email,
             u.course,
             u.section,
             u.studentYearLevel as year_level
      FROM grades g
      LEFT JOIN users u ON g.student_id = u.id
      WHERE u.role = 'student'
      ORDER BY u.name, g.subject
    `;
    
    db.query(sql, (err, results) => {
      if (err) {
        console.error("Error fetching all grades:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    });
    return;
  }
  
  if (!course || !yearLevel) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const sql = `
    SELECT g.id,
           g.student_id,
           g.teacher_id,
           g.subject,
           g.semester,
           g.prelim_grade as prelim,
           g.midterm_grade as midterm,
           g.finals_grade as finals,
           g.remarks,
           g.created_at,
           g.updated_at,
           u.name as student_name, 
           u.email as student_email,
           u.course,
           u.section,
           u.studentYearLevel as year_level
    FROM grades g
    LEFT JOIN users u ON g.student_id = u.id
    WHERE u.course = ? AND u.studentYearLevel = ?
    ORDER BY u.name, g.subject
  `;
  
  db.query(sql, [course, yearLevel], (err, results) => {
    if (err) {
      console.error("Error fetching grades:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Get grades for a specific student (with course info from users table)
app.get("/api/grades/student/:studentId", (req, res) => {
  const { studentId } = req.params;
  
  const sql = `
    SELECT g.id,
           g.student_id,
           g.teacher_id,
           g.subject,
           g.semester,
           g.prelim_grade as prelim,
           g.midterm_grade as midterm,
           g.finals_grade as finals,
           g.remarks,
           g.created_at,
           g.updated_at,
           t.name as teacher_name,
           s.course,
           s.studentYearLevel as year_level
    FROM grades g
    LEFT JOIN users t ON g.teacher_id = t.id
    LEFT JOIN users s ON g.student_id = s.id
    WHERE g.student_id = ?
    ORDER BY g.subject
  `;
  
  db.query(sql, [studentId], (err, results) => {
    if (err) {
      console.error("Error fetching student grades:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Delete a grade
app.delete("/api/grades/:id", (req, res) => {
  const { id } = req.params;
  
  db.query("DELETE FROM grades WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error("Error deleting grade:", err);
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Grade not found" });
    }
    res.json({ success: true, message: "Grade deleted successfully" });
  });
});

// Delete grade by student, subject, and semester
app.delete("/api/grades/student/:studentId/subject/:subject/semester/:semester", (req, res) => {
  const { studentId, subject, semester } = req.params;
  
  db.query(
    "DELETE FROM grades WHERE student_id = ? AND subject = ? AND semester = ?", 
    [studentId, subject, semester], 
    (err, result) => {
      if (err) {
        console.error("Error deleting grade:", err);
        return res.status(500).json({ error: err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Grade not found" });
      }
      res.json({ success: true, message: "Grade deleted successfully" });
    }
  );
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
