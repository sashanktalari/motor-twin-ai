import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  Eye,
  Flame,
  Layers,
  Pause,
  Play,
  ZoomIn,
  ZoomOut,
  Info,
  X,
  Compass,
  Sliders,
  Sparkles,
  AlertOctagon,
  ShieldAlert,
  ChevronRight,
  Split,
  EyeOff
} from 'lucide-react';

export interface ComponentInfo {
  id: string;
  name: string;
  category: string;
  location: string;
  description: string;
  spec: string;
  function: string;
  faultPossibilities: string[];
  health: number;
  condition: string;
}

interface Motor3DViewerProps {
  rpm?: number;
  status?: 'NORMAL' | 'WARNING' | 'FAULT';
  faultType?: string;
  healthScore?: number;
  vibrationRms?: number;
  temperatureC?: number;
  dataState?: 'REAL' | 'SIMULATED' | 'UNAVAILABLE';
  onComponentSelect?: (info: ComponentInfo | null) => void;
}

export const Motor3DViewer: React.FC<Motor3DViewerProps> = ({
  rpm = 1797,
  status = 'NORMAL',
  faultType = 'Normal',
  healthScore = 98.5,
  vibrationRms = 0.082,
  temperatureC = 50.2,
  dataState = 'REAL',
  onComponentSelect,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Model Selection: Model 1 (Assembled), Model 2 (Exploded), Model 3 (Cutaway)
  const [modelType, setModelType] = useState<'assembled' | 'exploded' | 'cutaway'>('assembled');
  const [viewMode, setViewMode] = useState<'solid' | 'thermal' | 'wireframe'>('solid');
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Exploded View Controls (Model 2)
  const [explosionProgress, setExplosionProgress] = useState<number>(0.65); // 0.0 to 1.0
  const [isExplodingAnimated, setIsExplodingAnimated] = useState<boolean>(false);
  const explosionAnimDirRef = useRef<number>(1);

  // Illustrative Fault Visualizations (Simulated visual representations)
  const [activeFaultVisual, setActiveFaultVisual] = useState<'none' | 'bearing' | 'imbalance' | 'misalignment' | 'cooling'>('none');

  // Selected Component Drawer
  const [selectedComp, setSelectedComp] = useState<ComponentInfo | null>(null);
  const [cameraPreset, setCameraPreset] = useState<string>('iso');

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Model Groups
  const motorRootRef = useRef<THREE.Group | null>(null);
  const assembledModelRef = useRef<THREE.Group | null>(null);
  const explodedModelRef = useRef<THREE.Group | null>(null);
  const cutawayModelRef = useRef<THREE.Group | null>(null);

  // Rotating Subgroups for shaft and fans
  const rotatingShaftsRef = useRef<THREE.Group[]>([]);
  const deBearingMeshRef = useRef<THREE.Mesh | null>(null);
  const statusLightRef = useRef<THREE.PointLight | null>(null);

  // Animation references
  const animationFrameRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());

  // Component Catalog for Click-to-Inspect
  const componentCatalog: Record<string, ComponentInfo> = {
    'de_bearing': {
      id: 'de_bearing',
      name: 'Drive End (DE) Bearing Assembly',
      category: 'Mechanical Support & Kinematics',
      location: 'Front motor housing / shaft output journal',
      description: 'Houses the primary SKF 6205-2RS deep groove ball bearing supporting dynamic radial and belt/coupling reaction loads.',
      spec: 'SKF 6205-2RS JEM (9 Balls, 39.04 mm Pitch Diam., 25 mm Bore, 52 mm OD, 0° Contact Angle)',
      function: 'Constrains radial shaft play with minimal rotational friction and transfers dynamic electromechanical torque to external load.',
      faultPossibilities: [
        'Outer Race Fault (BPFO @ 107.4 Hz): Fatigue spalling or brinelling on stationary outer cup',
        'Inner Race Fault (BPFI @ 162.2 Hz): Sub-surface micro-cracking on rotating ring journal',
        'Ball Element Defect (BSF @ 70.6 Hz): Rolling element pitting, skidding, or thermal flaking',
        'Cage Degradation (FTF @ 11.9 Hz): Retainer pocket wear and severe lubricant starvation'
      ],
      health: status === 'FAULT' ? Math.max(15, healthScore) : status === 'WARNING' ? 65 : 99,
      condition: status === 'FAULT' ? `Fault Detected: ${faultType}` : status === 'WARNING' ? 'Acoustic Alert / Lubrication Required' : 'Nominal Baseline',
    },
    'stator_windings': {
      id: 'stator_windings',
      name: 'Three-Phase Stator Windings (Copper Coils)',
      category: 'Electromagnetic Stator Assembly',
      location: 'Internal stator core slots extending into front/rear coil baskets',
      description: 'High-purity enameled copper magnet wire coils wound in 36 stator slots to generate rotating magnetic flux vector (RMF).',
      spec: 'Class F Insulation (155°C Thermal Index), Double-dipped VPI varnish, Star (Y) connected',
      function: 'Generates revolving magnetic field (1800 RPM synchronous speed @ 60 Hz) to induce rotor currents.',
      faultPossibilities: [
        'Turn-to-turn insulation dielectric breakdown from thermal stress or VFD voltage spikes',
        'Phase-to-phase short circuit from winding vibration abrasion',
        'Phase-to-ground flashover across end-turn phase separators',
        'Severe thermal overheating from prolonged mechanical overload or phase loss'
      ],
      health: 98.2,
      condition: `Balanced 3-Phase Magnetization (Class F Insulation)`,
    },
    'rotor_core': {
      id: 'rotor_core',
      name: 'Squirrel-Cage Rotor & Conductor Bars',
      category: 'Electromechanical Rotor Assembly',
      location: 'Mounted directly onto the central motor shaft within stator bore',
      description: 'Laminated silicon electrical steel stack with cast aluminum/copper skewed conductor bars short-circuited by end rings.',
      spec: 'Die-cast Aluminum Conductor Cage, 28 Skewed Rotor Bars, 0.5 mm Air Gap clearance',
      function: 'Induced rotor currents produce magnetic poles that interact with stator flux, producing mechanical rotational torque.',
      faultPossibilities: [
        'Broken or cracked rotor bars from cyclic centrifugal starting thermal stress',
        'Cracked end-ring joint causing dynamic torque pulsation and line current sidebands (f_s ± 2s*f_s)',
        'Dynamic mechanical eccentricity and thermal bowing causing asymmetric magnetic pull (UMP)',
        'Rotor bar cage porosity from casting defects'
      ],
      health: 99.0,
      condition: isRunning ? `Induction Slip: ~0.17% (1797 RPM @ 1.0 HP Load)` : 'Standby',
    },
    'shaft': {
      id: 'shaft',
      name: 'Rotor Output Shaft & Keyway',
      category: 'Torque Transmission',
      location: 'Central longitudinal mechanical axis extending past front shield',
      description: 'Precision ground high-tensile 4140 alloy steel shaft supporting rotor laminations and bearing journals with DIN 6885 keyway.',
      spec: 'AISI 4140 High-Yield Steel, 24 mm Precision Drive Journal, Ground Keyway Slot',
      function: 'Transfers mechanical shaft power from the rotating squirrel-cage core to industrial driven load.',
      faultPossibilities: [
        'Shaft angular or parallel misalignment causing 2X harmonic vibration and bearing overload',
        'Dynamic unbalance causing severe 1X rotational vibration peaks',
        'Fretting corrosion on bearing journal fits from micro-motion',
        'Torsional fatigue cracking under severe shock or cyclic load transitions'
      ],
      health: 99.5,
      condition: isRunning ? `Rotating @ ${rpm} RPM (${(rpm / 60).toFixed(1)} Hz)` : 'Stationary',
    },
    'stator_housing': {
      id: 'stator_housing',
      name: 'Stator Casing Frame',
      category: 'Structural Enclosure',
      location: 'Central cylindrical motor body enclosing stator core',
      description: 'Rugged ribbed cast iron motor enclosure providing rigid structural support, magnetic shielding, and thermal conduction.',
      spec: 'NEMA Frame 182T / Cast Iron Class 30B, Precision-bored Stator Register',
      function: 'Protects internal electromagnetic components, maintains alignment, and provides low-reluctance magnetic path.',
      faultPossibilities: [
        'Frame distortion or soft foot causing stator core out-of-roundness and uneven air gap',
        'Fretting wear on end-shield fit registers',
        'Corrosion of thermal conduction interface causing stator temperature rise'
      ],
      health: 99.0,
      condition: `Temperature: ${temperatureC}°C (Optimal Convection)`,
    },
    'cooling_fins': {
      id: 'cooling_fins',
      name: 'Longitudinal Cooling Fins',
      category: 'Thermal Management',
      location: 'Circumferential exterior surface around main motor body',
      description: 'Integral cast iron fins extending convective surface area by over 350% across the motor stator shell.',
      spec: '24 Aerodynamic Fins, 18 mm Height, 4.5 mm Base Thickness',
      function: 'Conducts heat from stator core and releases it into the forced air draft created by the cooling fan.',
      faultPossibilities: [
        'Heavy particulate or dust cake accumulation impeding thermal dissipation',
        'Broken fin segments reducing total convection area',
        'Hot spots caused by localized stator winding turn shorts'
      ],
      health: 100.0,
      condition: activeFaultVisual === 'cooling' ? 'Degraded Heat Dissipation (Thermal Rise)' : 'Clean Airway Channels',
    },
    'terminal_box': {
      id: 'terminal_box',
      name: 'Conduit Terminal Junction Box',
      category: 'Electrical Interconnect',
      location: 'Top-mounted centered housing with gasketed lid and bolts',
      description: 'Weatherproof junction box containing 6-stud star/delta terminal block, cable gland strain relief, and ground screw.',
      spec: 'Die-cast Aluminum IP55, Neoprene Seal Gasket, M25 Cable Gland Entry',
      function: 'Connects external 3-phase 460V AC industrial power line to internal copper stator phase windings.',
      faultPossibilities: [
        'Loose terminal connections causing localized I²R overheating and phase imbalance',
        'Ingress of moisture or contaminants through damaged gasket',
        'Ground fault / flashover across terminal block studs'
      ],
      health: 99.8,
      condition: 'Balanced 3-Phase Supply (460 V Line-to-Line)',
    },
    'mounting_feet': {
      id: 'mounting_feet',
      name: 'Cast Iron Mounting Base Feet',
      category: 'Structural Foundation',
      location: 'Bottom cast lugs supporting motor onto equipment baseplate',
      description: 'Heavy duty cast mounting feet with machined bottom mounting pads and slotted hold-down bolt holes.',
      spec: 'Four Grade 8.8 M10 Heavy Anchor Bolts with Belleville Lock Washers',
      function: 'Secures motor to foundation, resists rotational counter-torque, and prevents structural vibration amplification.',
      faultPossibilities: [
        'Soft foot condition causing mechanical frame warping and internal bearing misalignment',
        'Loose foundation anchor bolts causing amplified 1X and 2X structural resonance',
        'Baseplate resonance matching rotational operating frequency (29.95 Hz)'
      ],
      health: 98.6,
      condition: `Base Vibration: ${vibrationRms.toFixed(4)} g RMS`,
    },
    'cooling_fan': {
      id: 'cooling_fan',
      name: 'External Bi-Directional Cooling Fan',
      category: 'Forced Air Convection',
      location: 'Mounted on shaft at the non-drive end (NDE) within cowl',
      description: 'Multi-blade centrifugal cooling impeller keyed to the motor shaft providing continuous airflow over cooling fins.',
      spec: 'Reinforced Polypropylene / Aluminum 8-Blade Radial Impeller',
      function: 'Forces high-velocity ambient air longitudinally across stator fins for continuous thermal dissipation.',
      faultPossibilities: [
        'Broken or chipped fan blades causing severe mechanical unbalance at 1X rotational speed',
        'Loose fan hub rubbing against interior of protective cowl shroud',
        'Airflow starvation caused by clogged intake mesh'
      ],
      health: 99.4,
      condition: isRunning ? `Air Velocity ~ 4.2 m/s @ ${rpm} RPM` : 'Idle',
    },
    'fan_cowl': {
      id: 'fan_cowl',
      name: 'Rear Protective Fan Cowl & Louvers',
      category: 'Airflow Shroud',
      location: 'Rear non-drive end exterior casing',
      description: 'Pressed steel protective cowl directing forced air over exterior fins while protecting fan from debris.',
      spec: '1.5 mm Pressed Gauge Steel, Radial Ventilation Louver Slots (IP55)',
      function: 'Directs intake air across stator body and protects personnel from rotating fan blades.',
      faultPossibilities: [
        'Dent or deformation causing mechanical interference with rotating fan blades',
        'Blocked ventilation slots restricting motor airflow',
        'Loose cowl fasteners causing audible rattle and secondary high-frequency vibration'
      ],
      health: 99.5,
      condition: 'Unobstructed Radial Air Intake',
    },
  };

  // Helper: Material Generator with view modes
  const getMaterialForPart = useCallback(
    (partId: string, isCutawayCasing: boolean = false) => {
      // 1. Wireframe Mode
      if (viewMode === 'wireframe') {
        const isFaultPart = partId === 'de_bearing' && status === 'FAULT';
        return new THREE.MeshBasicMaterial({
          color: isFaultPart ? 0xef4444 : isCutawayCasing ? 0x0284c7 : 0x00e5ff,
          wireframe: true,
          transparent: true,
          opacity: isCutawayCasing ? 0.35 : 0.8,
        });
      }

      // 2. Thermal Mode
      if (viewMode === 'thermal') {
        let thermColor = 0x0284c7; // Cool blue baseline
        if (partId === 'stator_housing' || partId === 'cooling_fins') {
          thermColor = activeFaultVisual === 'cooling' ? 0xef4444 : 0xf59e0b; // Hot amber or fault red
        } else if (partId === 'de_bearing') {
          thermColor = status === 'FAULT' || activeFaultVisual === 'bearing' ? 0xef4444 : status === 'WARNING' ? 0xf97316 : 0x10b981;
        } else if (partId === 'stator_windings') {
          thermColor = 0xf97316; // Warm copper winding
        } else if (partId === 'rotor_core') {
          thermColor = 0xeab308; // Warm induction rotor
        } else if (partId === 'terminal_box') {
          thermColor = 0x06b6d4;
        }

        return new THREE.MeshStandardMaterial({
          color: thermColor,
          metalness: 0.35,
          roughness: 0.45,
          emissive: thermColor,
          emissiveIntensity: 0.35,
          transparent: isCutawayCasing,
          opacity: isCutawayCasing ? 0.35 : 1.0,
        });
      }

      // 3. Transparent Cutaway Mode (Special handling for outer housing)
      if (isCutawayCasing) {
        return new THREE.MeshPhysicalMaterial({
          color: 0x0f274a,
          metalness: 0.8,
          roughness: 0.2,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
          transmission: 0.75,
          ior: 1.4,
        });
      }

      // 4. Default Premium Solid PBR Metallic Materials
      switch (partId) {
        case 'shaft':
          return new THREE.MeshStandardMaterial({
            color: activeFaultVisual === 'imbalance' ? 0x38bdf8 : 0xf8fafc,
            metalness: 0.95,
            roughness: 0.12,
          });

        case 'de_bearing': {
          const isFault = status === 'FAULT' || activeFaultVisual === 'bearing';
          const isWarn = status === 'WARNING';
          return new THREE.MeshStandardMaterial({
            color: isFault ? 0xef4444 : isWarn ? 0xf59e0b : 0x0284c7,
            metalness: 0.88,
            roughness: 0.2,
            emissive: isFault ? 0x991b1b : isWarn ? 0x78350f : 0x0369a1,
            emissiveIntensity: isFault ? 0.8 : isWarn ? 0.35 : 0.15,
          });
        }

        case 'stator_windings':
          return new THREE.MeshStandardMaterial({
            color: 0xb87333, // Rich enameled copper
            metalness: 0.92,
            roughness: 0.24,
            emissive: 0x78350f,
            emissiveIntensity: 0.15,
          });

        case 'rotor_core':
          return new THREE.MeshStandardMaterial({
            color: 0x475569, // Laminated electrical steel stack
            metalness: 0.82,
            roughness: 0.38,
          });

        case 'rotor_bars':
          return new THREE.MeshStandardMaterial({
            color: 0xf59e0b, // Cast aluminum / copper rotor bars
            metalness: 0.9,
            roughness: 0.2,
          });

        case 'stator_housing':
          return new THREE.MeshStandardMaterial({
            color: 0x0b172a, // Deep industrial navy
            metalness: 0.85,
            roughness: 0.28,
          });

        case 'cooling_fins':
          return new THREE.MeshStandardMaterial({
            color: activeFaultVisual === 'cooling' ? 0xb91c1c : 0x1e3a8a,
            metalness: 0.8,
            roughness: 0.32,
            emissive: activeFaultVisual === 'cooling' ? 0x7f1d1d : 0x000000,
            emissiveIntensity: activeFaultVisual === 'cooling' ? 0.5 : 0.0,
          });

        case 'fan_cowl':
          return new THREE.MeshStandardMaterial({
            color: 0x070c18, // Charcoal graphite
            metalness: 0.75,
            roughness: 0.45,
          });

        case 'cooling_fan':
          return new THREE.MeshStandardMaterial({
            color: 0x0284c7, // Technical cyan/blue impeller
            metalness: 0.7,
            roughness: 0.35,
          });

        case 'terminal_box':
          return new THREE.MeshStandardMaterial({
            color: 0x1e293b, // Industrial slate
            metalness: 0.75,
            roughness: 0.35,
          });

        case 'mounting_feet':
          return new THREE.MeshStandardMaterial({
            color: 0x090e1a, // Heavy cast iron base
            metalness: 0.9,
            roughness: 0.55,
          });

        case 'bolts':
          return new THREE.MeshStandardMaterial({
            color: 0xe2e8f0, // Polished silver fasteners
            metalness: 0.95,
            roughness: 0.15,
          });

        case 'bearing_balls':
          return new THREE.MeshStandardMaterial({
            color: 0xffffff, // Mirror chrome chrome-steel balls
            metalness: 1.0,
            roughness: 0.05,
          });

        default:
          return new THREE.MeshStandardMaterial({
            color: 0x334155,
            metalness: 0.7,
            roughness: 0.4,
          });
      }
    },
    [viewMode, status, activeFaultVisual]
  );

  // ==========================================
  // BUILD SCENE & ALL 3 DISTINCT MOTOR MODELS
  // ==========================================
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Renderer & Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x050a15); // Clean dark industrial navy

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x00e5ff, 2.2);
    keyLight.position.set(14, 18, 14);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    fillLight.position.set(-14, 10, -10);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 1.6);
    rimLight.position.set(0, -12, -14);
    scene.add(rimLight);

    // Status Accent Point Light near DE bearing
    const statusLight = new THREE.PointLight(
      status === 'FAULT' ? 0xef4444 : status === 'WARNING' ? 0xf59e0b : 0x00e5ff,
      status === 'FAULT' ? 3.5 : 1.8,
      14
    );
    statusLight.position.set(3.2, 1.2, 2.0);
    scene.add(statusLight);
    statusLightRef.current = statusLight;

    // Contact Floor Grid
    const grid = new THREE.GridHelper(24, 32, 0x00e5ff, 0x1e293b);
    grid.position.y = -2.1;
    scene.add(grid);

    // Root Group
    const motorRoot = new THREE.Group();
    motorRoot.name = 'motor_root';
    scene.add(motorRoot);
    motorRootRef.current = motorRoot;

    // Rotating shaft array collector across models
    rotatingShaftsRef.current = [];

    // ====================================================
    // MODEL 1: FULLY ASSEMBLED INDUSTRIAL INDUCTION MOTOR
    // ====================================================
    const assembledGroup = new THREE.Group();
    assembledGroup.name = 'model_assembled';
    motorRoot.add(assembledGroup);
    assembledModelRef.current = assembledGroup;

    // Stator Housing (Model 1)
    const statorGeom1 = new THREE.CylinderGeometry(1.65, 1.65, 4.2, 48);
    statorGeom1.rotateZ(Math.PI / 2);
    const statorMesh1 = new THREE.Mesh(statorGeom1, getMaterialForPart('stator_housing'));
    statorMesh1.name = 'stator_housing';
    statorMesh1.castShadow = true;
    statorMesh1.receiveShadow = true;
    assembledGroup.add(statorMesh1);

    // 24 Cooling Fins (Model 1)
    const finGeom1 = new THREE.BoxGeometry(4.0, 0.1, 0.55);
    const finMat1 = getMaterialForPart('cooling_fins');
    for (let i = 0; i < 24; i++) {
      const angle = (i * Math.PI * 2) / 24;
      if (angle > (5 * Math.PI) / 4 && angle < (7 * Math.PI) / 4) continue;
      const fin = new THREE.Mesh(finGeom1, finMat1);
      fin.name = 'cooling_fins';
      fin.position.y = Math.cos(angle) * 1.78;
      fin.position.z = Math.sin(angle) * 1.78;
      fin.rotation.x = angle;
      fin.castShadow = true;
      assembledGroup.add(fin);
    }

    // DE Shield & Bearing (Model 1)
    const deShieldGeom1 = new THREE.CylinderGeometry(1.6, 1.65, 0.7, 36);
    deShieldGeom1.rotateZ(Math.PI / 2);
    const deBearingMesh1 = new THREE.Mesh(deShieldGeom1, getMaterialForPart('de_bearing'));
    deBearingMesh1.name = 'de_bearing';
    deBearingMesh1.position.x = 2.45;
    deBearingMesh1.castShadow = true;
    assembledGroup.add(deBearingMesh1);
    deBearingMeshRef.current = deBearingMesh1;

    // DE Seal collar & bolts
    const sealCollar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.85, 0.25, 32), getMaterialForPart('bolts'));
    sealCollar1.geometry.rotateZ(Math.PI / 2);
    sealCollar1.name = 'de_bearing';
    sealCollar1.position.x = 2.85;
    assembledGroup.add(sealCollar1);

    // NDE Shield & Fan Cowl (Model 1)
    const ndShieldGeom1 = new THREE.CylinderGeometry(1.65, 1.55, 0.6, 36);
    ndShieldGeom1.rotateZ(Math.PI / 2);
    const ndShield1 = new THREE.Mesh(ndShieldGeom1, getMaterialForPart('stator_housing'));
    ndShield1.name = 'stator_housing';
    ndShield1.position.x = -2.4;
    assembledGroup.add(ndShield1);

    const cowl1 = new THREE.Mesh(new THREE.CylinderGeometry(1.66, 1.55, 1.4, 36), getMaterialForPart('fan_cowl'));
    cowl1.geometry.rotateZ(Math.PI / 2);
    cowl1.name = 'fan_cowl';
    cowl1.position.x = -3.2;
    cowl1.castShadow = true;
    assembledGroup.add(cowl1);

    // Terminal Box (Model 1)
    const tboxBase1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.95, 1.4), getMaterialForPart('terminal_box'));
    tboxBase1.name = 'terminal_box';
    tboxBase1.position.set(0.3, 2.15, 0);
    tboxBase1.castShadow = true;
    assembledGroup.add(tboxBase1);

    const tboxCover1 = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 1.5), getMaterialForPart('stator_housing'));
    tboxCover1.name = 'terminal_box';
    tboxCover1.position.set(0.3, 2.68, 0);
    assembledGroup.add(tboxCover1);

    // Mounting Base (Model 1)
    const basePlateGeom1 = new THREE.BoxGeometry(4.4, 0.45, 4.4);
    const basePlate1 = new THREE.Mesh(basePlateGeom1, getMaterialForPart('mounting_feet'));
    basePlate1.name = 'mounting_feet';
    basePlate1.position.set(0, -1.88, 0);
    basePlate1.castShadow = true;
    basePlate1.receiveShadow = true;
    assembledGroup.add(basePlate1);

    // Rotating Shaft & Fan (Model 1)
    const shaftGroup1 = new THREE.Group();
    shaftGroup1.name = 'shaft_group_1';
    assembledGroup.add(shaftGroup1);
    rotatingShaftsRef.current.push(shaftGroup1);

    const shaftMesh1 = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 7.8, 36), getMaterialForPart('shaft'));
    shaftMesh1.geometry.rotateZ(Math.PI / 2);
    shaftMesh1.name = 'shaft';
    shaftMesh1.position.x = 0.6;
    shaftMesh1.castShadow = true;
    shaftGroup1.add(shaftMesh1);

    // Coupling flange
    const coupling1 = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.55, 24), getMaterialForPart('stator_housing'));
    coupling1.geometry.rotateZ(Math.PI / 2);
    coupling1.name = 'shaft';
    coupling1.position.x = 4.3;
    shaftGroup1.add(coupling1);

    // Cooling fan blades inside cowl
    const fanGroup1 = new THREE.Group();
    fanGroup1.position.set(-3.0, 0, 0);
    shaftGroup1.add(fanGroup1);
    for (let f = 0; f < 8; f++) {
      const fAngle = (f * Math.PI * 2) / 8;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.08), getMaterialForPart('cooling_fan'));
      blade.position.set(0, Math.cos(fAngle) * 0.95, Math.sin(fAngle) * 0.95);
      blade.rotation.x = fAngle + 0.35;
      fanGroup1.add(blade);
    }

    // ====================================================
    // MODEL 2: EXPLODED VIEW WITH SEPARATED MOTOR SUBASSEMBLIES
    // ====================================================
    const explodedGroup = new THREE.Group();
    explodedGroup.name = 'model_exploded';
    motorRoot.add(explodedGroup);
    explodedModelRef.current = explodedGroup;

    // Sub-assemblies for exploded view with baseline positions and explosion direction
    const explodedParts: {
      group: THREE.Group;
      basePos: THREE.Vector3;
      explodeDir: THREE.Vector3;
      scaleFactor: number;
    }[] = [];

    const createExplodedSub = (name: string, basePos: THREE.Vector3, explodeDir: THREE.Vector3, scaleFactor: number = 1.0) => {
      const g = new THREE.Group();
      g.name = name;
      explodedGroup.add(g);
      explodedParts.push({ group: g, basePos, explodeDir, scaleFactor });
      return g;
    };

    // Sub 1: Output Coupling (+X, furthest forward)
    const subCoupling = createExplodedSub('coupling_sub', new THREE.Vector3(4.3, 0, 0), new THREE.Vector3(1, 0, 0), 4.2);
    const expCoupling = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.55, 24), getMaterialForPart('stator_housing'));
    expCoupling.geometry.rotateZ(Math.PI / 2);
    expCoupling.name = 'shaft';
    subCoupling.add(expCoupling);

    // Sub 2: DE Bearing Seal & Fasteners (+X)
    const subDeSeal = createExplodedSub('de_seal_sub', new THREE.Vector3(2.85, 0, 0), new THREE.Vector3(1, 0, 0), 3.2);
    const expSeal = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.85, 0.25, 32), getMaterialForPart('bolts'));
    expSeal.geometry.rotateZ(Math.PI / 2);
    expSeal.name = 'de_bearing';
    subDeSeal.add(expSeal);

    // Sub 3: DE Bearing Housing & End Shield (+X)
    const subDeShield = createExplodedSub('de_shield_sub', new THREE.Vector3(2.45, 0, 0), new THREE.Vector3(1, 0, 0), 2.2);
    const expDeShield = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.65, 0.7, 36), getMaterialForPart('de_bearing'));
    expDeShield.geometry.rotateZ(Math.PI / 2);
    expDeShield.name = 'de_bearing';
    subDeShield.add(expDeShield);

    // Sub 4: Stator Frame & Cooling Fins (Center 0,0,0)
    const subStator = createExplodedSub('stator_frame_sub', new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), 0);
    const expStator = new THREE.Mesh(statorGeom1, getMaterialForPart('stator_housing'));
    expStator.name = 'stator_housing';
    subStator.add(expStator);
    for (let i = 0; i < 24; i++) {
      const angle = (i * Math.PI * 2) / 24;
      if (angle > (5 * Math.PI) / 4 && angle < (7 * Math.PI) / 4) continue;
      const fin = new THREE.Mesh(finGeom1, finMat1);
      fin.name = 'cooling_fins';
      fin.position.y = Math.cos(angle) * 1.78;
      fin.position.z = Math.sin(angle) * 1.78;
      fin.rotation.x = angle;
      subStator.add(fin);
    }

    // Sub 5: Terminal Box (+Y upward)
    const subTBox = createExplodedSub('tbox_sub', new THREE.Vector3(0.3, 2.15, 0), new THREE.Vector3(0, 1, 0), 2.8);
    const expTBox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.95, 1.4), getMaterialForPart('terminal_box'));
    expTBox.name = 'terminal_box';
    subTBox.add(expTBox);
    const expTBoxLid = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 1.5), getMaterialForPart('stator_housing'));
    expTBoxLid.name = 'terminal_box';
    expTBoxLid.position.y = 0.58;
    subTBox.add(expTBoxLid);

    // Sub 6: Mounting Base Plate (-Y downward)
    const subBase = createExplodedSub('base_sub', new THREE.Vector3(0, -1.88, 0), new THREE.Vector3(0, -1, 0), 2.0);
    const expBase = new THREE.Mesh(basePlateGeom1, getMaterialForPart('mounting_feet'));
    expBase.name = 'mounting_feet';
    subBase.add(expBase);

    // Sub 7: Rotor & Shaft Assembly (Centered or slight Z offset)
    const subRotorShaft = createExplodedSub('rotor_shaft_sub', new THREE.Vector3(0.6, 0, 0), new THREE.Vector3(0, 0.5, 1.2), 1.5);
    const expShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 7.8, 36), getMaterialForPart('shaft'));
    expShaft.geometry.rotateZ(Math.PI / 2);
    expShaft.name = 'shaft';
    subRotorShaft.add(expShaft);

    // Sub 8: NDE Shield (-X)
    const subNdeShield = createExplodedSub('nde_shield_sub', new THREE.Vector3(-2.4, 0, 0), new THREE.Vector3(-1, 0, 0), 1.8);
    const expNde = new THREE.Mesh(ndShieldGeom1, getMaterialForPart('stator_housing'));
    expNde.name = 'stator_housing';
    subNdeShield.add(expNde);

    // Sub 9: External Cooling Fan (-X)
    const subFan = createExplodedSub('fan_sub', new THREE.Vector3(-3.0, 0, 0), new THREE.Vector3(-1, 0, 0), 3.0);
    const expFanHub = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.4, 16), getMaterialForPart('bolts'));
    expFanHub.geometry.rotateZ(Math.PI / 2);
    expFanHub.name = 'cooling_fan';
    subFan.add(expFanHub);
    for (let f = 0; f < 8; f++) {
      const fAngle = (f * Math.PI * 2) / 8;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.08), getMaterialForPart('cooling_fan'));
      blade.name = 'cooling_fan';
      blade.position.set(0, Math.cos(fAngle) * 0.95, Math.sin(fAngle) * 0.95);
      blade.rotation.x = fAngle + 0.35;
      subFan.add(blade);
    }

    // Sub 10: Fan Cowl Shroud (-X furthest rear)
    const subCowl = createExplodedSub('cowl_sub', new THREE.Vector3(-3.2, 0, 0), new THREE.Vector3(-1, 0, 0), 4.2);
    const expCowl = new THREE.Mesh(new THREE.CylinderGeometry(1.66, 1.55, 1.4, 36), getMaterialForPart('fan_cowl'));
    expCowl.geometry.rotateZ(Math.PI / 2);
    expCowl.name = 'fan_cowl';
    subCowl.add(expCowl);

    // ====================================================
    // MODEL 3: TRANSPARENT CUTAWAY MOTOR (INTERNAL ANATOMY)
    // ====================================================
    const cutawayGroup = new THREE.Group();
    cutawayGroup.name = 'model_cutaway';
    motorRoot.add(cutawayGroup);
    cutawayModelRef.current = cutawayGroup;

    // (A) Transparent / Sectioned Outer Stator Casing (Shows outer profile while revealing interior)
    const cutawayCasingGeom = new THREE.CylinderGeometry(1.65, 1.65, 4.2, 48, 1, false, 0, Math.PI * 1.5);
    cutawayCasingGeom.rotateZ(Math.PI / 2);
    const cutawayCasing = new THREE.Mesh(cutawayCasingGeom, getMaterialForPart('stator_housing', true));
    cutawayCasing.name = 'stator_housing';
    cutawayGroup.add(cutawayCasing);

    // (B) Internal Laminated Stator Core (Silicon steel core with visible magnetic teeth)
    const statorCoreGeom = new THREE.CylinderGeometry(1.48, 1.48, 3.6, 36);
    statorCoreGeom.rotateZ(Math.PI / 2);
    const statorCoreMesh = new THREE.Mesh(statorCoreGeom, new THREE.MeshStandardMaterial({
      color: 0x334155, // Silicon steel laminations
      metalness: 0.85,
      roughness: 0.45,
    }));
    statorCoreMesh.name = 'stator_windings';
    cutawayGroup.add(statorCoreMesh);

    // (C) Copper Stator End Windings (Coil baskets extending from stator core)
    const windingMat = getMaterialForPart('stator_windings');
    const deWinding = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.28, 16, 36), windingMat);
    deWinding.rotation.y = Math.PI / 2;
    deWinding.position.x = 2.05;
    deWinding.name = 'stator_windings';
    cutawayGroup.add(deWinding);

    const ndeWinding = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.28, 16, 36), windingMat);
    ndeWinding.rotation.y = Math.PI / 2;
    ndeWinding.position.x = -2.05;
    ndeWinding.name = 'stator_windings';
    cutawayGroup.add(ndeWinding);

    // Rotating Internal Rotor & Shaft Group (Model 3)
    const cutawayShaftGroup = new THREE.Group();
    cutawayShaftGroup.name = 'cutaway_shaft_group';
    cutawayGroup.add(cutawayShaftGroup);
    rotatingShaftsRef.current.push(cutawayShaftGroup);

    // Central Shaft in Model 3
    const cutawayShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 7.8, 36), getMaterialForPart('shaft'));
    cutawayShaft.geometry.rotateZ(Math.PI / 2);
    cutawayShaft.name = 'shaft';
    cutawayShaft.position.x = 0.6;
    cutawayShaftGroup.add(cutawayShaft);

    // (D) Squirrel-Cage Rotor Core Stack (Inside stator bore with precision air gap)
    const rotorCoreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, 3.2, 32), getMaterialForPart('rotor_core'));
    rotorCoreMesh.geometry.rotateZ(Math.PI / 2);
    rotorCoreMesh.name = 'rotor_core';
    rotorCoreMesh.position.x = 0.0;
    cutawayShaftGroup.add(rotorCoreMesh);

    // Copper End Rings & Skewed Conductor Bars on Rotor
    const ringGeom = new THREE.TorusGeometry(0.92, 0.12, 16, 32);
    const barMat = getMaterialForPart('rotor_bars');
    const deEndRing = new THREE.Mesh(ringGeom, barMat);
    deEndRing.rotation.y = Math.PI / 2;
    deEndRing.position.x = 1.6;
    deEndRing.name = 'rotor_core';
    cutawayShaftGroup.add(deEndRing);

    const ndeEndRing = new THREE.Mesh(ringGeom, barMat);
    ndeEndRing.rotation.y = Math.PI / 2;
    ndeEndRing.position.x = -1.6;
    ndeEndRing.name = 'rotor_core';
    cutawayShaftGroup.add(ndeEndRing);

    // (E) Visible Deep Groove Ball Bearings with individual balls and cage
    const ballMat = getMaterialForPart('bearing_balls');
    const makeBearingAssembly = (posX: number, name: string) => {
      const bGroup = new THREE.Group();
      bGroup.name = name;
      bGroup.position.x = posX;
      cutawayGroup.add(bGroup);

      // Outer Race
      const outerRace = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.08, 16, 32), getMaterialForPart('de_bearing'));
      outerRace.rotation.y = Math.PI / 2;
      outerRace.name = name;
      bGroup.add(outerRace);

      // Inner Race
      const innerRace = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.06, 16, 32), getMaterialForPart('shaft'));
      innerRace.rotation.y = Math.PI / 2;
      innerRace.name = name;
      bGroup.add(innerRace);

      // 9 Individual Steel Balls
      for (let b = 0; b < 9; b++) {
        const bAngle = (b * Math.PI * 2) / 9;
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), ballMat);
        ball.name = name;
        ball.position.set(0, Math.cos(bAngle) * 0.63, Math.sin(bAngle) * 0.63);
        bGroup.add(ball);
      }
      return bGroup;
    };

    makeBearingAssembly(2.45, 'de_bearing');
    makeBearingAssembly(-2.4, 'de_bearing');

    // Terminal box and mounting feet on cutaway for complete framing
    const cutawayTBox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.95, 1.4), getMaterialForPart('terminal_box'));
    cutawayTBox.name = 'terminal_box';
    cutawayTBox.position.set(0.3, 2.15, 0);
    cutawayGroup.add(cutawayTBox);

    const cutawayBase = new THREE.Mesh(basePlateGeom1, getMaterialForPart('mounting_feet'));
    cutawayBase.name = 'mounting_feet';
    cutawayBase.position.set(0, -1.88, 0);
    cutawayGroup.add(cutawayBase);

    // ==========================================
    // 4. Automatic Camera Framing using Box3
    // ==========================================
    const bbox = new THREE.Box3().setFromObject(assembledGroup);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    bbox.getCenter(center);
    bbox.getSize(size);

    motorRoot.position.x = -center.x;
    motorRoot.position.y = -center.y + 0.2;
    motorRoot.position.z = -center.z;

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.45;

    camera.position.set(cameraZ * 0.85, cameraZ * 0.65, cameraZ * 0.95);
    camera.lookAt(0, 0, 0);

    // 5. Professional OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = maxDim * 0.6;
    controls.maxDistance = maxDim * 4.5;
    controls.maxPolarAngle = Math.PI / 2 + 0.15;
    controls.target.set(0, 0, 0);
    controls.update();

    // 6. Interactive Raycasting Click-to-Inspect
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const activeObj =
        modelType === 'assembled'
          ? assembledGroup
          : modelType === 'exploded'
          ? explodedGroup
          : cutawayGroup;

      const intersects = raycaster.intersectObjects(activeObj.children, true);

      if (intersects.length > 0) {
        let hitObj: THREE.Object3D | null = intersects[0].object;
        let compKey: string | null = null;

        while (hitObj && hitObj !== activeObj) {
          if (hitObj.name && componentCatalog[hitObj.name]) {
            compKey = hitObj.name;
            break;
          }
          hitObj = hitObj.parent;
        }

        if (compKey && componentCatalog[compKey]) {
          const info = componentCatalog[compKey];
          setSelectedComp(info);
          if (onComponentSelect) onComponentSelect(info);
        }
      }
    };

    renderer.domElement.addEventListener('click', handleClick);

    // 7. Render Loop with RPM Rotation & Exploded Updates
    clockRef.current.start();
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      const elapsed = clockRef.current.getElapsedTime();

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // Update Visibility based on active modelType
      assembledGroup.visible = modelType === 'assembled';
      explodedGroup.visible = modelType === 'exploded';
      cutawayGroup.visible = modelType === 'cutaway';

      // Update Exploded Positions (Model 2)
      if (modelType === 'exploded') {
        explodedParts.forEach(({ group, basePos, explodeDir, scaleFactor }) => {
          group.position.set(
            basePos.x + explodeDir.x * scaleFactor * explosionProgress,
            basePos.y + explodeDir.y * scaleFactor * explosionProgress,
            basePos.z + explodeDir.z * scaleFactor * explosionProgress
          );
        });
      }

      // Shaft & Cooling Fan Rotation
      if (isRunning) {
        const radPerSec = (rpm / 60.0) * Math.PI * 2 * 0.12;
        rotatingShaftsRef.current.forEach((g) => {
          g.rotation.x += radPerSec * delta;

          // Illustrative Rotor Imbalance Simulation (slight dynamic radial wobble)
          if (activeFaultVisual === 'imbalance') {
            const wobble = 0.08 * Math.sin(elapsed * 12.0);
            g.position.y = wobble;
            g.position.z = wobble * 0.5;
          } else {
            g.position.set(0, 0, 0);
          }
        });
      }

      // Status Pulsing Alarm on DE bearing
      const isBearingAlert = status === 'FAULT' || activeFaultVisual === 'bearing';
      if (isBearingAlert && deBearingMeshRef.current && statusLightRef.current) {
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 7.5);
        (deBearingMeshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4 + 0.8 * pulse;
        statusLightRef.current.intensity = 2.0 + 3.0 * pulse;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight || 600;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup with deep GPU buffer disposal
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      controls.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [modelType, getMaterialForPart, isRunning, rpm, explosionProgress, activeFaultVisual]);

  // Exploded View Auto-Animation Loop
  useEffect(() => {
    if (!isExplodingAnimated || modelType !== 'exploded') return;

    let animId: number;
    const stepAnim = () => {
      setExplosionProgress((prev) => {
        let next = prev + 0.01 * explosionAnimDirRef.current;
        if (next >= 1.0) {
          next = 1.0;
          explosionAnimDirRef.current = -1;
        } else if (next <= 0.05) {
          next = 0.05;
          explosionAnimDirRef.current = 1;
        }
        return next;
      });
      animId = requestAnimationFrame(stepAnim);
    };

    animId = requestAnimationFrame(stepAnim);
    return () => cancelAnimationFrame(animId);
  }, [isExplodingAnimated, modelType]);

  // Preset Camera Positions
  const applyCameraPreset = (preset: 'iso' | 'front' | 'side' | 'top') => {
    setCameraPreset(preset);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    controls.reset();
    switch (preset) {
      case 'front':
        camera.position.set(11, 0.5, 0);
        break;
      case 'side':
        camera.position.set(0, 1.5, 12);
        break;
      case 'top':
        camera.position.set(0.2, 14, 0.2);
        break;
      case 'iso':
      default:
        camera.position.set(8.5, 6.5, 9.5);
        break;
    }
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${
        isFullscreen ? 'h-screen fixed inset-0 z-50 rounded-none' : 'h-[620px] lg:h-[680px] rounded-2xl'
      } overflow-hidden border border-cyan-500/25 bg-navy-950/95 backdrop-blur-xl shadow-2xl flex flex-col font-sans select-none`}
    >
      {/* Top Main Navigation Bar: 3D Model Selection Tabs */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Model 1, 2, 3 Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-navy-900/90 backdrop-blur-md border border-navy-700/80 shadow-lg pointer-events-auto text-xs font-mono">
          <button
            onClick={() => setModelType('assembled')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              modelType === 'assembled'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-glow-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Model 1: Assembled Motor
          </button>
          <button
            onClick={() => setModelType('exploded')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              modelType === 'exploded'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-glow-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Model 2: Exploded View
          </button>
          <button
            onClick={() => setModelType('cutaway')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              modelType === 'cutaway'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-glow-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Model 3: Transparent Cutaway
          </button>
        </div>

        {/* View Mode & Utility Icons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Shading View Mode */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-navy-900/90 backdrop-blur-md border border-navy-700/80 text-xs font-mono">
            <button
              onClick={() => setViewMode('solid')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                viewMode === 'solid' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/30' : 'text-slate-400 hover:text-white'
              }`}
              title="Solid Metallic Material"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('thermal')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                viewMode === 'thermal' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-400/30' : 'text-slate-400 hover:text-white'
              }`}
              title="Thermal Stress Heatmap"
            >
              <Flame className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('wireframe')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                viewMode === 'wireframe' ? 'bg-violet-500/20 text-violet-300 font-bold border border-violet-400/30' : 'text-slate-400 hover:text-white'
              }`}
              title="Wireframe Mesh"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-navy-900/90 backdrop-blur-md border border-navy-700/80 text-slate-300 hover:text-white transition-all"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Area */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Exploded View Controls (Active only in Model 2) */}
      {modelType === 'exploded' && (
        <div className="absolute top-20 left-4 z-20 p-3.5 rounded-xl bg-navy-900/90 backdrop-blur-md border border-cyan-500/40 shadow-xl max-w-xs space-y-2.5 text-xs font-mono pointer-events-auto">
          <div className="flex items-center justify-between">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Split className="w-4 h-4" />
              EXPLOSION DISPERSION
            </span>
            <span className="text-white font-bold">{Math.round(explosionProgress * 100)}%</span>
          </div>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={explosionProgress}
            onChange={(e) => {
              setExplosionProgress(parseFloat(e.target.value));
              setIsExplodingAnimated(false);
            }}
            className="w-full accent-cyan-400 cursor-pointer"
          />

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setIsExplodingAnimated(!isExplodingAnimated)}
              className={`px-3 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                isExplodingAnimated
                  ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                  : 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/30'
              }`}
            >
              {isExplodingAnimated ? 'Stop Animation' : 'Auto Animate'}
            </button>
            <button
              onClick={() => {
                setExplosionProgress(0);
                setIsExplodingAnimated(false);
              }}
              className="text-[10px] text-slate-400 hover:text-white"
            >
              Reset to 0%
            </button>
          </div>
        </div>
      )}

      {/* Floating Cutaway Legend (Active only in Model 3) */}
      {modelType === 'cutaway' && (
        <div className="absolute top-20 left-4 z-20 p-3.5 rounded-xl bg-navy-900/90 backdrop-blur-md border border-cyan-500/40 shadow-xl max-w-xs space-y-1.5 text-xs font-mono pointer-events-auto">
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
            INTERNAL ELECTROMAGNETIC ANATOMY
          </span>
          <div className="space-y-1 text-[11px] text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
              <span>Copper End-Turn Stator Windings</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span>Laminated Silicon Steel Stator Core</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Squirrel-Cage Rotor Conductor Bars</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span>0.5 mm Radial Air Gap Clearance</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Deep Groove Steel Ball Bearings (9 Balls)</span>
            </div>
          </div>
        </div>
      )}

      {/* Illustrative Fault Simulation Modes Bar */}
      <div className="absolute bottom-16 left-4 z-20 flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-navy-900/90 backdrop-blur-md border border-navy-700/80 text-xs font-mono pointer-events-auto">
        <span className="text-[10px] text-slate-400 uppercase font-bold px-1.5">Illustrative Fault View:</span>
        {[
          { id: 'none', label: 'Nominal' },
          { id: 'bearing', label: 'Bearing Fault' },
          { id: 'imbalance', label: 'Rotor Imbalance' },
          { id: 'cooling', label: 'Cooling Clog' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFaultVisual(f.id as any)}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
              activeFaultVisual === f.id
                ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Play/Pause & Camera Presets */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all backdrop-blur-md shadow-glass ${
              isRunning
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/30'
                : 'bg-rose-500/20 border-rose-400/40 text-rose-300 hover:bg-rose-500/30'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? `${rpm} RPM` : 'STOPPED'}</span>
          </button>

          {/* Camera Angles */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-navy-900/90 backdrop-blur-md border border-navy-700/80 text-[11px] font-mono">
            {(['iso', 'front', 'side', 'top'] as const).map((p) => (
              <button
                key={p}
                onClick={() => applyCameraPreset(p)}
                className={`px-2 py-1 rounded capitalize transition-all ${
                  cameraPreset === p ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {p === 'iso' ? 'Isometric' : p}
              </button>
            ))}
            <button
              onClick={() => applyCameraPreset('iso')}
              title="Reset View Target"
              className="p-1 text-slate-400 hover:text-cyan-300 ml-0.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Data State Badge */}
        <div className="pointer-events-auto flex items-center gap-2 text-[10px] font-mono">
          {activeFaultVisual !== 'none' ? (
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
              VISUAL SIMULATION — Illustrative engineering representation
            </span>
          ) : dataState === 'REAL' ? (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE TELEMETRY (CWRU TESTBED)
            </span>
          ) : dataState === 'SIMULATED' ? (
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold">
              SYNTHETIC SIMULATED STATE
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 font-bold">
              STANDBY / UNASSESSED
            </span>
          )}
        </div>
      </div>

      {/* Selected Component Detailed Inspection Drawer */}
      {selectedComp && (
        <div className="absolute top-20 right-4 bottom-20 z-30 max-w-sm w-full p-4 rounded-xl bg-navy-900/95 backdrop-blur-xl border border-cyan-400/50 shadow-2xl text-xs font-mono space-y-3 pointer-events-auto overflow-y-auto animate-in fade-in duration-200">
          <div className="flex justify-between items-start border-b border-navy-800 pb-2">
            <div>
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                {selectedComp.category}
              </span>
              <h4 className="text-sm font-bold text-white mt-0.5">{selectedComp.name}</h4>
              <span className="text-[10px] text-slate-400 block mt-0.5">{selectedComp.location}</span>
            </div>
            <button
              onClick={() => {
                setSelectedComp(null);
                if (onComponentSelect) onComponentSelect(null);
              }}
              className="p-1 rounded text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Primary Electromechanical Function</span>
            <p className="text-[11px] text-slate-300 leading-relaxed bg-navy-950/60 p-2 rounded border border-navy-800">
              {selectedComp.function}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Engineering Specification</span>
            <p className="text-[11px] text-slate-300 bg-navy-950/60 p-2 rounded border border-navy-800">
              {selectedComp.spec}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-amber-400 font-bold uppercase flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              Potential Fault Modes & Failure Mechanisms
            </span>
            <ul className="space-y-1 text-[11px] text-slate-300 bg-navy-950/60 p-2 rounded border border-navy-800 list-disc list-inside">
              {selectedComp.faultPossibilities.map((f, i) => (
                <li key={i} className="text-slate-300 leading-tight">
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-2 border-t border-navy-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Component Health Index:</span>
            <span className="text-emerald-400 font-bold text-sm">{selectedComp.health}%</span>
          </div>
        </div>
      )}
    </div>
  );
};
