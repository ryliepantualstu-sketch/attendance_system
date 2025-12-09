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
  
  // Drop the old table
  db.query('DROP TABLE IF EXISTS attendance', (err) => {
    if (err) {
      console.error('Drop error:', err);
      db.end();
      process.exit(1);
    }
    
    console.log('Old table dropped');
    
    // Create the new table with correct schema
    const createSQL = `
      CREATE TABLE attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        teacher_id INT NOT NULL,
        course VARCHAR(255) NOT NULL,
        year_level VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        status ENUM('present','absent') DEFAULT 'absent',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_attendance (student_id, date, course, year_level)
      )
    `;
    
    db.query(createSQL, (err) => {
      if (err) {
        console.error('Create error:', err);
        db.end();
        process.exit(1);
      }
      
      console.log('Attendance table created successfully with correct schema!');
      db.end();
    });
  });
});
