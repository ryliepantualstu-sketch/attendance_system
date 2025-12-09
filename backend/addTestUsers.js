require("dotenv").config();
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "attendance_system"
});

db.connect(err => {
  if (err) throw err;
  console.log("Connected to DB");

  const passwordHash = bcrypt.hashSync("1234", 10);

  const sql = `
    INSERT INTO users (name, email, password, role) VALUES
    ('Admin User','admin@example.com','${passwordHash}','admin'),
    ('Teacher User','teacher@example.com','${passwordHash}','teacher'),
    ('Student User','student@example.com','${passwordHash}','student')
    ON DUPLICATE KEY UPDATE password='${passwordHash}';
  `;

  db.query(sql, (err) => {
    if (err) throw err;
    console.log("Test users added!");
    db.end();
  });
});
