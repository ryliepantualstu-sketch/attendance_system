require("dotenv").config();
const mysql = require("mysql2");

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "attendance_system"
};

const db = mysql.createConnection(dbConfig);

db.connect(err => {
  if (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
  console.log("Connected to database!");
  refactorAttendanceSchema();
});

function refactorAttendanceSchema() {
  console.log("\n=== REFACTORING ATTENDANCE SCHEMA ===\n");

  // Step 1: Create new attendance table without course and year_level
  const createNewTable = `
    CREATE TABLE IF NOT EXISTS attendance_new (
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

  console.log("Step 1: Creating new attendance table...");
  db.query(createNewTable, (err) => {
    if (err) {
      console.error("Error creating new table:", err);
      db.end();
      return;
    }
    console.log("✓ New attendance table created\n");

    // Step 2: Copy data from old table to new table (only keep unique student_id + date combinations)
    const copyData = `
      INSERT INTO attendance_new (student_id, teacher_id, date, status, created_at)
      SELECT student_id, teacher_id, date, status, created_at
      FROM attendance
      ON DUPLICATE KEY UPDATE 
        teacher_id = VALUES(teacher_id),
        status = VALUES(status),
        created_at = VALUES(created_at)
    `;

    console.log("Step 2: Copying data from old table...");
    db.query(copyData, (err, result) => {
      if (err) {
        console.error("Error copying data:", err);
        db.end();
        return;
      }
      console.log(`✓ Copied ${result.affectedRows} records\n`);

      // Step 3: Drop old table
      console.log("Step 3: Dropping old attendance table...");
      db.query("DROP TABLE IF EXISTS attendance", (err) => {
        if (err) {
          console.error("Error dropping old table:", err);
          db.end();
          return;
        }
        console.log("✓ Old table dropped\n");

        // Step 4: Rename new table to attendance
        console.log("Step 4: Renaming new table...");
        db.query("RENAME TABLE attendance_new TO attendance", (err) => {
          if (err) {
            console.error("Error renaming table:", err);
            db.end();
            return;
          }
          console.log("✓ Table renamed to 'attendance'\n");
          console.log("=== REFACTORING COMPLETE ===\n");
          console.log("Attendance table now uses student_id + date as unique key.");
          console.log("Course and year_level will be retrieved from users table via JOIN.\n");
          db.end();
        });
      });
    });
  });
}
