import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { ChevronRightIcon, MinusIcon } from '@chakra-ui/icons';
import { getModelConfig } from './api';

import {
  Box,
  Button,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  IconButton,
  HStack,
  Text,
  VStack
} from '@chakra-ui/react';

// ======= 全局参数：统一一个“真·网格定义” =======
const CELLS = 10;          
const CELL_SIZE = 1;       
const HALF = (CELLS * CELL_SIZE) / 2;
const GROUP_OFFSET: [number, number, number] = [
  -HALF + CELL_SIZE / 2,   
  0,
  -HALF + CELL_SIZE / 2,
];

// 季节配置
const SEASONS = [
  { name: '春', value: 0, color: 'green.400' },
  { name: '夏', value: 1, color: 'yellow.400' },
  { name: '秋', value: 2, color: 'orange.400' },
  { name: '冬', value: 3, color: 'blue.400' }
];

interface BoxProps {
  position: [number, number, number];
  onClick: () => void;
  color: string;
}
function BoxGeometry({ position, onClick, color }: BoxProps) {
  const mesh = useRef<THREE.Mesh>(null!);
  return (
    <mesh position={position} ref={mesh} onClick={onClick} castShadow receiveShadow>
      <boxGeometry args={[CELL_SIZE * 0.98, 0.05, CELL_SIZE * 0.98]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

type ColorState = boolean[][];
function ClickablePlane({ onClick }: { onClick: (x: number, y: number) => void }) {
  const [colors, setColors] = useState<ColorState>(
    Array(CELLS).fill(null).map(() => Array(CELLS).fill(true))
  );

  const handleClick = (x: number, y: number) => {
    const copy = colors.map(r => [...r]);
    copy[x][y] = !copy[x][y];
    setColors(copy);
    onClick(x, y);
  };

  return (
    <group>
      {colors.map((row, x) =>
        row.map((isGreen, y) => (
          <BoxGeometry
            key={`${x}-${y}`}
            position={[x * CELL_SIZE, 0, y * CELL_SIZE]}
            onClick={() => handleClick(x, y)}
            color={isGreen ? 'limegreen' : 'white'}
          />
        ))
      )}
    </group>
  );
}

function Object3DModel({ Reasource, name, position, upAxis, target }: {Reasource: string, name: string, position: [number, number, number], upAxis: string, target: number }) {
  const [obj, setObj] = useState<THREE.Object3D | null>(null);
  const ref = useRef<THREE.Object3D>(null!);

  useEffect(() => {
    const mtlLoader = new MTLLoader();
    mtlLoader.setResourcePath(Reasource);
    mtlLoader.setPath(Reasource);
    mtlLoader.load(`${name}.mtl`, (materials) => {
      materials.preload();
      const objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.setPath(Reasource);
      objLoader.load(`${name}.obj`, (loaded) => {
        loaded.traverse((child: any) => {
          if (child.isMesh) {
            child.material.side = THREE.DoubleSide;
            child.material.needsUpdate = true;
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        if (upAxis === 'z') {
          loaded.rotation.x = Math.PI / 2;
        } else if (upAxis === 'x') {
          loaded.rotation.x = Math.PI / 2;
        } else if (upAxis === 'y') {
          loaded.rotation.y = Math.PI / 2;
        } else if (upAxis === '-z') {
          loaded.rotation.x = -Math.PI / 2;
        } else if (upAxis === '-x') {
          loaded.rotation.x = -Math.PI / 2;
        } else if (upAxis === '-y') {
          loaded.rotation.y = -Math.PI / 2;
        }
        setObj(loaded);
      });
    });
  }, []);

  useFrame(() => {
    if (ref.current) {
      ref.current.scale.x = Math.min(ref.current.scale.x + 0.01, target);
      ref.current.scale.y = Math.min(ref.current.scale.y + 0.01, target);
      ref.current.scale.z = Math.min(ref.current.scale.z + 0.01, target);
    }
  });

  if (!obj) return null;

  return (
    <primitive
      ref={ref}
      object={obj}
      position={position}
      scale={[0, 0, 0]}        
    />
  );
}

// ======= 顶栏组件 =======
function TopBar() {
  const navigate = useNavigate();
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '50px',
      background: '#222',
      color: 'white',
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      padding: '0 20px',
      zIndex: 1000
    }}>
      <button 
        onClick={() => navigate('/login')}
        style={{ background: 'transparent', color: 'white', border: '1px solid white', padding: '5px 10px', cursor: 'pointer'}}
      >
        登录
      </button>
    </div>
  );
}

function Timeline({ season, setSeason, isPlaying, togglePlay }: {season: number, setSeason: (season: number) => void, isPlaying: boolean, togglePlay: () => void}) {
  return (
    <Box
      position="fixed"
      bottom="20px"
      left="20px"
      bg="rgba(0, 0, 0, 0.7)"
      p={4}
      borderRadius="md"
      width="300px"
      zIndex={1000}
    >
      <VStack spacing={3} align="stretch">
        <HStack justify="space-between">
          <Text color="white" fontWeight="bold">季节控制</Text>
          <IconButton
            aria-label={isPlaying ? "暂停" : "播放"}
            icon={isPlaying ? <MinusIcon />:<ChevronRightIcon /> }
            onClick={togglePlay}
            size="sm"
            colorScheme="blue"
          />
        </HStack>
        
        <Slider
          aria-label="季节滑动条"
          value={season}
          min={0}
          max={3}
          step={1}
          onChange={(value) => setSeason(value)}
        >
          <SliderTrack>
            <SliderFilledTrack />
          </SliderTrack>
          <SliderThumb />
        </Slider>
        
        <HStack justify="space-between">
          {SEASONS.map((s) => (
            <Text 
              key={s.value} 
              color={season === s.value ? s.color : "white"}
              fontWeight={season === s.value ? "bold" : "normal"}
              fontSize="sm"
            >
              {s.name}
            </Text>
          ))}
        </HStack>
      </VStack>
    </Box>
  );
}

function WaterTile({ position }: { position: [number, number, number] }) {
  const waterRef = useRef<THREE.Mesh>(null);
  
  const water = useMemo(() => {
    const waterGeometry = new THREE.PlaneGeometry(CELL_SIZE * 0.98, CELL_SIZE * 0.98, 128, 128);
    
    const waterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        lightDirection: { value: new THREE.Vector3(0.5, 1, 0.5).normalize() },
        waterColor: { value: new THREE.Color(0.2, 0.5, 0.8) },
        deepWaterColor: { value: new THREE.Color(0.1, 0.3, 0.6) },
        foamColor: { value: new THREE.Color(0.95, 0.98, 1.0) },
        sunColor: { value: new THREE.Color(1.0, 0.9, 0.7) }
      },
      vertexShader: `
        uniform float time;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        
        // 噪声函数 - 用于创建自然的不规则性
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        // 2D噪声
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          
          return mix(
            mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }
        
        // 分形噪声 - 多个频率叠加
        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          float frequency = 1.0;
          
          for (int i = 0; i < 4; i++) {
            value += amplitude * noise(p * frequency);
            amplitude *= 0.5;
            frequency *= 2.0;
          }
          
          return value;
        }
        
        void main() {
          vUv = uv;
          vPosition = position;
          
          vec3 pos = position;
          vec2 coord = pos.xz * 2.0;
          
          // 使用分形噪声创建弯曲的波纹
          float waveHeight = fbm(coord * 0.8 + time * 0.5) * 0.02;
          
          // 添加方向性波浪 - 弯曲的波纹
          vec2 dir1 = vec2(cos(time * 0.3), sin(time * 0.2)) * 0.7;
          vec2 dir2 = vec2(sin(time * 0.4), cos(time * 0.3)) * 0.5;
          
          float directionalWave1 = sin(dot(coord, dir1) * 2.0 + time * 1.5) * 0.01;
          float directionalWave2 = cos(dot(coord, dir2) * 1.5 + time * 1.2) * 0.008;
          
          // 移除圆形涟漪效果
          // float ripple = 0.0;
          // for (int i = 0; i < 3; i++) {
          //   float rippleTime = time * (0.8 + float(i) * 0.3);
          //   vec2 rippleCenter = vec2(sin(rippleTime * 0.7), cos(rippleTime * 0.5)) * 0.5;
          //   float dist = length(coord - rippleCenter);
          //   ripple += exp(-dist * 2.0) * sin(dist * 8.0 - rippleTime * 4.0) * 0.003;
          // }
          
          pos.y += waveHeight + directionalWave1 + directionalWave2; // 移除了 + ripple
          
          // 计算弯曲的法线
          vec2 sampleDist = vec2(0.1, 0.0);
          float h1 = fbm((coord + sampleDist.xy) * 0.8 + time * 0.5);
          float h2 = fbm((coord + sampleDist.yx) * 0.8 + time * 0.5);
          
          vec3 normal = normalize(vec3(
            h1 - waveHeight,
            sampleDist.x,
            h2 - waveHeight
          ));
          
          vNormal = normal;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 lightDirection;
        uniform vec3 waterColor;
        uniform vec3 deepWaterColor;
        uniform vec3 foamColor;
        uniform vec3 sunColor;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        
        // 噪声函数（与顶点着色器相同）
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          
          return mix(
            mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }
        
        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          float frequency = 1.0;
          
          for (int i = 0; i < 4; i++) {
            value += amplitude * noise(p * frequency);
            amplitude *= 0.5;
            frequency *= 2.0;
          }
          
          return value;
        }
        
        void main() {
          // 基于深度的颜色
          float depthFactor = smoothstep(-0.3, 0.3, vPosition.y);
          vec3 baseColor = mix(deepWaterColor, waterColor, depthFactor);
          
          // 光照计算
          vec3 normal = normalize(vNormal);
          float diffuse = max(dot(normal, lightDirection), 0.3);
          
          // 镜面反射 - 弯曲的水面会产生扭曲的反射
          vec3 viewDir = vec3(0.0, 0.0, 1.0);
          vec3 reflectDir = reflect(-lightDirection, normal);
          float specular = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
          
          // 基于波浪高度的泡沫
          vec2 coord = vPosition.xz * 2.0;
          float wavePattern = fbm(coord * 1.5 + time * 0.3);
          float foam = smoothstep(0.6, 0.8, wavePattern) * 0.5;
          
          // 移除边缘泡沫效果（会产生圆圈）
          // float edge = 1.0 - smoothstep(0.3, 0.5, length(vUv - 0.5));
          // foam += edge * 0.3;
          
          // 弯曲波纹的颜色变化
          float patternVariation = fbm(coord * 3.0 + time * 0.7) * 0.1;
          baseColor *= (0.9 + patternVariation);
          
          // 最终颜色组合
          vec3 finalColor = baseColor * diffuse;
          finalColor += specular * sunColor * 0.4;
          finalColor = mix(finalColor, foamColor, foam);
          
          // 透明度 - 波纹密集处更不透明
          float alpha = 0.8 + (wavePattern * 0.2) + (foam * 0.2);
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    
    const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = 0.03;
    
    return waterMesh;
  }, []);

  useFrame((state) => {
    if (waterRef.current) {
      const material = waterRef.current.material as THREE.ShaderMaterial;
      material.uniforms.time.value = state.clock.elapsedTime;
      
      // 动态改变光照方向，增强真实感
      material.uniforms.lightDirection.value.set(
        Math.sin(state.clock.elapsedTime * 0.05) * 0.3 + 0.5,
        1.0,
        Math.cos(state.clock.elapsedTime * 0.05) * 0.3 + 0.5
      ).normalize();
    }
  });

  return (
    <primitive 
      ref={waterRef} 
      object={water} 
      position={[position[0], 0.03, position[2]]} 
    />
  );
}

// ======= 主页面（含Canvas） =======
export function GardenPage() {
  const [objectPositions, setObjectPositions] = useState<[number, number][]>([]);
  const [season, setSeason] = useState(0); // 0:春, 1:夏, 2:秋, 3:冬
  const [isPlaying, setIsPlaying] = useState(false);
  const [renderModels, setRenderModels] = useState(false); // 是否点击按钮开始渲染
  const [modelConfig, setModelConfig] = useState<any[]>([]);
  const [showWater, setShowWater] = useState(false); 
  const [waterPositions, setWaterPositions] = useState<[number, number][]>([]);


  const handleCellClick = (x: number, y: number) => {
    setObjectPositions(prev => [...prev, [x, y]]);
  };
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setSeason(prev => (prev + 1) % 4);
      }, 3000); // 每3秒切换一次季节
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);



  // const toggleModel = (key: string) => {
  //   setActiveModels((prev) =>
  //     prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
  //   );
  // };

  const toggleRender = () => {
    if (renderModels == false) {
      const data = {}
      getModelConfig(data).then((res) => {
        console.log(res);
        console.log(res.data);
        setModelConfig(res.data.data);
        console.log(modelConfig)
      })
    }

    setRenderModels(!renderModels)
  };

    // 添加水处理函数
  const handleAddWater = () => {
    setShowWater(true);
    // 在当前所有对象位置上添加水
    setWaterPositions([...objectPositions]);
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <TopBar />
      <Canvas camera={{ position: [10, 10, 10], fov: 50 }} shadows style={{ width: '100%', height: '100%' }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <group position={GROUP_OFFSET}>
          <Grid
            args={[100 * CELL_SIZE, CELLS * 100, CELLS, CELLS]}
            cellSize={CELL_SIZE}
            cellColor={'#a9a9a9'}
            sectionColor={'#a9a9a9'}
            infiniteGrid={false}
            followCamera={false}
            fadeDistance={100}
            position={[HALF - CELL_SIZE / 2, 0, HALF - CELL_SIZE / 2]}
          />
          <ClickablePlane onClick={handleCellClick} />
          {/* {objectPositions.map(([x, y], i) => (
            <Object3DModel key={`crocus-${i}`} Reasource={"/models/crocus/"} name={"12974_crocus_flower_v1_l3"} position={[x * CELL_SIZE, 0, y * CELL_SIZE]} upAxis={'-x'} target={0.05} />
          ))}
          {objectPositions.map(([x, y], i) => (
            <Object3DModel key={`plant2-${i}`} Reasource={"/models/plant2/"} name={"plants2"} position={[x * CELL_SIZE, 0, y * CELL_SIZE]} upAxis={'y'} target={0.005} />
          ))} */}

          {modelConfig
          .filter((cfg) => cfg.season === season)
          .map((cfg) =>
            objectPositions.map(([x, y], i) => (
              <Object3DModel
                key={`${cfg.keyPrefix}-${i}`}
                Reasource={cfg.resource}
                name={cfg.name}
                position={[x * CELL_SIZE, 0, y * CELL_SIZE]}
                upAxis={cfg.upAxis}
                target={cfg.target}
              />
            ))
          )}

          {showWater && waterPositions.map(([x, y], i) => (
            <WaterTile key={`water-${i}`} position={[x * CELL_SIZE, 0, y * CELL_SIZE]} />
          ))}


        </group>
        <OrbitControls enablePan enableZoom enableRotate minDistance={5} maxDistance={50} />
      </Canvas>

      <Timeline 
        season={season} 
        setSeason={setSeason} 
        isPlaying={isPlaying} 
        togglePlay={togglePlay} 
      />

      <Box position="fixed" bottom="20px" right="20px" p={4} bg="rgba(0,0,0,0.7)" borderRadius="md">
        <Button
          onClick={() => toggleRender()}
        >
          加载模型
        </Button>
        <Button onClick={handleAddWater}>
          水
        </Button>
      </Box>
    </div>
  );
}