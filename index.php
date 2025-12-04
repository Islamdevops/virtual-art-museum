<?php
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;

require __DIR__ . '/vendor/autoload.php';

// إعداد التطبيق
$app = AppFactory::create();

// إضافة middleware لتحليل JSON
$app->addBodyParsingMiddleware();

// الاتصال بقاعدة البيانات
$config = require __DIR__ . '/config/database.php';

// ========== ROUTES ==========

// 1. Route الرئيسية
$app->get('/', function (Request $request, Response $response, $args) {
    $response->getBody()->write("Welcome to Virtual Art Museum");
    return $response;
});

// 2. Route لعرض الأعمال الفنية
$app->get('/artworks', function (Request $request, Response $response, $args) use ($config) {
    // ... كود قاعدة البيانات ...
});

// 3. Route لإضافة عمل فني
$app->post('/artworks', function (Request $request, Response $response, $args) use ($config) {
    // ... كود إضافة عمل فني ...
});

// 4. Route لجلب بيانات من GitHub API (هنا تكتبه)
$app->get('/github-data', function (Request $request, Response $response, $args) {
    // استخدم cURL بدلاً من file_get_contents للأفضل
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://api.github.com/repos/Islamdevops/virtual-art-museum');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_USERAGENT, 'VirtualArtMuseumApp');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: application/vnd.github.v3+json'
    ]);
    
    $githubData = curl_exec($ch);
    curl_close($ch);
    
    $data = json_decode($githubData, true);
    
    // يمكنك معالجة البيانات كما تريد
    $processedData = [
        'repo_name' => $data['full_name'] ?? '',
        'description' => $data['description'] ?? '',
        'stars' => $data['stargazers_count'] ?? 0,
        'forks' => $data['forks_count'] ?? 0,
        'url' => $data['html_url'] ?? ''
    ];
    
    $response->getBody()->write(json_encode($processedData));
    return $response->withHeader('Content-Type', 'application/json');
});

// 5. Route لملفات المشروع من GitHub
$app->get('/github-files', function (Request $request, Response $response, $args) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://api.github.com/repos/Islamdevops/virtual-art-museum/contents');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_USERAGENT, 'VirtualArtMuseumApp');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: application/vnd.github.v3+json'
    ]);
    
    $githubData = curl_exec($ch);
    curl_close($ch);
    
    $response->getBody()->write($githubData);
    return $response->withHeader('Content-Type', 'application/json');
});

// تشغيل التطبيق
$app->run();