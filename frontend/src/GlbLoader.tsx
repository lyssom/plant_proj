import { useGLTF, Html } from "@react-three/drei";
import { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import {
  Heading,
  UnorderedList,
  Box,
  Button,
  Text,
  Flex,
} from "@chakra-ui/react";
import ReactMarkdown from "react-markdown";
import { getPlantDetail } from './api';
import { useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// ========= 全局缓存，避免重复加载 =========
const gltfCache: Record<string, THREE.Object3D> = {};
const modelSizeCache: Record<string, THREE.Vector3> = {};


interface PlantModalProps {
  isOpen: boolean;
  onClose: () => void;
  plantName: string;
}

const PlantModal: React.FC<PlantModalProps> = ({ isOpen, onClose, plantName }) => {
  const [plantDetails, setPlantDetails] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      fetchPlantDetails();
    }
  }, [isOpen]);

  const fetchPlantDetails = async () => {
    try {
      setPlantDetails(""); // 每次打开先清空
      const response = await getPlantDetail(plantName);
      setPlantDetails(response.data.data);
    } catch (err) {
      console.log(err);
      setPlantDetails("获取植物信息失败，请稍后再试。");
    }
  };

  if (!isOpen) return null;

  return (
    <Html center>
      <Box
        w="800px"
        maxH="400px"
        borderRadius="xl"
        overflow="hidden"
        boxShadow="2xl"
      >
        {/* 标题栏 */}
        <Flex
          bg="green"
          color="white"
          align="center"
          justify="space-between"
          px={4}
          py={2}
        >
          <Text fontSize="lg" fontWeight="bold">
            {plantName}
          </Text>
          <Button
            size="sm"
            variant="ghost"
            color="white"
            _hover={{ bg: "green" }}
            onClick={onClose}
          >
            ✕
          </Button>
        </Flex>

        {/* 正文 (Markdown 渲染) */}
        <Box
          bg="white"
          p={5}
          maxH="350px"
          overflowY="auto"
          textAlign="left"
          sx={{
            "&::-webkit-scrollbar": { width: "6px" },
            "&::-webkit-scrollbar-thumb": {
              background: "#68D391",
              borderRadius: "8px",
            },
          }}
        >
          <ReactMarkdown
            components={{
              h1: (props) => <Heading as="h1" size="lg" mb={3} {...props} />,
              h2: (props) => <Heading as="h2" size="md" mt={4} mb={2} {...props} />,
              h3: (props) => <Heading as="h3" size="sm" mt={3} mb={1} {...props} />,
              p: (props) => (
                <Text fontSize="md" color="gray.700" mb={2} {...props} />
              ),
              ul: ({ children }) => (
                <UnorderedList pl={5} spacing={1} mb={2}>
                  {children}
                </UnorderedList>
              ),
            }}
          >
            {plantDetails || "🌱 智能生成植物详细信息中…"}
          </ReactMarkdown>
        </Box>
      </Box>
    </Html>
  );
};

// function ObjectGLBModel({
//   Reasource,
//   name,
//   position,
//   upAxis,
//   target,
//   latinName,
//   zhName,
// }: {
//   Reasource: string;
//   name: string;
//   position: [number, number, number];
//   upAxis: string;
//   target: [number, number, number];
//   latinName: string;
//   zhName: string;
// }) {
//   const [obj, setObj] = useState<THREE.Object3D | null>(null);
//   const [modelSize, setModelSize] = useState<THREE.Vector3>(new THREE.Vector3(1, 1, 1));
//   const [hovered, setHovered] = useState(false);
//   const [modalOpen, setModalOpen] = useState(false);
//   const ref = useRef<THREE.Object3D>(null!);
//   const hideTimer = useRef<number>();

//   // 随机风动相位
//   const phaseOffset = useMemo(() => Math.random() * Math.PI * 2, []);

//   // ========== 模型加载逻辑 ==========
//   useEffect(() => {
//     const cacheKey = `${Reasource}_${name}`;
//     if (gltfCache[cacheKey]) {
//       setObj(gltfCache[cacheKey].clone(true));
//       setModelSize(modelSizeCache[cacheKey].clone());
//       return;
//     }

//     const loader = new GLTFLoader();
//     loader.setPath(Reasource);
//     loader.load(
//       name,
//       (gltf) => {
//         const model = gltf.scene;

//         // 材质复用：将双面与阴影开启操作放到 traverse 中复用
//         model.traverse((child: any) => {
//           if (child.isMesh) {
//             const mat = child.material;
//             mat.side = THREE.DoubleSide;
//             mat.needsUpdate = true;
//             child.castShadow = true;
//             child.receiveShadow = true;
//           }
//         });

//         // 坐标系统一
//         if (upAxis === "z" || upAxis === "x") model.rotation.x = Math.PI / 2;
//         else if (upAxis === "-z" || upAxis === "-x") model.rotation.x = -Math.PI / 2;
//         else if (upAxis === "y") model.rotation.y = Math.PI / 2;
//         else if (upAxis === "-y") model.rotation.y = -Math.PI / 2;

//         const wrapper = new THREE.Group();
//         wrapper.add(model);
//         model.updateMatrixWorld(true);

//         // 包围盒缓存
//         const box = new THREE.Box3().setFromObject(model);
//         const size = new THREE.Vector3();
//         box.getSize(size);
//         const bottomY = box.min.y;
//         const centerXZ = new THREE.Vector3();
//         box.getCenter(centerXZ);

//         model.position.x -= centerXZ.x;
//         model.position.y -= bottomY;
//         model.position.z -= centerXZ.z;
//         model.updateMatrixWorld(true);

//         // ✅ 缓存模型和尺寸
//         gltfCache[cacheKey] = wrapper;
//         modelSizeCache[cacheKey] = size;

//         setObj(wrapper.clone(true));
//         setModelSize(size);
//       },
//       undefined,
//       (err) => console.error("GLB加载失败：", err)
//     );
//   }, [Reasource, name, upAxis]);

//   // ========== 动态风动效果 ==========
//   useFrame(({ clock }) => {
//     const t = clock.getElapsedTime();
//     const sway = Math.sin(t * 1.5 + phaseOffset) * 0.01;
//     const tilt = Math.cos(t * 1.2 + phaseOffset) * 0.015;
//     if (ref.current) {
//       ref.current.rotation.z = sway;
//       ref.current.rotation.x = tilt;
//       ref.current.scale.lerp(new THREE.Vector3(...target), 0.05);
//     }
//   });

//   // ========== 悬浮与点击事件 ==========
//   const handleMoreInfo = (e: React.MouseEvent) => {
//     e.stopPropagation();
//     setModalOpen(true);
//   };

//   const handlePointerOver = () => {
//     if (hideTimer.current) clearTimeout(hideTimer.current);
//     setHovered(true);
//   };

//   const handlePointerOut = () => {
//     hideTimer.current = window.setTimeout(() => setHovered(false), 300);
//   };

//   if (!obj) return null;

//   return (
//     <group onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
//       <primitive ref={ref} object={obj} position={position} />

//       {/* Tooltip */}
//       {hovered && (
//         <Html
//           distanceFactor={10}
//           position={[position[0], position[1] + modelSize.y + 0.5, position[2]]}
//           style={{ pointerEvents: "auto", transform: "translate(-50%,-100%)" }}
//         >
//           <div
//             style={{
//               background: "white",
//               borderRadius: "8px",
//               boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
//               padding: "10px",
//               fontSize: "13px",
//               minWidth: "160px"
//             }}
//           >
//             <b>{zhName}</b>
//             <br />
//             <i>{latinName}</i>
//             <button
//               style={{
//                 display: "block",
//                 width: "100%",
//                 background: "#3182CE",
//                 color: "white",
//                 border: "none",
//                 borderRadius: "6px",
//                 marginTop: "8px",
//                 padding: "4px 0",
//                 cursor: "pointer"
//               }}
//               onClick={handleMoreInfo}
//             >
//               更多信息
//             </button>
//           </div>
//         </Html>
//       )}

//       <PlantModal isOpen={modalOpen} onClose={() => setModalOpen(false)} plantName={zhName} />
//     </group>
//   );
// }

export function ObjectGLBModel({
  Reasource,
  name,
  position,
  target,
  latinName,
  zhName,
}: {
  Reasource: string;
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  latinName: string;
  zhName: string;
}) {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modelWrapper, setModelWrapper] = useState<THREE.Group | null>(null);

  // ✅ 只加载一次模型，不触发 React 重新渲染整个树
  useEffect(() => {
    let mounted = true;
    const loader = new GLTFLoader();
    loader.load(`${Reasource}${name}`, (gltf) => {
      if (!mounted) return;
      const model = gltf.scene.clone(true);

      model.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          // ⭐ 保留原材质，只补充 Shadow 所需属性
          if (child.material) {
            child.material.side = THREE.DoubleSide;

            // 如果是透明贴图的植物材质
            child.material.alphaTest = 0.4;     // ⭐ 植物阴影的关键
            child.material.transparent = true;

            // 阴影优化参数
            child.material.depthWrite = true;
            child.material.needsUpdate = true;
          }

          // 阴影方向
          child.shadowSide = THREE.FrontSide;
        }
      });



      // === 偏移校正逻辑 ===
      const wrapper = new THREE.Group();
      wrapper.add(model);
      model.updateMatrixWorld(true);
      wrapper.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);
      const bottomY = box.min.y;

      model.position.x -= center.x;
      model.position.y -= bottomY;
      model.position.z -= center.z;
      model.updateMatrixWorld(true);

      setModelWrapper(wrapper);
    });

    return () => {
      mounted = false;
    };
  }, [Reasource, name]);

  // ✅ 动画（风动效果）
  useFrame(({ clock }) => {
    // console.log(target)
    const t = clock.getElapsedTime();
    if (ref.current) {
      ref.current.rotation.z = Math.sin(t * 1.5) * 0.01;
      ref.current.rotation.x = Math.cos(t * 1.2) * 0.015;
      ref.current.scale.lerp(new THREE.Vector3(...target), 1);
    }
  });

  return (
    <group
      ref={ref}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* ✅ 局部刷新：只在模型加载完成后挂载 */}
      {modelWrapper && <primitive object={modelWrapper} />}

      {/* Tooltip */}
      {hovered && (
        <Html distanceFactor={10} position={[0, 1.5, 0]}>
          <div
            style={{
              background: "white",
              padding: "8px",
              borderRadius: "6px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
            }}
          >
            <b>{zhName}</b>
            <br />
            <i>{latinName}</i>
            <button
              style={{
                display: "block",
                marginTop: "6px",
                padding: "4px 6px",
                background: "#3182CE",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              onClick={() => setModalOpen(true)}
            >
              更多信息
            </button>
          </div>
        </Html>
      )}

      {/* 弹窗 */}
      {modalOpen && (
        <PlantModal
          isOpen
          onClose={() => setModalOpen(false)}
          plantName={zhName}
        />
      )}
    </group>
  );
}


export default ObjectGLBModel;
