# Deployment Guide

## Backend Deployment (Render)

1. Go to [render.com](https://render.com) and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository: `attendance-system`
4. Configure:
   - **Name**: attendance-system-backend
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click "Create Web Service"
6. Go to "Environment" tab and add:
   - `DB_HOST` - (from Render MySQL)
   - `DB_USER` - (from Render MySQL)
   - `DB_PASSWORD` - (from Render MySQL)
   - `DB_NAME` - `attendance_system`
   - `JWT_SECRET` - (any random string)
   - `PORT` - `5000`
7. Create MySQL database:
   - Click "New +" → "MySQL"
   - Name: `attendance-db`
   - Copy connection details to backend environment variables
8. Copy your backend URL (e.g., `https://attendance-system-backend-xxx.onrender.com`)

## Frontend Deployment (Vercel)

1. Install Vercel CLI: `npm install -g vercel`
2. Update `.env.production` with your Render backend URL
3. Navigate to react-frontend: `cd react-frontend`
4. Deploy: `vercel --prod`
5. Follow prompts:
   - Link to existing project? No
   - Project name: attendance-system-frontend
   - Directory: `./`
   - Build command: `npm run build`
   - Output directory: `build`

## Post-Deployment

1. Test all features:
   - Login (admin, teacher, student)
   - Attendance marking
   - Grade submission (prelim, midterm, finals)
   - Grade viewing
   - Grade deletion
2. Import database schema to Render MySQL
3. Add test users using the backend API

## Database Setup

Connect to Render MySQL and run:

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role ENUM('admin', 'teacher', 'student') NOT NULL,
  year_level VARCHAR(20),
  section VARCHAR(20)
);

CREATE TABLE attendance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  date DATE NOT NULL,
  status ENUM('present', 'absent', 'late') NOT NULL,
  FOREIGN KEY (student_id) REFERENCES users(id)
);

CREATE TABLE grades (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  subject VARCHAR(100) NOT NULL,
  prelim_grade VARCHAR(10),
  midterm_grade VARCHAR(10),
  finals_grade VARCHAR(10),
  semester VARCHAR(20) NOT NULL,
  FOREIGN KEY (student_id) REFERENCES users(id)
);
```
