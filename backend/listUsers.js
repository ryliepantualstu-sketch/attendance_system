const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "attendance_system"
});

db.connect(err => {
  if (err) throw err;
  db.query("SELECT id, name, email, role FROM users", (err, results) => {
    if (err) throw err;
    console.table(results);
    db.end();
  });
});
