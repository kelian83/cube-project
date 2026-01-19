# Script de lancement Severance VR pour Quest 3
# Expose automatiquement le serveur sur le réseau local

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SEVERANCE x B&O - WebXR Experience" -ForegroundColor Yellow
Write-Host "  Quest 3 Setup" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si npm est installé
try {
    $npmVersion = npm --version
    Write-Host "✓ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ npm n'est pas installé. Installez Node.js d'abord." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Démarrage du serveur de développement..." -ForegroundColor Yellow
Write-Host ""

# Obtenir l'adresse IP locale
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*"} | Select-Object -First 1).IPAddress

if ($ipAddress) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  URL pour Quest 3:" -ForegroundColor Yellow
    Write-Host "  http://${ipAddress}:5173/cube-project/" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Instructions:" -ForegroundColor Yellow
    Write-Host "1. Ouvrez le navigateur sur votre Quest 3" -ForegroundColor White
    Write-Host "2. Entrez l'URL ci-dessus" -ForegroundColor White
    Write-Host "3. Cliquez sur 'Enter VR'" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "⚠ Impossible de détecter l'adresse IP locale" -ForegroundColor Yellow
    Write-Host "  Vous devrez trouver l'adresse manuellement" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Appuyez sur Ctrl+C pour arrêter le serveur" -ForegroundColor Gray
Write-Host ""

# Lancer le serveur avec exposition réseau
npm run dev -- --host
