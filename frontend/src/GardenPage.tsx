import { useRef, useState, useEffect, useMemo, use } from 'react';
import { useLoader, Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import SunCalc from "suncalc";
import { Html } from "@react-three/drei";
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { ChevronRightIcon, MinusIcon } from '@chakra-ui/icons';
import { getModelConfig, getLocationMsg } from './api';
import { useThree } from '@react-three/fiber';

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
  VStack,
  Menu,
  MenuButton,
  MenuList,
  FormControl,
  FormLabel,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Select,
  useDisclosure,
  NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper,
  Checkbox,
  Stack,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  MenuItem, Flex, Spacer } from "@chakra-ui/react";


const CELL_SIZE = 1;     
type Mode = "normal" | "water" | "wall" | "building" | "tree" | "terrain" | "flower" | "grass";


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

function ClickablePlane({
  onClick,
  cells,
  mode,
  terrainHeight,
  flowerPositions
}: {
  onClick: (x: number, y: number) => void;
  cells: [number, number];
  mode: Mode;
  terrainHeight: number;
  flowerPositions: { x: number; y: number }[];
}) {
  const [colors, setColors] = useState<ColorState>(
    Array(cells[0]).fill(null).map(() => Array(cells[1]).fill(true))
  );

  useEffect(() => {
    setColors(Array(cells[0]).fill(null).map(() => Array(cells[1]).fill(true)));
  }, [cells]);

  const handleClick = (x: number, y: number) => {
    const copy = colors.map((r) => [...r]);
    copy[x][y] = !copy[x][y];
    setColors(copy);
    onClick(x, y);
  };

  const handleSet = (x: number, y: number) => {
    const copy = colors.map((r) => [...r]);
    copy[x][y] = !copy[x][y];
    onClick(x, y);
  };

  // 每个格子的高度独立存储
  const [cellHeights, setCellHeights] = useState<Record<string, number>>({});
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);

  function handleClickPosition(x: number, y: number) {
    if (mode === "normal") {
      handleClick(x, y);
    } else if (mode === "terrain") {
      // handleClickTerrain(x, y);
      setSelectedCell([x, y]);
    } else {
      handleSet(x, y);
    }
  }

  useEffect(() => {
    // console.log(terrainHeight);
    if (selectedCell) {
      const [x, y] = selectedCell;
      const key = `${x}-${y}`;
      setCellHeights((prev) => ({
        ...prev,
        [key]: terrainHeight
      }));
    }
  }, [terrainHeight, selectedCell]);

  console.log(66666666)
  console.log(flowerPositions)
  console.log(66666666777)

  return (
    <group>
      {colors.map((row, x) =>
        row.map((isGreen, y) => {
          const key = `${x}-${y}`;
          const height = cellHeights[key] ?? 0;
          const isSelected =
              selectedCell &&
              selectedCell[0] === x &&
              selectedCell[1] === y;

          const isFlower = flowerPositions.some(
            (pos) => pos.x === x && pos.y === y
          );


          return (
            <mesh
              key={key}
              position={[x * CELL_SIZE, height / 2, y * CELL_SIZE]}
              onClick={() => handleClickPosition(x, y)}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[CELL_SIZE, height+0.01, CELL_SIZE]}/>
              <meshStandardMaterial 
              color={
                  isFlower
                    ? "pink" // ✅ 花朵格子
                    : isSelected
                    ? "green"
                    : isGreen
                    ? "limegreen"
                    : "white"
                }
                  />

                {/* <BoxGeometry position={[x * CELL_SIZE, height / 2, y * CELL_SIZE]} onClick={() => handleClickPosition(x, y)} color={isSelected ? "green" : isGreen ? "limegreen" : "white"} /> */}
            </mesh>
          );
        })
      )}
    </group>
  );
}


type GardenDrawerProps = {
  cells: [number, number];
  setCells: React.Dispatch<React.SetStateAction<[number, number]>>;
  mode: Mode;
  setMode: React.Dispatch<React.SetStateAction<Mode>>;
  treeHeight: number;
  setTreeHeight: React.Dispatch<React.SetStateAction<number>>;
  treeWidth: number;
  setTreeWidth: React.Dispatch<React.SetStateAction<number>>;
  terrainHeight: number;
  setTerrainHeight: React.Dispatch<React.SetStateAction<number>>;
  spaceNeeded: boolean;
  setSpaceNeeded: React.Dispatch<React.SetStateAction<boolean>>;
  spaceRatio: number;
  setSpaceRatio: React.Dispatch<React.SetStateAction<number>>;

};


export function LocationSelect() {
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [provinceTree, setProvinceTree] = useState([]);

  useEffect(() => {
    getLocationMsg().then((res) => {
      console.log(res);
      setProvinceTree(res.data.data);
    });
  }, []);

  const currentCities =
    provinceTree.find((p) => p.province === province)?.cities || [];

return (
    <FormControl mb={6}>
      <FormLabel mb={2}>地理位置</FormLabel>
      <HStack spacing={4}>
        <Select
          placeholder="请选择省份"
          value={province}
          onChange={(e) => {
            setProvince(e.target.value);
            setCity("");
          }}
        >
          {provinceTree.map((p) => (
            <option key={p.province} value={p.province}>
              {p.province}
            </option>
          ))}
        </Select>

        <Select
          placeholder="请选择城市"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          isDisabled={!province}
        >
          {currentCities.map((c) => (
            <option key={c.city} value={c.city}>
              {c.city}
            </option>
          ))}
        </Select>
      </HStack>
    </FormControl>
  );
}


const options = [
  { label: "无明确风格", value: "none" },
  { label: "观赏草甸", value: "meadow" },
  { label: "昆虫友好花园", value: "insectFriendly" },
  { label: "雨水花园", value: "rainGarden" },
  { label: "儿童花园", value: "children" },
  { label: "疗愈花园", value: "healing" },
  { label: "岩石花园", value: "rock" },
  { label: "可食花园", value: "edible" },
];

export function GardenDrawer({ 
  cells, setCells, mode, setMode, treeHeight, setTreeHeight, 
  treeWidth, setTreeWidth, terrainHeight, setTerrainHeight,
  spaceNeeded, setSpaceNeeded, spaceRatio, setSpaceRatio,

}: GardenDrawerProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [step, setStep] = useState(0);
  const [style, setStyle] = useState("");
  const [selectedPlants, setSelectedPlants] = useState<string[]>([]);

  const handleClose = () => {
    setStep(0);
    onClose();
  };



  const toggleStyle = (value: string) => {
    setSelectedPlants((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  console.log(mode)
  return (
    <>
      <Button onClick={onOpen}>设置花园</Button>

      <Drawer
        isOpen={isOpen}
        placement="right" // 可以改成 "bottom" 就会从下方弹出
        onClose={onClose}
        size="sm"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>我的花园</DrawerHeader>

          <DrawerBody>
            {step === 0 && (
              <VStack spacing={6} align="stretch">

            <Text mb={4}>
              告诉我们你的花园在哪里、多大。每个像素代表 0.5 米 × 0.5 米。点击像素即可为树木、小路或不规则边缘预留空间。
            </Text>

            <FormControl mb={6}>
              <LocationSelect />
            </FormControl>

            <FormControl mb={6}>
              <FormLabel>宽度</FormLabel>
              <Slider
                min={2}
                max={15}
                step={1} // 步长改成 1，保证每次滑动整数
                value={cells[0]}
                onChange={(value: number) => setCells([Math.round(value), cells[1]])}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb boxSize={8}>
                  <Box
                    bg="yellow.300"
                    borderRadius="full"
                    w="32px"
                    h="32px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontWeight="bold"
                  >
                    {cells[0]}
                  </Box>
                </SliderThumb>
              </Slider>
            </FormControl>

            <FormControl mb={6}>
              <FormLabel>长度</FormLabel>
              <Slider
                min={2}
                max={15}
                step={1}
                value={cells[1]}
                onChange={(value: number) => setCells([cells[0], Math.round(value)])}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb boxSize={8}>
                  <Box
                    bg="yellow.300"
                    borderRadius="full"
                    w="32px"
                    h="32px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontWeight="bold"
                  >
                    {cells[1]}
                  </Box>
                </SliderThumb>
              </Slider>
            </FormControl>
            </VStack>
            )}


             {step === 1 && (
              <VStack spacing={4}>
                <HStack spacing={4}>
                  <Button colorScheme="teal" onClick={() => setMode('normal')}>铺装</Button>
                  <Button colorScheme="orange" onClick={() => setMode('wall')}>墙</Button>
                  <Button colorScheme="purple" onClick={() => setMode('building')}>建筑</Button>
                </HStack>
                <HStack spacing={4}>
                  <Button colorScheme="blue" onClick={() => setMode('water')}>水面</Button>
                  <Button colorScheme="green" onClick={() => setMode('tree')}>乔木</Button>
                  <Button colorScheme="pink" onClick={() => setMode('terrain')}>地形</Button>
                </HStack>

                <VStack align="start" spacing={3}>
                    <Text fontSize="lg" fontWeight="bold" color="teal.600">
                      正在设置: {mode}
                    </Text>
                    {mode === "tree" && (
                      <HStack spacing={4} alignItems="center">
                        {/* 树高 */}
                        <HStack spacing={1}>
                          <FormLabel htmlFor="treeHeight" mb={0}>树高</FormLabel>
                          <NumberInput id="treeHeight" value={treeHeight} onChange={(valueStr) => setTreeHeight(parseFloat(valueStr))} min={0} max={10} step={0.1} size="sm" width="80px">
                            <NumberInputField />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </HStack>

                        {/* 冠幅 */}
                        <HStack spacing={1}>
                          <FormLabel htmlFor="crownWidth" mb={0}>冠幅</FormLabel>
                          <NumberInput id="crownWidth" value={treeWidth} onChange={(valueStr) => setTreeWidth(parseFloat(valueStr))} min={0} max={10} step={0.1} size="sm" width="80px">
                            <NumberInputField />
                            <NumberInputStepper />
                          </NumberInput>
                        </HStack>
                      </HStack>
                    )}

                    {mode === "terrain" && (
                      <HStack spacing={1}>
                        <FormLabel htmlFor="treeHeight" mb={0}>地形</FormLabel>
                        <NumberInput id="treeHeight" value={terrainHeight} onChange={(valueStr) => setTerrainHeight(parseFloat(valueStr))} min={-10} max={10} step={0.1} size="sm" width="80px">
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </HStack>
                    )}
                </VStack>
              </VStack>
            )}

            {step === 2 && (
              <Stack spacing={4}>
              <FormControl>
                <FormLabel>是否需要活动空间？</FormLabel>
                <Checkbox
                  isChecked={spaceNeeded}
                  onChange={(e) => setSpaceNeeded(e.target.checked)}
                >
                  需要
                </Checkbox>
              </FormControl>

              {spaceNeeded && (
                <FormControl>
                  <FormLabel>所占比例: {spaceRatio}%</FormLabel>
                  <Slider
                    aria-label="space-ratio"
                    value={spaceRatio}
                    onChange={setSpaceRatio}
                  >
                    <SliderTrack>
                      <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                </FormControl>
              )}

              <FormControl>
                <FormLabel>手动修改草地的位置</FormLabel>
                <Stack direction="row" spacing={4}>
                  <Button colorScheme="green" onClick={() => setMode('grass')}>草地</Button>
                  <Button colorScheme="pink" onClick={() => setMode('flower')}>花境</Button>
                </Stack>
              </FormControl>
            </Stack>

            )}

            {step === 3 && (
              <FormControl>
                <FormLabel>花园的风格</FormLabel>
                <Select
                  placeholder="请选择花园风格"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                >
                  <option value="none">无明确风格</option>
                  <option value="meadow">观赏草甸</option>
                  <option value="insectFriendly">昆虫友好花园</option>
                  <option value="rainGarden">雨水花园</option>
                  <option value="children">儿童花园</option>
                  <option value="healing">疗愈花园</option>
                  <option value="rock">岩石花园</option>
                  <option value="edible">可食花园</option>
                </Select>

              <FormLabel>花园的风格</FormLabel>
              <Menu closeOnSelect={false}>
                <MenuButton as={Button}>
                  {selectedPlants.length > 0
                    ? selectedPlants.map((v) => options.find((o) => o.value === v)?.label).join(", ")
                    : "请选择花园风格"}
                </MenuButton>
                <MenuList>
                  <Stack spacing={1} p={2}>
                    {options.map((option) => (
                      <Checkbox
                        key={option.value}
                        isChecked={selectedPlants.includes(option.value)}
                        onChange={() => toggleStyle(option.value)}
                      >
                        {option.label}
                      </Checkbox>
                    ))}
                  </Stack>
                </MenuList>
              </Menu>
            </FormControl>

            )}
          </DrawerBody>

          <DrawerFooter>
            {step === 0 && (
              <Button colorScheme="blue" onClick={() => setStep(1)}>
                下一步
              </Button>
            )}

            {step === 1 && (
              <>
                <Button variant="ghost" mr={3} onClick={() => setStep(0)}>
                  上一步
                </Button>
                <Button colorScheme="blue" onClick={() => setStep(2)}>
                  下一步
                </Button>
              </>
            )}
             {step === 2 && (
              <>
                <Button variant="ghost" mr={3} onClick={() => setStep(1)}>
                  上一步
                </Button>
                <Button colorScheme="blue" onClick={() => setStep(3)}>
                  下一步
                </Button>
              </>
            )}

            {step === 3 && (
              <>
              <Button variant="ghost" mr={3} onClick={() => setStep(2)}>
                  上一步
                </Button>
              {/* <Button colorScheme="green" onClick={onClose}>
                完成
              </Button> */}
              <GardenModal />
              </>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
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


  const modelInfo = {
    name: "乔木",
    height: "约 5 米",
    type: "常绿树",
    description: "适合园林景观，美化环境，提供遮荫。",
  };

function ObjectGLBModel({
  Reasource,
  name,
  position,
  upAxis,
  target,
}: {
  Reasource: string;
  name: string;
  position: [number, number, number];
  upAxis: string;
  target: [number, number, number];
}) {
  const [obj, setObj] = useState<THREE.Object3D | null>(null);
  const ref = useRef<THREE.Object3D>(null!);
  const [hovered, setHovered] = useState(false);

  console.log(Reasource)
  console.log(name)

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.setPath(Reasource);
    loader.load(`${name}.glb`, (gltf) => {
      const model = gltf.scene;

      model.traverse((child: any) => {
        if (child.isMesh) {
          child.material.side = THREE.DoubleSide;
          child.material.needsUpdate = true;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // 处理 upAxis
      if (upAxis === "z") {
        model.rotation.x = Math.PI / 2;
      } else if (upAxis === "x") {
        model.rotation.x = Math.PI / 2;
      } else if (upAxis === "y") {
        model.rotation.y = Math.PI / 2;
      } else if (upAxis === "-z") {
        model.rotation.x = -Math.PI / 2;
      } else if (upAxis === "-x") {
        model.rotation.x = -Math.PI / 2;
      } else if (upAxis === "-y") {
        model.rotation.y = -Math.PI / 2;
      }

      const box = new THREE.Box3().setFromObject(model);
      const height = box.max.y - box.min.y;
      model.position.y -= box.min.y; // 把底部贴到 y=0

      setObj(model);
    });
  }, []);

  useFrame(() => {
    if (ref.current) {
      ref.current.scale.x = Math.min(ref.current.scale.x + 0.01, target[0]);
      ref.current.scale.y = Math.min(ref.current.scale.y + 0.01, target[1]);
      ref.current.scale.z = Math.min(ref.current.scale.z + 0.01, target[2]);
    }
  });

  if (!obj) return null;

  return (
  <group
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
    <primitive ref={ref} object={obj} position={position} scale={[1, 1, 1]} />
    {hovered && (
        <Html distanceFactor={10}>
          <Tooltip
            isOpen
            label={
              <div>
                <p><b>名称：</b>乔木</p>
                <p><b>高度：</b>约 5 米</p>
                <p><b>类型：</b>常绿树</p>
                <p><b>说明：</b>适合园林景观，美化环境，提供遮荫。</p>
              </div>
            }
            placement="top"
            hasArrow
            bg="white"         // 背景白色
            color="gray.800"   // 字体深灰
            p={3}              // 内边距
            borderRadius="md"  // 圆角
            boxShadow="lg"     // 柔和阴影
            arrowShadowColor="rgba(0,0,0,0.15)" // 箭头阴影
          >
            <span style={{ width: 1, height: 1 }} /> {/* Tooltip 需要一个触发器 */}
          </Tooltip>
        </Html>
      )}
    </group>
  );
}



// ======= 顶栏组件 =======
function TopBar() {
  const navigate = useNavigate();

  return (
    <Flex
      as="div"
      position="fixed"
      top={0}
      left={0}
      right={0}
      height="50px"
      bg="#222"
      color="white"
      align="center"
      px={6}
      zIndex={1000}
    >
      {/* 菜单按钮（靠左或中间，不挨着登录按钮） */}
      <Menu>
        <MenuButton
          as={Button}
          variant="outline"
          colorScheme="teal"
        >
          菜单
        </MenuButton>
        <MenuList bg="#2D3748" color="#1c1d1dff" borderColor="#4A5568" boxShadow="md">
          <MenuItem
            _hover={{ bg: "#4A5568", color: "#FFFFFF" }}
            onClick={() => navigate("/projects")}
          >
            建成项目
          </MenuItem>
          <MenuItem
            _hover={{ bg: "#4A5568", color: "#FFFFFF" }}
            onClick={() => navigate("/events")}
          >
            往期活动
          </MenuItem>
          <MenuItem
            _hover={{ bg: "#4A5568", color: "#FFFFFF" }}
            onClick={() => navigate("/research")}
          >
            研究成果
          </MenuItem>
        </MenuList>
      </Menu>

      {/* Spacer 占位，使登录按钮在最右 */}
      <Spacer />

      {/* 登录按钮 */}
      <Button
        variant="outline"
        colorScheme="whiteAlpha"
        onClick={() => navigate("/login")}
      >
        登录
      </Button>
    </Flex>
  );
}

export default TopBar;


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

interface WallTileProps {
  position: [number, number, number];
  rotation?: [number, number, number]; // 可选的旋转参数
}
export function WallTile({ position, rotation = [0, 0, 0] }: WallTileProps) {
  // const texture = useLoader(THREE.TextureLoader, "/textures/brick_diffuse.jpg");
  // texture.wrapS = THREE.RepeatWrapping;
  // texture.wrapT = THREE.RepeatWrapping;
  // texture.repeat.set(1, 1);
  const texture = useMemo(() => {
    const tex = new THREE.TextureLoader().load("/textures/brick_diffuse.jpg");
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    return tex;
  }, []);
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 0.2]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}

function Building({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      {/* 比墙大一些，像一个小房子 */}
      <boxGeometry args={[1.5, 2, 1.5]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}


function DirectionalSun({ latitude, longitude, date }) {
  const lightRef = useRef<THREE.DirectionalLight>(null!);

  useFrame(() => {
    if (!lightRef.current) return;

    const pos = SunCalc.getPosition(date, latitude, longitude);
    // console.log(date);
    // console.log(latitude, longitude);
    const alt = pos.altitude;
    const az = pos.azimuth;
    const r = 50;

    lightRef.current.position.set(
      r * Math.cos(alt) * Math.sin(az),
      r * Math.sin(alt),
      r * Math.cos(alt) * Math.cos(az),
    );
    lightRef.current.target.position.set(0, 0, 0);
    lightRef.current.target.updateMatrixWorld();
  });

  return (
    <directionalLight
      ref={lightRef}
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-near={1}
      shadow-camera-far={100}
      shadow-camera-left={-30}
      shadow-camera-right={30}
      shadow-camera-top={30}
      shadow-camera-bottom={-30}
      intensity={1}
    />
  );
}


interface Plant {
  position: {x: number; y: number};
  type: string;
  color: string;
}

const plantData: Plant[] = [
  { position: { x: 0, y:0 }, type: "针芒", color: "#6BAF92" },
  { position: { x: 1, y:0}, type: "鼠尾草", color: "#A88ED0" },
  { position: { x: 2, y:1}, type: "落新妇", color: "#F3A6B0" },
  { position: { x: 3, y:2}, type: "松果菊", color: "#E58B4A" },
  { position: { x: 4, y:1}, type: "薰衣草", color: "#9A66CC" },
];

export function GardenModal() {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const cellSize = 60; // 每个格子大小
  const radius = 25; // 圆的半径

  return (
    <>
      <Button colorScheme="teal" onClick={onOpen}>
        查看花园布局
      </Button>

      <Modal isOpen={isOpen} onClose={onClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>花园二维平面图</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <svg
              width={600}
              height={400}
              style={{ border: "1px solid #ccc", background: "#fdfdfd" }}
            >
              {/* 绘制格子 */}
              {Array.from({ length: 10 }).map((_, i) =>
                Array.from({ length: 6 }).map((_, j) => (
                  <rect
                    key={`${i}-${j}`}
                    x={i * cellSize}
                    y={j * cellSize}
                    width={cellSize}
                    height={cellSize}
                    fill="none"
                    stroke="#ddd"
                  />
                ))
              )}

              {/* 绘制植物 */}
              {plantData.map((plant, idx) => (
                <g key={idx}>
                  <circle
                    cx={plant.position.x * cellSize + cellSize / 2}
                    cy={plant.position.y * cellSize + cellSize / 2}
                    r={radius}
                    fill={plant.color}
                    opacity={0.7}
                  />
                  <text
                    x={plant.position.x * cellSize + cellSize / 2}
                    y={plant.position.y * cellSize + cellSize / 2 + 5}
                    fontSize="12"
                    textAnchor="middle"
                    fill="#000"
                  >
                    {plant.type}
                  </text>
                </g>
              ))}
            </svg>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}


function ScreenshotButton() {
  const { gl } = useThree();

  const handleScreenshot = () => {
    const dataURL = gl.domElement.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "screenshot.png";
    link.click();
  };

  
  return (
    <Html position={[0, 0, 0]}>
      <button onClick={handleScreenshot}>截图</button>
    </Html>
  )
}

// ======= 主页面（含Canvas） =======
export function GardenPage() {
  const [objectPositions, setObjectPositions] = useState<{x: number; y: number}[]>([]);
  const [season, setSeason] = useState(0); // 0:春, 1:夏, 2:秋, 3:冬
  const [isPlaying, setIsPlaying] = useState(false);
  const [renderModels, setRenderModels] = useState(false); // 是否点击按钮开始渲染
  const [modelConfig, setModelConfig] = useState<any[]>([]);
  const [waterPositions, setWaterPositions] = useState<{x: number; y: number}[]>([]);
  const [treePositions, setTreePositions] = useState<
      { x: number; y: number; width: number; height: number }[]
    >([]);

  const [treeHeight, setTreeHeight] = useState(1);
  const [treeWidth, setTreeWidth] = useState(1);
  const [terrainHeight, setTerrainHeight] = useState(0);


  const [mode, setMode] = useState<Mode>("normal");
  const [buildingPositions, setBuildingPositions] = useState<{x: number; y: number}[]>([]);
  type WallData = { x: number; y: number; rotation: number };
  const [wallPositions, setWallPositions] = useState<WallData[]>([]);
  const [currentRotation, setCurrentRotation] = useState(0);

  const [latitude] = useState(30.59);
  const [longitude] = useState(114.30);
  const [date, setDate] = useState(new Date());

  const [cells, setCells] = useState<[number, number]>([10, 10]);
  const [spaceNeeded, setSpaceNeeded] = useState(false);
  const [spaceRatio, setSpaceRatio] = useState(30);
  const [flowerPositions, setFlowerPositions] = useState<{x: number; y: number}[]>([]);

  const HALF_X = (cells[0] * CELL_SIZE) / 2;
  const HALF_Y = (cells[1] * CELL_SIZE) / 2;
  const GROUP_OFFSET: [number, number, number] = [
    -HALF_X + CELL_SIZE / 2,   
    0,
    -HALF_Y + CELL_SIZE / 2,
  ];


  const handleCellClick = (x: number, y: number) => {
    if (mode === "normal") {
      setObjectPositions(prev => [...prev, {x, y}]);
    } else if (mode === "water") {
      setWaterPositions(prev => [...prev, {x, y}]);
    } else if (mode === "wall") {
      setWallPositions(prev => [
      ...prev,
      { x, y, rotation: currentRotation }
    ]);
    } else if (mode === "building") {
      setBuildingPositions(prev => [...prev, {x, y}]);
    } else if (mode === "tree") {
      setTreePositions([...treePositions,
    { x, y, width: treeWidth, height: treeHeight }]);
    } else if (mode === "flower") {
    setFlowerPositions(prev => {
      const exists = prev.some(pos => pos.x === x && pos.y === y);
      if (!exists) {
        return [...prev, { x, y }];
      }
      return prev; // 已存在则不变
    });
  } else if (mode === "grass") {
    setFlowerPositions(prev =>
      prev.filter(pos => !(pos.x === x && pos.y === y))
    );
  }
  };


  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

    // 每秒更新时间
  useEffect(() => {
    const id = setInterval(() => setDate(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

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


  useEffect(() => {
    const totalPositions: {x: number; y: number}[] = [];
    for (let x = 0; x < cells[0]; x++) {
      for (let y = 0; y < cells[1]; y++) {
        totalPositions.push({ x, y });
      }
    }

    // 5类已占用格子
    const occupied = new Set(
      [...waterPositions, ...buildingPositions, ...wallPositions, ...treePositions, ...objectPositions]
        .map(pos => `${pos.x}-${pos.y}`)
    );

    // 过滤剩余格子
    const available = totalPositions.filter(
      pos => !occupied.has(`${pos.x}-${pos.y}`)
    );

    // 随机挑选 70%
    console.log(spaceRatio)
    // flowerRatio = (100-spaceRatio)/100
    const targetCount = Math.floor(available.length * (100-spaceRatio)/100);
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, targetCount);

    if (spaceNeeded) {
      setFlowerPositions(selected);
    }

    // setFlowerPositions(selected);
    console.log(1111111)
    console.log(flowerPositions)
    console.log(111111122)
  }, [cells, spaceRatio, spaceNeeded]);

  console.log(11199)

  console.log(flowerPositions)
  console.log(111998888)



  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <TopBar />
      <Canvas camera={{ position: [10, 10, 10], fov: 50 }} shadows style={{ width: '100%', height: '100%' }} gl={{ preserveDrawingBuffer: true }}>
        <ambientLight intensity={0.6} />
        <DirectionalSun latitude={latitude} longitude={longitude} date={date} />
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[HALF_X, -0.01, HALF_Y]} // 稍微放低，避免和 Grid 重合
          receiveShadow
        ></mesh>
        <group position={GROUP_OFFSET}>
        <Grid
          // 宽度 = 行数 × CELL_SIZE，高度 = 列数 × CELL_SIZE
          args={[100, 100, 100, 100]}
          cellSize={CELL_SIZE}
          cellColor={'#a9a9a9'}
          sectionColor={'#a9a9a9'}
          infiniteGrid={false}
          followCamera={false}
          fadeDistance={100}
          position={[HALF_X - CELL_SIZE / 2, 0.02, HALF_Y - CELL_SIZE / 2]}
        />
        <ClickablePlane onClick={handleCellClick} cells={cells} mode={mode} terrainHeight={terrainHeight} flowerPositions={flowerPositions}/>


        {modelConfig
          .filter((cfg) => cfg.season === season)
          .map((cfg) =>
            objectPositions.map(([x, y], i) => (
              <group key={`${cfg.keyPrefix}-group-${i}`}>
                {cfg.models.map((m, j) => (
                  <ObjectGLBModel
                    key={`${cfg.keyPrefix}-${j}-${i}`}
                    Reasource={m.resource}
                    name={m.name}
                    position={[
                      x * CELL_SIZE + (m.offset?.[0] ?? 0),
                      (m.offset?.[1] ?? 0),
                      y * CELL_SIZE + (m.offset?.[2] ?? 0),
                    ]}
                    upAxis={m.upAxis}
                    target={[m.target, m.target, m.target]}
                  />
                ))}
              </group>
            ))
          )}

          {waterPositions.map(({x, y}, i) => (
            <WaterTile key={`water-${i}`} position={[x * CELL_SIZE, 0, y * CELL_SIZE]} />
          ))}

         {wallPositions.map((wall, i) => (
            <WallTile
              key={`wall-${i}`}
              position={[wall.x * CELL_SIZE, 0.5, wall.y * CELL_SIZE]}
              // rotation={[0, wall.rotation, 0]}
            />
          ))}

          {buildingPositions.map(({x, y}, i) => (
            <Building
              key={`building-${i}`}
              position={[x * CELL_SIZE, 1, y * CELL_SIZE]} // 高度放在 1
            />
          ))}


          {treePositions.map(({ x, y, width, height }, i) => (
            <ObjectGLBModel
              key={`tree-${i}`}
              Reasource={"/models/tree/"}
              name={"tree"}
              position={[x * CELL_SIZE, 0, y * CELL_SIZE]}
              upAxis={''}
              target={[width, height, width]}
            />
          ))}


        </group>
        <OrbitControls enablePan enableZoom enableRotate minDistance={5} maxDistance={50} />

        <ScreenshotButton />

      </Canvas>

      <Timeline 
        season={season} 
        setSeason={setSeason} 
        isPlaying={isPlaying} 
        togglePlay={togglePlay} 
      />


      <Box position="fixed" bottom="20px" right="20px" p={0} bg="rgba(0,0,0,0.7)" borderRadius="md">

      <GardenDrawer
        cells={cells}
        setCells={setCells}
        mode={mode}
        setMode={setMode}
        treeHeight={treeHeight}
        setTreeHeight={setTreeHeight}
        treeWidth={treeWidth}
        setTreeWidth={setTreeWidth}
        terrainHeight={terrainHeight}
        setTerrainHeight={setTerrainHeight}
        spaceNeeded={spaceNeeded}
        setSpaceNeeded={setSpaceNeeded}
        spaceRatio={spaceRatio}
        setSpaceRatio={setSpaceRatio}
        />
      </Box>
    </div>
    
  );
}