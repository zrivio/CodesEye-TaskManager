<?php
const DB_HOST    = '127.0.0.1';
const DB_PORT    = '3306';
const DB_NAME    = 'task_db';
const DB_USER    = 'root';
const DB_PASS    = '1121!@';
const DB_CHARSET = 'utf8mb4';

// Stops the page with a short, friendly message. The real error is written
// to the PHP error log only, so passwords and server details never reach the browser.
function showDatabaseError(PDOException $e)
{
    error_log('[Task Manager] Database error: ' . $e->getMessage());

    http_response_code(500);
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Manager - Database error</title>
    </head>
    <body style="font-family: sans-serif; max-width: 520px; margin: 80px auto; padding: 0 20px;">
        <h1>We could not reach the database</h1>
        <p>Please make sure MySQL is running (in Laragon, press <strong>Start All</strong>)
           and that the <code>task_db</code> database has been imported from <code>task_db.sql</code>.</p>
    </body>
    </html>
    <?php
    exit;
}

$host = getenv('DB_HOST') ?: DB_HOST;
$port = getenv('DB_PORT') ?: DB_PORT;
$name = getenv('DB_NAME') ?: DB_NAME;
$user = getenv('DB_USER') !== false ? getenv('DB_USER') : DB_USER;
$pass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : DB_PASS;

$dsn = 'mysql:host=' . $host . ';port=' . $port . ';dbname=' . $name . ';charset=' . DB_CHARSET;

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,   // errors become exceptions we can catch
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,                    // real prepared statements (safer against SQL injection)
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    showDatabaseError($e);
}
