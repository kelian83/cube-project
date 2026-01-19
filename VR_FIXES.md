# Corrections VR - Meta Quest 3

## Problèmes identifiés et résolus :

### 1. **Contrôles incompatibles**
- **Problème** : `laser-controls` et `look-controls` ne sont pas adaptés à Quest 3
- **Solution** : Remplacé par `hand-controls` qui supporte les contrôleurs Quest natifs
- **Détail** : Les contrôleurs utilisent maintenant `gripdown/gripup` et `xbuttondown/xbuttonup`

### 2. **Configuration VR insuffisante**
- **Problème** : Le renderer n'était pas configuré pour WebXR
- **Solution** : Ajout de `xrweb` avec les features requises et `xrCompatible: true` au renderer
- **Détail** : Features activées : viewer, hand-tracking, hit-test

### 3. **Gestion des événements manquante**
- **Problème** : Les boutons Quest (X/A/grips) n'étaient pas gérés
- **Solution** : Ajout d'écouteurs pour `xbuttondown/up` et `abuttondown/up`
- **Détail** : Compatible avec les deux contrôleurs (gauche/droit)

### 4. **Camera en conflit**
- **Problème** : `look-controls` avec `pointerLockEnabled` bloquait le mode VR
- **Solution** : Supprimé `look-controls`, camera contrôlée uniquement par VR/wasd
- **Détail** : Suppression du curseur 2D incompatible avec VR

## Comment tester sur Meta Quest 3 :

### Option 1 : Streaming depuis le PC (Meta Link)
```bash
npm run dev
```
1. Ouvrir la liaison Meta Link sur le casque
2. Naviguer vers `http://192.168.X.X:5173`
3. Cliquer sur le bouton "Entrer en VR"

### Option 2 : Déploiement sur serveur HTTPS
- Le site DOIT être en HTTPS pour WebXR (sauf localhost)
- Utiliser Ngrok ou similaire pour le tunneling HTTPS local

### Option 3 : Test localement
- Vite démarre par défaut sur `http://localhost:5173`
- Quest 3 peut accéder via `http://192.168.X.X:5173` (même réseau)
- Requiert HTTPS en production

## Vérification de la compatibilité :

L'application affichera dans la console :
```
Severance VR - Ready
WebXR immersive-vr supported: true
✓ VR mode available for Meta Quest 3
```

## Commandes VR importantes :

- **Grab cable** : Gâchette (trigger) ou bouton Grip
- **Release cable** : Relâcher gâchette/grip
- **Boutons Quest** : X (gauche) / A (droit) pour alterner grab/release
- **Navigation** : Analogique gauche pour se déplacer (hors VR)
- **Quitter VR** : Bouton Home/Menu du casque

## Problèmes potentiels restants :

1. **Performance** : Trop de lights peut ralentir. Solution : réduire nombre de lights en VR
2. **Main tracking vs Controllers** : Actuellement en mode controllers. Hand tracking peut être activé avec `hand-tracking` feature
3. **CORS** : Si les assets ne chargent pas, vérifier la console pour erreurs CORS
4. **Hitbox** : Les zones d'interaction peuvent besoin d'ajustement pour les mains VR

## Prochaines optimisations :

- [ ] Réduire nombre de lights actives
- [ ] Optimiser le nombre d'entités dynamiques
- [ ] Ajouter LOD (Level of Detail) pour la performance
- [ ] Tester hand tracking avec gestes de pinch
- [ ] Ajouter audio spatial pour l'immersion
