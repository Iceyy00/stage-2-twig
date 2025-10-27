<?php
// Simple front controller for DomTicket demo app (Twig templates)
// If dependencies are not installed, show a friendly message.
if (!file_exists(__DIR__ . '/../vendor/autoload.php')) {
    echo "<html><head><meta charset=\"utf-8\"><title>DomTicket</title></head><body>\n";
    echo "<h1>DomTicket</h1>\n<p>Please run <code>composer install</code> in the project root to install Twig.</p>\n";
    echo "<p>After that, serve this folder with: <code>php -S localhost:8000 -t domticket/public</code></p>\n";
    echo "</body></html>";
    exit;
}

require_once __DIR__ . '/../vendor/autoload.php';

use Twig\Loader\FilesystemLoader;
use Twig\Environment;

$loader = new FilesystemLoader(__DIR__ . '/../templates');
$twig = new Environment($loader);

// Determine page from query (simple router)
$p = isset($_GET['p']) ? $_GET['p'] : 'landing';

$allowed = [
    'landing',
    'auth/login',
    'auth/signup',
    'dashboard',
    'tickets'
];

if (!in_array($p, $allowed)) {
    header('HTTP/1.0 404 Not Found');
    echo $twig->render('landing.twig', ['error' => 'Page not found']);
    exit;
}

echo $twig->render(str_replace('/', DIRECTORY_SEPARATOR, $p) . '.twig', []);

// Note: Authentication and data are handled client-side using localStorage as a demo.
