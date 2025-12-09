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
  refactorGradesSchema();
});

function refactorGradesSchema() {
  console.log("\n=== REFACTORING GRADES SCHEMA ===\n");

  // Step 1: Create new grades table without course and year_level
  const createNewTable = `
    CREATE TABLE IF NOT EXISTS grades_new (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      teacher_id INT NOT NULL,
      subject VARCHAR(255) NOT NULL,
      semester ENUM('1st Semester','2nd Semester','Summer') NOT NULL,
      grade VARCHAR(10) NOT NULL,
      remarks TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_grade (student_id, subject, semester)
    )
  `;

  console.log("Step 1: Creating new grades table...");
  db.query(createNewTable, (err) => {
    if (err) {
      console.error("Error creating new table:", err);
      db.end();
      return;
    }
    console.log("✓ New grades table created\n");

    // Step 2: Copy data from old table to new table
    const copyData = `
      INSERT INTO grades_new (student_id, teacher_id, subject, semester, grade, remarks, created_at, updated_at)
      SELECT student_id, teacher_id, subject, semester, grade, remarks, created_at, updated_at
      FROM grades
      ON DUPLICATE KEY UPDATE 
        teacher_id = VALUES(teacher_id),
        grade = VALUES(grade),
        remarks = VALUES(remarks),
        updated_at = VALUES(updated_at)
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
      console.log("Step 3: Dropping old grades table...");
      db.query("DROP TABLE IF EXISTS grades", (err) => {
        if (err) {
          console.error("Error dropping old table:", err);
          db.end();
          return;
        }
        console.log("✓ Old table dropped\n");

        // Step 4: Rename new table to grades
        console.log("Step 4: Renaming new table...");
        db.query("RENAME TABLE grades_new TO grades", (err) => {
          if (err) {
            console.error("Error renaming table:", err);
            db.end();
            return;
          }
          console.log("✓ Table renamed to 'grades'\n");
          console.log("=== REFACTORING COMPLETE ===\n");
          console.log("Grades table now uses student_id + subject + semester as unique key.");
          console.log("Course and year_level will be retrieved from users table via JOIN.\n");
          db.end();
        });
      });
    });
  });
}
