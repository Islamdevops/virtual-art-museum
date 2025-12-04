<?php
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

return function ($app) {
    // Route لجلب بيانات الـ repository
    $app->get('/github/repo', function (Request $request, Response $response) {
        $ch = curl_init('https://api.github.com/repos/Islamdevops/virtual-art-museum');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERAGENT => 'VirtualArtMuseumApp',
            CURLOPT_HTTPHEADER => ['Accept: application/vnd.github.v3+json']
        ]);
        
        $data = json_decode(curl_exec($ch), true);
        curl_close($ch);
        
        $response->getBody()->write(json_encode([
            'success' => true,
            'data' => [
                'name' => $data['name'],
                'description' => $data['description'],
                'html_url' => $data['html_url']
            ]
        ]));
        
        return $response->withHeader('Content-Type', 'application/json');
    });

    // Route لجلب الملفات
    $app->get('/github/files', function (Request $request, Response $response) {
        $path = $request->getQueryParams()['path'] ?? '';
        $url = 'https://api.github.com/repos/Islamdevops/virtual-art-museum/contents/' . $path;
        
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERAGENT => 'VirtualArtMuseumApp',
            CURLOPT_HTTPHEADER => ['Accept: application/vnd.github.v3+json']
        ]);
        
        $data = curl_exec($ch);
        curl_close($ch);
        
        $response->getBody()->write($data);
        return $response->withHeader('Content-Type', 'application/json');
    });
};