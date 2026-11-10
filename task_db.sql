-- ---------------------------------------------------------------
-- Task Manager (TaskaNa) database
--
-- Laragon: open HeidiSQL (Database > "Open HeidiSQL") or phpMyAdmin,
-- then import / run this whole file once.
-- ---------------------------------------------------------------

CREATE DATABASE IF NOT EXISTS `task_db`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `task_db`;

CREATE TABLE IF NOT EXISTS `tasks` (
    `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title`        VARCHAR(100) NOT NULL,
    `description`  VARCHAR(255) NOT NULL DEFAULT '',
    `due_date`     DATE NOT NULL,
    `priority`     ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    `status`       ENUM('pending', 'completed') NOT NULL DEFAULT 'pending',
    `completed_at` DATE NULL DEFAULT NULL,        -- day the task was checked off (for the Completed page's "overdue")
    `is_deleted`   TINYINT(1) NOT NULL DEFAULT 0, -- 1 = task is in the Bin
    `deleted_at`   DATETIME NULL DEFAULT NULL,    -- when it was moved to the Bin (restorable for 30 days)
    `created_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_bin` (`is_deleted`, `deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
