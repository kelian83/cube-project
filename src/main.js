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
  
  addConnection(cableId) {
    if (!this.cables[cableId]) {
      this.cables[cableId] = true;
      this.connectedCables++;
      console.log(`Cable ${cableId} connecté. Total: ${this.connectedCables}/4`);
      
      if (this.connectedCables === 4 && !this.partyMode) {
        this.partyMode = true;
        document.querySelector('a-scene').emit('start-disco-mode');
      }
    }
  }
};

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
// Gère les transitions d'état (Party Mode)
// ============================================
AFRAME.registerComponent('state-manager', {
  init: function () {
    this.el.addEventListener('start-disco-mode', this.startDiscoMode.bind(this));
  },

  startDiscoMode: function () {
    console.log('🎉 PARTY MODE ACTIVÉ! 🎉');
    
    const scene = this.el;
    
    // Jouer le son de succès
    const successSound = document.querySelector('#success-sound');
    if (successSound) {
      successSound.play().catch(() => {});
    }
    
    // 1. Éteindre les lumières blanches du plafond (fade out)
    const ceilingLights = document.querySelectorAll('.ceiling-light');
    ceilingLights.forEach((light, index) => {
      light.setAttribute('animation', {
        property: 'material.emissiveIntensity',
        to: 0,
        dur: 2000,
        delay: index * 100,
        easing: 'easeOutQuad'
      });
      
      light.setAttribute('animation__color', {
        property: 'material.emissive',
        to: '#000000',
        dur: 2000,
        delay: index * 100
      });
    });
    
    // 2. Activer les lumières disco après le fade out
    setTimeout(() => {
      const discoLights = document.querySelector('#disco-lights');
      discoLights.setAttribute('visible', true);
      
      // Fade in des lumières disco
      const lights = discoLights.querySelectorAll('a-light');
      lights.forEach((light, index) => {
        light.setAttribute('animation__intensity', {
          property: 'intensity',
          from: 0,
          to: 2,
          dur: 1000,
          delay: index * 200,
          easing: 'easeInQuad'
        });
      });
      
      // 3. Activer le brouillard
      scene.setAttribute('fog', {
        type: 'exponential',
        color: '#1a0a2e',
        density: 0.15
      });
      
      // 4. Animation des enceintes (simulation basses)
      this.startSpeakerAnimation();
      
      // 5. Changer la couleur ambiante
      const ambientLight = scene.querySelector('a-light[type="ambient"]');
      if (ambientLight) {
        ambientLight.setAttribute('animation', {
          property: 'color',
          to: '#2a0a4a',
          dur: 2000
        });
      }
      
    }, 2500);
  },

  startSpeakerAnimation: function () {
    const speakers = document.querySelectorAll('.speaker');
    
    speakers.forEach((speaker, index) => {
      // Animation de scale pulsante (simulation basses)
      speaker.setAttribute('animation__scale', {
        property: 'scale',
        from: '1 1 1',
        to: '1.05 1.1 1.05',
        dur: 300,
        dir: 'alternate',
        loop: true,
        easing: 'easeInOutSine'
      });
      
      // Légère lumière sur les enceintes
      speaker.setAttribute('animation__emissive', {
        property: 'material.emissive',
        from: '#000000',
        to: '#4a0080',
        dur: 600,
        dir: 'alternate',
        loop: true,
        delay: index * 150
      });
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
});

