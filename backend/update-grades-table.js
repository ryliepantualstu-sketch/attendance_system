const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'attendance_system'
});

db.connect((err) => {
  if (err) {
    console.error('Connection error:', err);
    process.exit(1);
  }
  
  console.log('Connected to database');
  
  // Drop the old grades table
  db.query('DROP TABLE IF EXISTS grades', (err) => {
    if (err) {
      console.error('Drop error:', err);
      db.end();
      process.exit(1);
    }
    
    console.log('Old grades table dropped');
    
    // Create the new grades table with semester column
    const createSQL = `
      CREATE TABLE grades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        teacher_id INT NOT NULL,
        course VARCHAR(255) NOT NULL,
        year_level VARCHAR(50) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        semester ENUM('1st Semester','2nd Semester','Summer') NOT NULL,
        grade VARCHAR(10) NOT NULL,
        remarks TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_grade (student_id, course, year_level, subject, semester)
      )
    `;
    
    db.query(createSQL, (err) => {
      if (err) {
        console.error('Create error:', err);
        db.end();
        process.exit(1);
      }
      
      console.log('Grades table recreated successfully with semester column!');
      db.end();
    });
  });
});
