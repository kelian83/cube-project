# Audio Stems pour Severance VR Experience

## Fichiers requis

Placez les fichiers audio suivants dans ce dossier :

| Fichier | Description | Cable ID |
|---------|-------------|----------|
| `stem-bass.mp3` | Piste de basse | Cable 1 |
| `stem-melody.mp3` | Piste mélodique | Cable 2 |
| `stem-perc.mp3` | Piste percussions | Cable 3 |
| `stem-atmos.mp3` | Piste atmosphère/pad | Cable 4 |
| `voice-reward.mp3` | Voix de récompense "The Board acknowledges..." | Finale |
| `hydraulic.mp3` | Son mécanique/hydraulique pour la descente de la table | Transition |
| `glitch-alarm.mp3` | Son d'alarme/glitch pour la transition Overtime | Transition |

## Spécifications techniques

- **Format** : MP3 (recommandé) ou OGG
- **Durée** : Toutes les pistes de musique doivent avoir la **même durée** pour la synchronisation
- **Tempo** : Identique sur toutes les pistes
- **Qualité** : 128-192 kbps minimum

## Comportement

1. Au chargement, toutes les pistes musicales démarrent simultanément (volume 0)
2. Chaque câble connecté active sa piste avec un fade-in fluide
3. À 100% de complétion (4 câbles), la séquence Overtime se déclenche :
   - Lecture de `voice-reward.mp3`
   - Son `hydraulic.mp3` : la table descend dans le sol
   - Le bouton OVERTIME apparaît
   - Lumières rouges pulsantes (ambiance tendue)
4. Au clic sur le bouton OVERTIME :
   - Son `glitch-alarm.mp3` : effet strobe noir/blanc
   - Transition vers le monde extérieur (outie_world.glb)

## Ressources gratuites pour les stems

- [Freesound.org](https://freesound.org)
- [SampleSwap](https://sampleswap.org)
- Créez vos propres stems avec un DAW (Ableton, FL Studio, GarageBand)
