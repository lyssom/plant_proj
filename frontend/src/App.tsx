import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';

// Define Box component
interface BoxProps {
  position: [number, number, number];
  onClick: () => void;
  color: string;
}

function Box({ position, onClick, color }: BoxProps) {
  const mesh = useRef<THREE.Mesh>(null);

  return (
    <mesh
      position={position}
      ref={mesh}
      onClick={onClick}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[0.98, 0.05, 0.98]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

// Define ClickablePlane component
type ColorState = boolean[][];

interface ClickablePlaneProps {
  onClick: (x: number, y: number) => void;
}

function ClickablePlane({ onClick }: ClickablePlaneProps) {
  const size = 10;
  const [colors, setColors] = useState<ColorState>(
    Array(size).fill(null).map(() => Array(size).fill(true))
  );

  const handleClick = (x: number, y: number) => {
    const newColors = [...colors.map(row => [...row])];
    newColors[x][y] = !newColors[x][y];
    setColors(newColors);
    onClick(x, y); // Pass the clicked position to the parent
  };

  return (
    <group position={[-size / 2 + 0.5, 0.025, -size / 2 + 0.5]}>
      {colors.map((row, x) =>
        row.map((isGreen, y) => (
          <Box
            key={`${x}-${y}`}
            position={[x, 0, y]}
            onClick={() => handleClick(x, y)}
            color={isGreen ? 'limegreen' : 'white'}
          />
        ))
      )}
    </group>
  );
}

import * as THREE from 'three';

function Object3DModel({ position }: { position: [number, number, number] }) {
  const [obj, setObj] = useState<any>(null);

  useEffect(() => {
    const mtlLoader = new MTLLoader();
    mtlLoader.setResourcePath('/models/');   // 确保贴图能找到
    mtlLoader.setPath('/models/');
    mtlLoader.load('12974_crocus_flower_v1_l3.mtl', (loadedMaterials) => {
      loadedMaterials.preload();

      const objLoader = new OBJLoader();
      objLoader.setMaterials(loadedMaterials);
      objLoader.setPath('/models/');
      objLoader.load('12974_crocus_flower_v1_l3.obj', (loadedObj) => {
        // ✅ 强制修复材质
        loadedObj.traverse((child: any) => {
          if (child.isMesh) {
            child.material.side = THREE.DoubleSide;
            child.material.needsUpdate = true;
          }
        });
        setObj(loadedObj);
      });
    });
  }, []);

  if (!obj) return null;

  return (
    <primitive
      object={obj}
      position={[position[0] - 10 / 2 + 0.5, -0.2, position[1] - 10 / 2 + 0.5]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[0.05, 0.05, 0.05]}
    />
  );
}


// Define App component
export default function App() {
  const [objectPositions, setObjectPositions] = useState<[number, number][]>([]);

  const handleCellClick = (x: number, y: number) => {
    // Add the clicked position to the array
    setObjectPositions((prevPositions) => [...prevPositions, [x, y]]);
  };

  return (
    <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
      {/* <directionalLight position={[10, 10, 5]} intensity={1} castShadow /> */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

      <ClickablePlane onClick={handleCellClick} />
      <Grid
        args={[10, 10]}
        cellColor={'#a9a9a9'}
        sectionColor={'#a9a9a9'}
        fadeDistance={100}
        position={[0, 0, 0]}
      />
      {/* Render Object3DModel at the positions stored in objectPositions */}
      {objectPositions.map(([x, y], index) => (
        <Object3DModel key={index} position={[x, 0, y]} />
      ))}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={50}
      />
    </Canvas>
  );
}
