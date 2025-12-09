@echo off
echo ========================================
echo  Attendance System - Building Electron App
echo ========================================
echo.

echo Step 1: Building React Frontend...
cd react-frontend
call npm run build
cd ..

echo.
echo Step 2: Installing Backend Dependencies...
cd backend
call npm install --production
cd ..

echo.
echo Step 3: Building Electron App...
call npm run build

echo.
echo ========================================
echo  Build Complete!
echo  Check the 'dist' folder for the installer
echo ========================================
pause
