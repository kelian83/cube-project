import 'aframe';
/**
 * Severance x Bang & Olufsen - WebXR Experience
 * Optimisé pour Meta Quest 3
 * 
 * AUCUN événement souris - Uniquement contrôleurs VR
 */

// ============================================
// GLOBAL STATE
// ============================================
const GameState = {
  connectedCables: 0,
  cables: {},
  partyMode: false,
  
  // Système Audio Stems
  audioStems: {},
  audioInitialized: false,
  cableToStem: {
    1: 'stem-bass',
    2: 'stem-melody',
    3: 'stem-perc',
    4: 'stem-atmos'
  },
  
  initAudio() {
    if (this.audioInitialized) return;
    
    const stemIds = ['stem-bass', 'stem-melody', 'stem-perc', 'stem-atmos'];
    stemIds.forEach(id => {
      const audio = document.getElementById(id);
      if (audio) {
        audio.volume = 0;
        audio.loop = true;
        this.audioStems[id] = audio;
      }
    });
    
    this.audioInitialized = true;
    console.log('✓ Système audio initialisé - Stems prêts');
  },
  
  startAllStems() {
    if (!this.audioInitialized) this.initAudio();
    
    Object.values(this.audioStems).forEach(audio => {
      audio.currentTime = 0;
      audio.play().catch(e => console.warn('Autoplay bloqué:', e));
    });
    
    console.log('♫ Stems démarrés (synchronisés) - Volume: 0');
  },
  
  activateStem(cableId) {
    const stemId = this.cableToStem[cableId];
    const audio = this.audioStems[stemId];
    
    if (!audio) return;
    
    // Fade in fluide
    let vol = 0;
    const fadeIn = setInterval(() => {
      vol += 0.05;
      audio.volume = Math.min(1, vol);
      if (vol >= 1) {
        clearInterval(fadeIn);
        console.log('♫ Stem activé:', stemId);
      }
    }, 40);
  },
  
  updateMacScreen() {
    const progress = (this.connectedCables / 4) * 100;
    const macText = document.getElementById('mac-status');
    
    if (!macText) return;
    
    if (progress < 100) {
      const status = progress < 50 ? 'CRITICAL' : 'MODERATE';
      macText.setAttribute('value', `DATA CORRUPTION:\n${status}\n\nREFINEMENT: ${progress}%`);
    } else {
      macText.setAttribute('value', 'QUOTA MET.\n\nREWARD\nAVAILABLE.');
      macText.setAttribute('animation', {
        property: 'material.opacity',
        from: 1,
        to: 0.3,
        dur: 500,
        dir: 'alternate',
        loop: true
      });
    }
  },
  
  addConnection(cableId) {
    if (!this.cables[cableId]) {
      this.cables[cableId] = true;
      this.connectedCables++;
      console.log(`Cable ${cableId} connecté. Total: ${this.connectedCables}/4`);
      
      // Activer le stem correspondant
      this.activateStem(cableId);
      
      // Mettre à jour l'écran Mac
      this.updateMacScreen();
      
      if (this.connectedCables === 4 && !this.partyMode) {
        this.partyMode = true;
        document.querySelector('a-scene').emit('start-reward-sequence');
      }
    }
  }
};

// ============================================
// COMPONENT: gamepad-movement
// Gère le déplacement avec le joystick de la manette
// Fonctionne avec Meta Quest 3
// ============================================
AFRAME.registerComponent('gamepad-movement', {
  schema: {
    speed: { type: 'number', default: 2.5 },
    deadzone: { type: 'number', default: 0.2 }
  },

  init: function () {
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.cameraEl = null;
    
    console.log('🎮 Gamepad movement initialisé - Quest 3');
  },

  tick: function (time, delta) {
    // Récupérer la caméra
    if (!this.cameraEl) {
      this.cameraEl = this.el.querySelector('[camera]') || document.querySelector('[camera]');
      if (!this.cameraEl) return;
    }

    // Lire les gamepads via l'API native
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let axisX = 0;
    let axisY = 0;
    let found = false;

    for (const gamepad of gamepads) {
      if (!gamepad) continue;
      
      // Chercher une manette avec des axes (Quest controllers ont 4 axes)
      if (gamepad.axes && gamepad.axes.length >= 2) {
        // Meta Quest 3: Le joystick gauche est sur les axes 0 et 1 pour le premier gamepad
        // ou axes 2 et 3 pour certains mappings
        const id = gamepad.id.toLowerCase();
        
        if (id.includes('left') || id.includes('oculus') || id.includes('meta') || id.includes('quest')) {
          // Essayer axes 2,3 d'abord (thumbstick), sinon 0,1
          if (gamepad.axes.length >= 4) {
            axisX = gamepad.axes[2];
            axisY = gamepad.axes[3];
          } else {
            axisX = gamepad.axes[0];
            axisY = gamepad.axes[1];
          }
          found = true;
          break;
        }
      }
    }

    // Si aucun gamepad spécifique trouvé, prendre le premier disponible
    if (!found) {
      for (const gamepad of gamepads) {
        if (!gamepad || !gamepad.axes || gamepad.axes.length < 2) continue;
        
        if (gamepad.axes.length >= 4) {
          axisX = gamepad.axes[2];
          axisY = gamepad.axes[3];
        } else {
          axisX = gamepad.axes[0];
          axisY = gamepad.axes[1];
        }
        break;
      }
    }

    // Appliquer la deadzone
    if (Math.abs(axisX) < this.data.deadzone) axisX = 0;
    if (Math.abs(axisY) < this.data.deadzone) axisY = 0;

    if (axisX === 0 && axisY === 0) return;

    // Obtenir la direction de la caméra
    this.cameraEl.object3D.getWorldDirection(this.direction);
    this.direction.y = 0;
    this.direction.normalize();

    // Calculer le vecteur droite
    const right = new THREE.Vector3();
    right.crossVectors(new THREE.Vector3(0, 1, 0), this.direction).normalize();

    // Calculer le déplacement
    const speed = this.data.speed * (delta / 1000);
    
    this.velocity.set(0, 0, 0);
    this.velocity.addScaledVector(this.direction, -axisY * speed);
    this.velocity.addScaledVector(right, -axisX * speed);

    // Appliquer au rig
    this.el.object3D.position.add(this.velocity);
  }
});

// ============================================
// COMPONENT: cable-system
// Gère la physique simplifiée des câbles
// ============================================
AFRAME.registerComponent('cable-system', {
  schema: {
    cableId: { type: 'int', default: 1 },
    startPos: { type: 'vec3', default: { x: 0, y: 2.8, z: -0.8 } },
    color: { type: 'color', default: '#3498db' },
    segments: { type: 'int', default: 8 },
    segmentLength: { type: 'number', default: 0.15 }
  },

  init: function () {
    this.isGrabbed = false;
    this.grabbedBy = null;
    this.isConnected = false;
    this.targetPort = null;
    this.segments = [];
    this.tipPosition = new THREE.Vector3();
    
    this.createCable();
    this.createTip();
  },

  createCable: function () {
    const data = this.data;
    const startPos = data.startPos;
    
    // Créer les segments du câble
    for (let i = 0; i < data.segments; i++) {
      const segment = document.createElement('a-cylinder');
      segment.setAttribute('radius', 0.008);
      segment.setAttribute('height', data.segmentLength);
      segment.setAttribute('material', {
        color: data.color,
        roughness: 0.6,
        metalness: 0.2
      });
      
      // Position initiale pendante
      const yOffset = startPos.y - (i * data.segmentLength);
      segment.setAttribute('position', {
        x: startPos.x,
        y: yOffset,
        z: startPos.z
      });
      
      this.el.appendChild(segment);
      this.segments.push(segment);
    }
    
    // Position initiale du tip
    this.tipPosition.set(
      startPos.x,
      startPos.y - (data.segments * data.segmentLength),
      startPos.z
    );
  },

  createTip: function () {
    // Créer l'extrémité saisissable du câble
    const tip = document.createElement('a-entity');
    tip.setAttribute('id', `cable-tip-${this.data.cableId}`);
    tip.classList.add('cable-tip');
    tip.classList.add('grabbable');
    
    // Forme du connecteur
    tip.setAttribute('geometry', {
      primitive: 'cylinder',
      radius: 0.015,
      height: 0.04
    });
    tip.setAttribute('material', {
      color: '#333333',
      metalness: 0.8,
      roughness: 0.2
    });
    
    // Positionnement initial
    tip.setAttribute('position', this.tipPosition);
    tip.setAttribute('rotation', '90 0 0');
    
    // Stocker la référence
    tip.cableComponent = this;
    
    this.el.appendChild(tip);
    this.tipEl = tip;
  },

  tick: function () {
    if (this.isConnected) return;
    
    if (this.isGrabbed && this.grabbedBy) {
      // Suivre la position de la main
      const handPos = new THREE.Vector3();
      this.grabbedBy.object3D.getWorldPosition(handPos);
      
      // Mettre à jour la position du tip
      this.tipEl.object3D.position.copy(handPos);
      this.tipPosition.copy(handPos);
      
      // Mettre à jour les segments du câble (IK simplifié)
      this.updateCableSegments();
      
      // Vérifier la proximité avec les ports
      this.checkPortProximity();
    }
  },

  updateCableSegments: function () {
    const startPos = this.data.startPos;
    const endPos = this.tipPosition;
    const segments = this.segments;
    const numSegments = segments.length;
    
    for (let i = 0; i < numSegments; i++) {
      const t = i / numSegments;
      
      // Interpolation avec courbe de Bézier simplifiée
      const midY = Math.min(startPos.y, endPos.y) - 0.3 * (1 - Math.abs(t - 0.5) * 2);
      
      const x = THREE.MathUtils.lerp(startPos.x, endPos.x, t);
      const y = THREE.MathUtils.lerp(startPos.y, endPos.y, t) + 
                (1 - t) * 0.1 * Math.sin(t * Math.PI);
      const z = THREE.MathUtils.lerp(startPos.z, endPos.z, t);
      
      segments[i].setAttribute('position', { x, y, z });
      
      // Orienter le segment vers le suivant
      if (i < numSegments - 1) {
        const nextT = (i + 1) / numSegments;
        const nextX = THREE.MathUtils.lerp(startPos.x, endPos.x, nextT);
        const nextY = THREE.MathUtils.lerp(startPos.y, endPos.y, nextT);
        const nextZ = THREE.MathUtils.lerp(startPos.z, endPos.z, nextT);
        
        const dir = new THREE.Vector3(nextX - x, nextY - y, nextZ - z).normalize();
        const euler = new THREE.Euler();
        euler.setFromQuaternion(
          new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            dir
          )
        );
        
        segments[i].object3D.rotation.copy(euler);
      }
    }
  },

  checkPortProximity: function () {
    const ports = document.querySelectorAll('.cable-port');
    const tipWorldPos = new THREE.Vector3();
    this.tipEl.object3D.getWorldPosition(tipWorldPos);
    
    ports.forEach(port => {
      const portPos = new THREE.Vector3();
      port.object3D.getWorldPosition(portPos);
      
      const distance = tipWorldPos.distanceTo(portPos);
      
      if (distance < 0.1) { // 10cm
        this.targetPort = port;
        // Feedback visuel - légère attraction
        if (distance < 0.05) {
          this.snapToPort(port);
        }
      }
    });
  },

  snapToPort: function (port) {
    if (this.isConnected) return;
    
    const portPos = new THREE.Vector3();
    port.object3D.getWorldPosition(portPos);
    
    // Snap le tip au port
    this.tipEl.object3D.position.set(portPos.x, portPos.y, portPos.z + 0.02);
    this.tipPosition.copy(portPos);
    this.tipPosition.z += 0.02;
    
    // Marquer comme connecté
    this.isConnected = true;
    this.isGrabbed = false;
    this.grabbedBy = null;
    
    // Changer la couleur de l'anneau en vert
    const ring = port.querySelector('.port-ring');
    if (ring) {
      ring.setAttribute('material', {
        color: '#00FF00',
        emissive: '#00FF00',
        emissiveIntensity: 0.8,
        side: 'double'
      });
    }
    
    // Jouer le son
    const plugSound = document.querySelector('#plug-sound');
    if (plugSound) {
      plugSound.currentTime = 0;
      plugSound.play().catch(() => {});
    }
    
    // Feedback haptique (grosse vibration)
    if (this.grabbedBy) {
      const gamepad = this.getGamepad(this.grabbedBy);
      if (gamepad && gamepad.hapticActuators && gamepad.hapticActuators[0]) {
        gamepad.hapticActuators[0].pulse(1.0, 200);
      }
    }
    
    // Mettre à jour les segments une dernière fois
    this.updateCableSegments();
    
    // Notifier le state manager
    GameState.addConnection(this.data.cableId);
    
    console.log(`Câble ${this.data.cableId} connecté au port!`);
  },

  grab: function (hand) {
    if (this.isConnected) return;
    
    this.isGrabbed = true;
    this.grabbedBy = hand;
    
    // Feedback haptique (petite vibration)
    const gamepad = this.getGamepad(hand);
    if (gamepad && gamepad.hapticActuators && gamepad.hapticActuators[0]) {
      gamepad.hapticActuators[0].pulse(0.4, 50);
    }
    
    console.log(`Câble ${this.data.cableId} saisi!`);
  },

  release: function () {
    if (this.isConnected) return;
    
    this.isGrabbed = false;
    this.grabbedBy = null;
    
    // Si proche d'un port, snap
    if (this.targetPort) {
      this.snapToPort(this.targetPort);
    }
  },

  getGamepad: function (hand) {
    const handId = hand.getAttribute('id');
    const session = this.el.sceneEl.xrSession;
    
    if (!session) return null;
    
    const inputSources = session.inputSources;
    for (const source of inputSources) {
      if (source.gamepad) {
        if ((handId.includes('left') && source.handedness === 'left') ||
            (handId.includes('right') && source.handedness === 'right')) {
          return source.gamepad;
        }
      }
    }
    return null;
  }
});

// ============================================
// COMPONENT: cable-port
// Gère les ports de connexion
// ============================================
AFRAME.registerComponent('cable-port', {
  schema: {
    portId: { type: 'int', default: 1 },
    connected: { type: 'boolean', default: false }
  },

  init: function () {
    this.connected = false;
  }
});

// ============================================
// COMPONENT: vr-hand-controls
// Gère les interactions VR (grip, trigger)
// ============================================
AFRAME.registerComponent('vr-hand-controls', {
  schema: {
    hand: { type: 'string', default: 'right' }
  },

  init: function () {
    this.grabbedCable = null;
    this.isGripping = false;
    
    // Écouter les événements des contrôleurs VR
    // GRIP pour saisir
    this.el.addEventListener('gripdown', this.onGripDown.bind(this));
    this.el.addEventListener('gripup', this.onGripUp.bind(this));
    
    // TRIGGER comme alternative
    this.el.addEventListener('triggerdown', this.onGripDown.bind(this));
    this.el.addEventListener('triggerup', this.onGripUp.bind(this));
    
    // A Button comme alternative supplémentaire
    this.el.addEventListener('abuttondown', this.onGripDown.bind(this));
    this.el.addEventListener('abuttonup', this.onGripUp.bind(this));
    
    // X Button pour main gauche
    this.el.addEventListener('xbuttondown', this.onGripDown.bind(this));
    this.el.addEventListener('xbuttonup', this.onGripUp.bind(this));
  },

  onGripDown: function (evt) {
    if (this.isGripping) return;
    this.isGripping = true;
    
    // Chercher un câble proche
    const handPos = new THREE.Vector3();
    this.el.object3D.getWorldPosition(handPos);
    
    const cableTips = document.querySelectorAll('.cable-tip');
    let closestCable = null;
    let closestDist = 0.15; // 15cm de distance max
    
    cableTips.forEach(tip => {
      const tipPos = new THREE.Vector3();
      tip.object3D.getWorldPosition(tipPos);
      
      const dist = handPos.distanceTo(tipPos);
      if (dist < closestDist) {
        closestDist = dist;
        closestCable = tip.cableComponent;
      }
    });
    
    if (closestCable && !closestCable.isConnected) {
      this.grabbedCable = closestCable;
      closestCable.grab(this.el);
    }
  },

  onGripUp: function (evt) {
    this.isGripping = false;
    
    if (this.grabbedCable) {
      this.grabbedCable.release();
      this.grabbedCable = null;
    }
  }
});

// ============================================
// COMPONENT: state-manager
// Gère les transitions d'état (Reward Sequence)
// ============================================
AFRAME.registerComponent('state-manager', {
  init: function () {
    this.el.addEventListener('start-reward-sequence', this.triggerRewardSequence.bind(this));
    // Alias pour compatibilité
    this.el.addEventListener('start-disco-mode', this.triggerRewardSequence.bind(this));
  },

  triggerRewardSequence: function () {
    console.log('🏆 QUOTA MET - REWARD SEQUENCE INITIATED 🏆');
    
    const scene = this.el;
    
    // Étape 1: Coupure brève du son (0.5s)
    Object.values(GameState.audioStems).forEach(audio => {
      audio.volume = 0;
    });
    
    // Étape 2: Éteindre les lumières du plafond
    const ceilingLights = document.querySelectorAll('.ceiling-light');
    ceilingLights.forEach((light, index) => {
      light.setAttribute('animation', {
        property: 'material.emissiveIntensity',
        to: 0,
        dur: 1200,
        delay: index * 80,
        easing: 'easeOutQuad'
      });
      
      light.setAttribute('animation__color', {
        property: 'material.emissive',
        to: '#000000',
        dur: 1200,
        delay: index * 80
      });
    });
    
    // Étape 3: Voix de récompense après 0.5s
    setTimeout(() => {
      const voiceReward = document.getElementById('voice-reward');
      if (voiceReward) {
        voiceReward.volume = 1;
        voiceReward.play().catch(e => console.warn('Voice reward:', e));
        console.log('🎙️ "The Board acknowledges..."');
      }
    }, 500);

    // Étape 4: Ambiance Jazz Club / Luxe
    setTimeout(() => {
      scene.setAttribute('fog', {
        type: 'exponential',
        color: '#1a0a20',
        density: 0.035
      });
    }, 800);

    // Étape 5: Lumières Luxueuses après le fade out
    setTimeout(() => {
      const discoLights = document.querySelector('#disco-lights');
      if (discoLights) {
        discoLights.setAttribute('visible', true);
        
        const lights = discoLights.querySelectorAll('a-light');
        lights.forEach((light, index) => {
          // Appliquer le composant luxe-pulse
          light.removeAttribute('rgb-disco');
          light.setAttribute('luxe-pulse', {
            colorIndex: index % 3,
            speed: 0.3 + (index * 0.08)
          });
          
          light.setAttribute('animation__intensity', {
            property: 'intensity',
            from: 0,
            to: 1.5,
            dur: 1000,
            delay: index * 150,
            easing: 'easeInQuad'
          });
        });
      }
      
      // Lumière ambiante chaude
      const ambientLight = scene.querySelector('a-light[type="ambient"]');
      if (ambientLight) {
        ambientLight.setAttribute('animation', {
          property: 'color',
          to: '#2a1a10',
          dur: 2000
        });
      }
    }, 1500);

    // Étape 6: Reprise de la musique à plein volume
    setTimeout(() => {
      Object.values(GameState.audioStems).forEach(audio => {
        let vol = 0;
        const fadeIn = setInterval(() => {
          vol += 0.05;
          audio.volume = Math.min(1, vol);
          if (vol >= 1) clearInterval(fadeIn);
        }, 50);
      });
      console.log('♫ Musique complète - Full volume');
    }, 2000);

    // Étape 7: Animation douce des enceintes
    setTimeout(() => {
      this.startSpeakerAnimation();
    }, 2200);
  },

  startSpeakerAnimation: function () {
    const speakers = document.querySelectorAll('.speaker');
    
    speakers.forEach((speaker, index) => {
      // Animation de pulsation douce (style luxe)
      speaker.setAttribute('animation__scale', {
        property: 'scale',
        from: '1 1 1',
        to: '1.02 1.04 1.02',
        dur: 400,
        dir: 'alternate',
        loop: true,
        easing: 'easeInOutSine'
      });
      
      // Légère lumière dorée sur les enceintes
      speaker.setAttribute('animation__emissive', {
        property: 'material.emissive',
        from: '#000000',
        to: '#3a2a00',
        dur: 800,
        dir: 'alternate',
        loop: true,
        delay: index * 100
      });
    });
  }
});

// ============================================
// COMPONENT: luxe-pulse
// Lumières style Jazz Club / Luxe
// ============================================
AFRAME.registerComponent('luxe-pulse', {
  schema: {
    colorIndex: { type: 'int', default: 0 },
    speed: { type: 'number', default: 0.4 }
  },
  
  init: function () {
    this.time = Math.random() * 10;
    // Palette Jazz Club Luxe: Or, Pourpre Profond, Blanc Chaud
    this.luxeColors = [
      { r: 255, g: 215, b: 0 },    // Or (#FFD700)
      { r: 75, g: 0, b: 130 },      // Pourpre Profond (#4B0082)
      { r: 255, g: 244, b: 230 }    // Blanc Chaud (#FFF4E6)
    ];
  },
  
  tick: function (time, delta) {
    this.time += delta * 0.001 * this.data.speed;
    
    const color = this.luxeColors[this.data.colorIndex % this.luxeColors.length];
    
    // Pulsation douce et élégante
    const intensity = 1.2 + Math.sin(this.time * Math.PI) * 0.6;
    
    this.el.setAttribute('light', {
      intensity: intensity,
      color: `rgb(${color.r}, ${color.g}, ${color.b})`
    });
  }
});

// ============================================
// Initialisation au chargement
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('Severance x Bang & Olufsen - WebXR Experience');
  console.log('Optimisé pour Meta Quest 3');
  console.log('Utilisez les contrôleurs VR pour saisir les câbles (GRIP)');
  
  // Initialiser le système audio
  GameState.initAudio();
  console.log('🎵 Audio System Ready - Interaction requise pour démarrer');
});

// Démarrer les stems au premier clic (contourne l'autoplay policy)
document.addEventListener('click', function initStems() {
  GameState.startAllStems();
  document.removeEventListener('click', initStems);
}, { once: true });

// Ou au premier grip VR
document.addEventListener('gripdown', function initStemsVR() {
  GameState.startAllStems();
  document.removeEventListener('gripdown', initStemsVR);
}, { once: true });

