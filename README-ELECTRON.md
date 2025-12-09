# Attendance System - Electron App

## 📦 Build Standalone Installer

### Prerequisites:

1. MySQL must be installed and running on the target computer
2. Database `attendance_system` must be created

### Build Steps:

1. **Build the Electron App:**

   ```
   Double-click BUILD.bat
   ```

   OR

   ```powershell
   npm run build
   ```

2. **Find the Installer:**

   - Check the `dist` folder
   - File: `Attendance System Setup 1.0.0.exe`

3. **Install on Target PC:**
   - Copy the installer to flashdrive
   - Run on any Windows PC
   - Installer will create desktop shortcut

### Development Mode:

To test before building:

```
Double-click START-DEV.bat
```

## 🗄️ Database Setup on New PC:

### Option 1: Export/Import Database

```sql
-- On current PC (export)
mysqldump -u root attendance_system > database.sql

-- On new PC (import)
mysql -u root -e "CREATE DATABASE attendance_system"
mysql -u root attendance_system < database.sql
```

### Option 2: Auto-create Tables

The app will automatically create tables on first run if database exists.

## 🚀 Usage:

1. Make sure MySQL is running
2. Create database: `attendance_system`
3. Double-click the desktop shortcut
4. App will start automatically!

## 📝 Notes:

- App size: ~150MB (includes Node.js runtime)
- Requires: Windows 7 or higher
- Database: MySQL 5.7 or higher
- No internet required after installation
