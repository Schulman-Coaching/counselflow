-- CounselFlow Database Initialization Script
-- This script runs when the MySQL container starts for the first time

-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS counselflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE counselflow;

-- Grant permissions to the application user
GRANT ALL PRIVILEGES ON counselflow.* TO 'counselflow'@'%';
FLUSH PRIVILEGES;

-- Note: Tables are created by Drizzle ORM using `npm run db:push`
-- This script only sets up the initial database and permissions

-- Optional: Create test database for CI/CD
CREATE DATABASE IF NOT EXISTS counselflow_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON counselflow_test.* TO 'counselflow'@'%';
FLUSH PRIVILEGES;
