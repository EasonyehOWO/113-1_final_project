<?php
$host = 'localhost';
$dbname = 'cvml';
$username = 'cvml';
$password = '114DWP2025';

$conn = new mysqli($host, $username, $password, $dbname);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$conn->set_charset("utf8mb4");
?>
