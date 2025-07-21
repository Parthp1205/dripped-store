<?php
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$pincode = $input['pincode'] ?? '';

if (!$pincode) {
  echo json_encode(['success' => false, 'error' => 'No pincode provided']);
  exit;
}

// Shiprocket login credentials (⚠️ Secure these in .env or move to backend later)
$email = 'drippedwearclothing@gmail.com';
$password = 'Mayur864001$';

// Step 1: Authenticate
$authCurl = curl_init();
curl_setopt_array($authCurl, [
  CURLOPT_URL => "https://apiv2.shiprocket.in/v1/external/auth/login",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => json_encode(['email' => $email, 'password' => $password]),
  CURLOPT_HTTPHEADER => ['Content-Type: application/json']
]);
$authResponse = curl_exec($authCurl);
curl_close($authCurl);
$authData = json_decode($authResponse, true);
$token = $authData['token'] ?? '';

if (!$token) {
  echo json_encode(['success' => false, 'error' => 'Token generation failed']);
  exit;
}

// Step 2: Check serviceability
$params = [
  'pickup_postcode' => '462001', // your pickup pin
  'delivery_postcode' => $pincode,
  'cod' => 1,
  'weight' => 0.5
];

$url = "https://apiv2.shiprocket.in/v1/external/courier/serviceability?" . http_build_query($params);
$serviceCurl = curl_init();
curl_setopt_array($serviceCurl, [
  CURLOPT_URL => $url,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    "Content-Type: application/json",
    "Authorization: Bearer $token"
  ]
]);
$response = curl_exec($serviceCurl);
curl_close($serviceCurl);
$data = json_decode($response, true);

if (!empty($data['available_courier_companies'][0]['rate'])) {
  $rate = round($data['available_courier_companies'][0]['rate']);
  echo json_encode(['success' => true, 'rate' => $rate]);
} else {
  echo json_encode(['success' => false, 'error' => 'Not serviceable or invalid pincode']);
}
