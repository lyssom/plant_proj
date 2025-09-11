// @ts-nocheck
import { useRef, useState, useEffect, useMemo, use } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import SunCalc from "suncalc";
import { Html } from "@react-three/drei";
import * as THREE from 'three';
import { ChevronRightIcon, MinusIcon } from '@chakra-ui/icons';
import { getLocationMsg, computePlantsData, getPlants, savePdf, getPlantDetail } from './api';
import { renderToStaticMarkup } from "react-dom/server";

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
  ModalFooter,
  Table,
  Thead,
  Flex,
  Tbody,
  Tr,
  Th,
  Td,
  Divider
} from "@chakra-ui/react";



const CELL_SIZE = 1;     
type Mode = "normal" | "water" | "wall" | "building" | "tree" | "terrain" | "flower" | "grass";


// 季节配置
const SEASONS = [
  { name: '春', value: 0, color: 'green.400' },
  { name: '夏', value: 1, color: 'yellow.400' },
  { name: '秋', value: 2, color: 'orange.400' },
  { name: '冬', value: 3, color: 'blue.400' }
];


type ColorState = boolean[][];

function ClickablePlane({
  onClick,
  cells,
  mode,
  terrainHeight,
  flowerPositions,
  setWallPositions
}: {
  onClick: (x: number, y: number) => void;
  cells: [number, number];
  mode: Mode;
  terrainHeight: number;
  flowerPositions: { x: number; y: number }[];
  setWallPositions: React.Dispatch<React.SetStateAction<{ x: number; y: number; rotation: number }[]>>
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

  function handleClickPosition(x: number, y: number, e: ThreeEvent<PointerEvent>) {
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
    if (selectedCell) {
      const [x, y] = selectedCell;
      const key = `${x}-${y}`;
      setCellHeights((prev) => ({
        ...prev,
        [key]: terrainHeight
      }));
    }
  }, [terrainHeight, selectedCell]);

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
              onClick={(e) => handleClickPosition(x, y, e)}
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
  plantsData: Plant[];
  setPlantsData: React.Dispatch<React.SetStateAction<Plant[]>>;
  PositionDatas: any[];
  setLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  handleScreenshot: () => void;
  wallOffset: string
  setWalloffset: React.Dispatch<React.SetStateAction<string>>;
  svgElement: JSX.Element;
  setSvgElement: React.Dispatch<React.SetStateAction<JSX.Element>>;
  setLatitude: React.Dispatch<React.SetStateAction<number>>;
  setLongitude: React.Dispatch<React.SetStateAction<number>>;
  province: string, setProvince: React.Dispatch<React.SetStateAction<string>>, city: string, setCity: React.Dispatch<React.SetStateAction<string>>
  style: string;
  setStyle: React.Dispatch<React.SetStateAction<string>>;
  viewSeason: string;
  setViewSeason: React.Dispatch<React.SetStateAction<string>>;
  selectedPlants: [];
  setSelectedPlants: React.Dispatch<React.SetStateAction<[]>>;
};


export function LocationSelect({province, setProvince, city, setCity, setLatitude, setLongitude}: {
  province: string, setProvince: React.Dispatch<React.SetStateAction<string>>, city: string, setCity: React.Dispatch<React.SetStateAction<string>>,
  setLatitude: React.Dispatch<React.SetStateAction<number>>, setLongitude: React.Dispatch<React.SetStateAction<number>>
}) {
  const [provinceTree, setProvinceTree] = useState([]);

  useEffect(() => {
    getLocationMsg().then((res) => {
      setProvinceTree(res.data.data);
    });
  }, []);



  useEffect(() => {

    const selectedCity = currentCities.find((c) => c.city === city) || [];
    setLatitude(selectedCity.lat);
    setLongitude(selectedCity.lng);
  }, [city]);

  const currentCities = provinceTree.find((p) => p.province === province)?.cities || [];


    

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


export function GardenDrawer({ 
  cells, setCells, mode, setMode, treeHeight, setTreeHeight, 
  treeWidth, setTreeWidth, terrainHeight, setTerrainHeight,
  spaceNeeded, setSpaceNeeded, spaceRatio, setSpaceRatio,
  plantsData, setPlantsData, PositionDatas, setLoaded,
  handleScreenshot, 
  wallOffset, setWallOffset, 
  svgElement, setSvgElement,
  setLatitude,setLongitude,
  province, setProvince, city, setCity,
  style, setStyle, viewSeason, setViewSeason, selectedPlants, setSelectedPlants
}: GardenDrawerProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [step, setStep] = useState(0);
  const [plantNames, setPlantNames] = useState([]);
  const [plantList, setPlantList] = useState<{name: string; count: number}[]>([]);


  const handleClose = () => {
    setStep(0);
    onClose();
  };

   useEffect(() => {
     getPlants().then((res) => {
      // const plantMsg = res.data.data.map((p: any) => ({name: p.name}));
      setPlantNames(res.data.data.map((p: any) => ({name: p.name})))
     });
   }, []);

  



  const toggleStyle = (value: string) => {
    setSelectedPlants((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const MODE_MAP: Record<string, string> = {
    normal: "铺装",
    wall: "墙",
    building: "建筑",
    water: "水面",
    tree: "乔木",
    terrain: "地形",
  };


  // const plantList = [
  //   { name: "芒草", count: 3 },
  //   { name: "菊花", count: 5 },
  //   { name: "月季", count: 2 },
  // ];



  useEffect(() => {
    const list = Object.values(
      plantsData.reduce((acc, item) => {
        const name = item.plant.name;

        if (!acc[name]) {
          acc[name] = { name, count: 0 };
        }
        acc[name].count += 1;
        return acc;
      }, {} as Record<string, { name: string; count: number }>)
    );
    setPlantList(list);
  }, [plantsData]);

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
              <LocationSelect province={province} setProvince={setProvince} city={city} setCity={setCity} setLatitude={setLatitude} setLongitude={setLongitude}/>
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
                      正在设置: {MODE_MAP[mode] || mode}
                    </Text>
                    {mode === "wall" && (
                      <HStack spacing={4} alignItems="center">
                        <Button
                          colorScheme={wallOffset === "top" ? "blue" : "gray"}
                          onClick={() => setWallOffset("top")}
                        >
                          上
                        </Button>
                        <Button
                          colorScheme={wallOffset === "bottom" ? "blue" : "gray"}
                          onClick={() => setWallOffset("bottom")}
                        >
                          下
                        </Button>
                        <Button
                          colorScheme={wallOffset === "left" ? "blue" : "gray"}
                          onClick={() => setWallOffset("left")}
                        >
                          左
                        </Button>
                        <Button
                          colorScheme={wallOffset === "right" ? "blue" : "gray"}
                          onClick={() => setWallOffset("right")}
                        >
                          右
                        </Button>

                      </HStack>
                    )}
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
            <Stack spacing={6} divider={<Divider />}> 
              
              {/* 花园风格 */}
              <Box>
                <FormLabel fontSize="lg" fontWeight="bold" mb={2}>
                  花园的风格
                </FormLabel>
                <Select
                  placeholder="请选择花园风格"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  width="100%"
                >
                  <option value="none">无明确风格</option>
                  <option value="meadow">混合草甸</option>
                  <option value="insectFriendly">昆虫友好花园</option>
                  <option value="rainGarden">雨水花园</option>
                  <option value="children">儿童花园</option>
                  <option value="healing">疗愈花园</option>
                  <option value="rock">岩石花园</option>
                  <option value="edible">可食花园</option>
                </Select>
              </Box>

              {/* 植物偏好 */}
              <Box>
                <FormLabel fontSize="lg" fontWeight="bold" mb={2}>
                  花园的植物偏好
                </FormLabel>
                <Menu closeOnSelect={false}>
                  <MenuButton as={Button} w="100%" textAlign="left" whiteSpace="normal"  wordBreak="break-word" 
                  h="auto" minH="40px" py={2}>
                    {selectedPlants.length > 0
                      ? selectedPlants.map((v) => plantNames.find((o) => o.name === v)?.name).join(", ")
                      : "请选择植物"}
                  </MenuButton>
                  <MenuList maxH="200px" overflowY="auto">
                    <Box p={2} border="1px solid" borderColor="gray.200" rounded="md">
                      <Stack spacing={2}>
                        {plantNames.map((option) => (
                          <Checkbox
                            key={option.name}
                            isChecked={selectedPlants.includes(option.name)}
                            onChange={() => toggleStyle(option.name)}
                          >
                            {option.name}
                          </Checkbox>
                        ))}
                      </Stack>
                    </Box>
                  </MenuList>
                </Menu>
              </Box>

              {/* 主要观赏季节 */}
              <Box>
                <FormLabel fontSize="lg" fontWeight="bold" mb={2}>
                  花园的主要观赏季节
                </FormLabel>
                <Select
                  placeholder="请选择花园的主要观赏季节"
                  value={viewSeason}
                  onChange={(e) => setViewSeason(e.target.value)}
                  width="100%"
                >
                  <option value="none">无</option>
                  <option value="spring">春</option>
                  <option value="summer">夏</option>
                  <option value="autumn">秋</option>
                  <option value="winter">冬</option>
                </Select>
              </Box>

            </Stack>
          </FormControl>
        )}


            {step === 4 && (
              <FormControl>
                <Box mt={4}>
                  <Text fontWeight="bold" mb={2}>种植清单</Text>
                  <Table size="sm" variant="simple">
                    <Thead>
                      <Tr>
                        <Th>植物名称</Th>
                        <Th>数量</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {plantList.map((plant, idx) => (
                        <Tr key={idx}>
                          <Td>{plant.name}</Td>
                          <Td>{plant.count}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
                <Button>购买植物</Button>
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
              <GardenModal 
              plantsData={plantsData} setPlantsData={setPlantsData} PositionDatas={PositionDatas} 
              cells={cells} setLoaded={setLoaded} svgElement={svgElement} setSvgElement={setSvgElement}/>
              <Button colorScheme="blue" ml={3} onClick={() => setStep(4)}>
                下一步
              </Button>
              </>
            )}
            {step === 4 && (
              <>
                <Button variant="ghost" mr={3} onClick={() => setStep(3)}>
                  上一步
                </Button>
                <Button mr={3} onClick={() => handleScreenshot(plantList)}>导出</Button><br />
                <Button colorScheme="blue" onClick={() => onClose()}>
                  完成
                </Button>
              </>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}

// function Object3DModel({ Reasource, name, position, upAxis, target }: {Reasource: string, name: string, position: [number, number, number], upAxis: string, target: number }) {
//   const [obj, setObj] = useState<THREE.Object3D | null>(null);
//   const ref = useRef<THREE.Object3D>(null!);

//   useEffect(() => {
//     const mtlLoader = new MTLLoader();
//     mtlLoader.setResourcePath(Reasource);
//     mtlLoader.setPath(Reasource);
//     mtlLoader.load(`${name}.mtl`, (materials) => {
//       materials.preload();
//       const objLoader = new OBJLoader();
//       objLoader.setMaterials(materials);
//       objLoader.setPath(Reasource);
//       objLoader.load(`${name}.obj`, (loaded) => {
//         loaded.traverse((child: any) => {
//           if (child.isMesh) {
//             child.material.side = THREE.DoubleSide;
//             child.material.needsUpdate = true;
//             child.castShadow = true;
//             child.receiveShadow = true;
//           }
//         });

//         if (upAxis === 'z') {
//           loaded.rotation.x = Math.PI / 2;
//         } else if (upAxis === 'x') {
//           loaded.rotation.x = Math.PI / 2;
//         } else if (upAxis === 'y') {
//           loaded.rotation.y = Math.PI / 2;
//         } else if (upAxis === '-z') {
//           loaded.rotation.x = -Math.PI / 2;
//         } else if (upAxis === '-x') {
//           loaded.rotation.x = -Math.PI / 2;
//         } else if (upAxis === '-y') {
//           loaded.rotation.y = -Math.PI / 2;
//         }
//         setObj(loaded);
//       });
//     });
//   }, []);

//   useFrame(() => {
//     if (ref.current) {
//       ref.current.scale.x = Math.min(ref.current.scale.x + 0.01, target);
//       ref.current.scale.y = Math.min(ref.current.scale.y + 0.01, target);
//       ref.current.scale.z = Math.min(ref.current.scale.z + 0.01, target);
//     }
//   });

//   if (!obj) return null;

//   return (
//     <primitive
//       ref={ref}
//       object={obj}
//       position={position}
//       scale={[0, 0, 0]}        
//     />
//   );
// }


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
    <Html>
      <Box
        p={5}
        bg="white"
        borderRadius="2xl"
        border="2px solid"
        borderColor="green.400"
        boxShadow="lg"
        minW="800px"
        maxW="800px"
        maxH="400px"         // 限制最大高度
        overflowY="auto"     // 内容超过时出现滚动条
        textAlign="left"
        position="relative"
      >
        <Stack spacing={3}>
          <Button
            size="xs"
            alignSelf="flex-end"
            onClick={onClose}
            variant="outline"
            colorScheme="green"
            borderRadius="full"
          >
            关闭
          </Button>

          <Text fontSize="lg" fontWeight="bold" color="green.600">
            {plantName}
          </Text>

          <Text fontSize="sm" color="gray.600" whiteSpace="pre-wrap">
            {plantDetails || "🌱 智能生成植物详细信息中…"}
          </Text>
        </Stack>
      </Box>

    </Html>
  );
};


function ObjectGLBModel({
  Reasource,
  name,
  position,
  upAxis,
  target,
  latinName,
  zhName,
  plant
}: {
  Reasource: string;
  name: string;
  position: [number, number, number];
  upAxis: string;
  target: [number, number, number];
  latinName: string;
  zhName: string;
  plant: any;
}) {
  const [obj, setObj] = useState<THREE.Object3D | null>(null);
  const ref = useRef<THREE.Object3D>(null!);
  const [hovered, setHovered] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const hideTimer = useRef<number>();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [modelSize, setModelSize] = useState<THREE.Vector3>(new THREE.Vector3(1, 1, 1));
  const [modalOpen, setModalOpen] = useState(false);

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
      if (upAxis === "z" || upAxis === "x") model.rotation.x = Math.PI / 2;
      else if (upAxis === "y") model.rotation.y = Math.PI / 2;
      else if (upAxis === "-z" || upAxis === "-x") model.rotation.x = -Math.PI / 2;
      else if (upAxis === "-y") model.rotation.y = -Math.PI / 2;

      const box = new THREE.Box3().setFromObject(model);
      model.position.y -= box.min.y; // 底部贴到 y=0
      
      // 获取模型尺寸用于定位悬浮框
      const size = new THREE.Vector3();
      box.getSize(size);
      setModelSize(size);

      setObj(model);
    });
  }, [Reasource, name, upAxis]);

  useFrame(() => {
    if (ref.current) {
      ref.current.scale.x = Math.min(ref.current.scale.x + 0.01, target[0]);
      ref.current.scale.y = Math.min(ref.current.scale.y + 0.01, target[1]);
      ref.current.scale.z = Math.min(ref.current.scale.z + 0.01, target[2]);
    }
  });

  const handleMoreInfo = (plant: any, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(66666666666666);
    setModalOpen(true);
//     alert(`
// 名称: ${plant.name}
// 拉丁名: ${plant.latin_name}
// 科: ${plant.family}
// 属: ${plant.genus}
// 颜色: ${plant.color}
//     `);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setHovered(true);
    setTooltipVisible(true);
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    // 只有当鼠标离开整个group时才隐藏
    if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget)) {
      hideTimer.current = window.setTimeout(() => {
        setHovered(false);
        setTooltipVisible(false);
      }, 400);
    }
  };

  const handleTooltipClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 阻止tooltip点击事件触发pointerout
    if (hideTimer.current) clearTimeout(hideTimer.current);
  };

  if (!obj) return null;

  return (
    <group onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
      <primitive ref={ref} object={obj} position={position} scale={[1, 1, 1]} />
      {hovered && (
        <Html
          distanceFactor={10}
          style={{ 
            pointerEvents: 'auto',
            transform: 'translate(-50%, -100%)', // 居中并上移
            marginTop: '-10px' // 额外上移一些
          }}
          position={[position[0], position[1] + modelSize.y / 2 + 0.5, position[2]]} // 在模型上方
          onClick={handleTooltipClick}
          ref={tooltipRef}
        >
          <div
            style={{
              background: 'white',
              color: '#2D3748',
              padding: '16px',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              pointerEvents: 'auto',
              zIndex: 1000,
              minWidth: '220px',
              border: '1px solid #E2E8F0',
              fontFamily: 'system-ui, sans-serif'
            }}
          >
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', lineHeight: '1.4' }}>
              <b style={{ color: '#2D3748' }}>名称：</b>
              <span style={{ color: '#4A5568' }}>{zhName}</span>
            </p>
            <p style={{ margin: '0 0 12px 0', fontSize: '14px', lineHeight: '1.4' }}>
              <b style={{ color: '#2D3748' }}>拉丁名：</b>
              <span style={{ color: '#4A5568', fontStyle: 'italic' }}>{latinName}</span>
            </p>
            <button
              style={{
                fontSize: '12px',
                marginTop: '8px',
                padding: '8px 16px',
                backgroundColor: '#3182CE',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                width: '100%',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.stopPropagation()}
              onClick={(e) => handleMoreInfo(plant, e)}
              onMouseEnter={() => {
                if (hideTimer.current) clearTimeout(hideTimer.current);
              }}
              onMouseLeave={() => {
                hideTimer.current = window.setTimeout(() => {
                  setHovered(false);
                  setTooltipVisible(false);
                }, 400);
              }}
            >
              获取更多信息
            </button>
            
            {/* 小箭头指示器 */}
            <div style={{
              position: 'absolute',
              bottom: '-8px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '0',
              height: '0',
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid white'
            }} />
          </div>
        </Html>
      )}
      <PlantModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        plantName={zhName}
      />
    </group>
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

interface WallTileProps {
  position: [number, number, number];
  rotation: [number, number, number]; // 可选的旋转参数
}
export function WallTile({ position, rotation }: WallTileProps) {
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
      <boxGeometry args={[1, 2, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}


function DirectionalSun({ latitude, longitude, date }) {
  const lightRef = useRef<THREE.DirectionalLight>(null!);

  useFrame(() => {
    if (!lightRef.current) return;


    const pos = SunCalc.getPosition(date, latitude, longitude);
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

// const plantData: Plant[] = [
//   { position: { x: 0, y:0 }, type: "针芒", color: "#6BAF92" },
//   { position: { x: 1, y:0}, type: "鼠尾草", color: "#A88ED0" },
//   { position: { x: 2, y:1}, type: "落新妇", color: "#F3A6B0" },
//   { position: { x: 3, y:2}, type: "松果菊", color: "#E58B4A" },
//   { position: { x: 4, y:1}, type: "薰衣草", color: "#9A66CC" },
// ];

export function GardenModal(
  {plantsData, setPlantsData, PositionDatas, cells, setLoaded, svgElement,setSvgElement}: 
  {
    plantsData: Plant[], 
    setPlantsData: React.Dispatch<React.SetStateAction<Plant[]>>, 
    PositionDatas: any[], 
    cells: [number, number], 
    setLoaded: React.Dispatch<React.SetStateAction<boolean>>,
    svgElement: JSX.Element
    setSvgElement: React.Dispatch<React.SetStateAction<JSX.Element>>,
  }
) {
  const { isOpen, onOpen, onClose } = useDisclosure();


  const cellSize = 60; // 每个格子大小
  const radius = 25; // 圆的半径

  const handleOpen = async () => {
    try {
      // const data = {}
      const res = await computePlantsData(PositionDatas);
      setPlantsData(res.data.data);
    } catch (err) {
      console.error("计算出错:", err);
    }

    // 再打开 Drawer/Menu
    onOpen();
  };


  const zoneList = Array.from(
    new Map(
      plantsData.map(p => [p.color, { color: p.color, name: p.type || p.color }])
    ).values()
  );

  // 生成植物类型图例
  const plantTypeList = Array.from(
    new Map(
      plantsData.map(p => [p.plant.name, { name: p.plant.name, color: p.plant.color }])
    ).values()
  );


  
  function handleLoadGarden() {
    setLoaded(true);
    onClose()
  }


  useEffect(() => {
    setSvgElement(
      <svg
        width={600}
        height={600}
        style={{ border: "1px solid #ccc", background: "#fdfdfd" }}
      >
        {/* 绘制格子 */}
        {Array.from({ length: cells[0] }).map((_, i) =>
          Array.from({ length: cells[1] }).map((_, j) => (
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
        {plantsData.map((plant, idx) => {
          const x = plant.position.x * cellSize;
          const y = plant.position.y * cellSize;

          return (
            <g key={idx}>
              {/* 背景格子，只显示分区颜色 */}
              <rect
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                fill={plant.color || "#eee"} // 分区颜色
                opacity={0.3} // 半透明
              />
              {/* 圆，显示植物颜色 */}
              <circle
                cx={x + cellSize / 2}
                cy={y + cellSize / 2}
                r={radius}
                fill={plant.plant.color}
                opacity={0.7}
              />
              {/* 文字 */}
              <text
                x={x + cellSize / 2}
                y={y + cellSize / 2 + 5}
                fontSize="12"
                textAnchor="middle"
                fill="#000"
                dominantBaseline="middle"
              >
                {plant.plant.name}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }, [plantsData]);

  return (
    <>
      <Button colorScheme="teal" onClick={handleOpen}>
        查看花园布局
      </Button>

      <Modal isOpen={isOpen} onClose={onClose} size="4xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>花园二维平面图</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Flex>
              <Box>
                {svgElement}
              </Box>
              {/* 右侧图例 */}
        <Box ml={4}>
          <Text fontWeight="bold" mb={2}>图例</Text>
          {/* 假设有几个分区类型 */}
          {zoneList.map((zone) => (
            <Flex key={zone.name} align="center" mb={1}>
              <Box
                width="20px"
                height="20px"
                bg={zone.color}
                opacity={0.3}
                mr={2}
              />
              <Text>{zone.name}</Text>
            </Flex>
          ))}

          {/* 植物颜色示意 */}
          <Text fontWeight="bold" mt={4} mb={2}>植物颜色</Text>
          {plantTypeList.map((plantType) => (
            <Flex key={plantType.name} align="center" mb={1}>
              <Box
                width="20px"
                height="20px"
                bg={plantType.color}
                opacity={0.7}
                mr={2}
                borderRadius="50%"
              />
              <Text>{plantType.name}</Text>
            </Flex>
          ))}

        </Box>
        </Flex>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="teal" 
          onClick={handleLoadGarden}
          >
            加载花园
          </Button>
        </ModalFooter>

        </ModalContent>
      </Modal>
    </>
  );
}



// ======= 主页面（含Canvas） =======
export function GardenPage() {
  const [objectPositions, setObjectPositions] = useState<{x: number; y: number}[]>([]);
  const [season, setSeason] = useState(0); // 0:春, 1:夏, 2:秋, 3:冬
  const [isPlaying, setIsPlaying] = useState(false);
  // const [renderModels, setRenderModels] = useState(false); // 是否点击按钮开始渲染
  // const [modelConfig, setModelConfig] = useState<any[]>([]);
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

  const [latitude, setLatitude] = useState(30.59);
  const [longitude, setLongitude] = useState(114.30);
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [date, setDate] = useState(new Date());

  const [cells, setCells] = useState<[number, number]>([10, 10]);
  const [spaceNeeded, setSpaceNeeded] = useState(false);
  const [spaceRatio, setSpaceRatio] = useState(30);
  const [flowerPositions, setFlowerPositions] = useState<{x: number; y: number}[]>([]);

  const [plantsData, setPlantsData] = useState<Plant[]>([]);
  const [loaded, setLoaded] = useState(false);

  type WallOffset = "top" | "bottom" | "left" | "right";
  const [wallOffset, setWallOffset] = useState<WallOffset>("top");

  const [svgElement, setSvgElement] = useState<JSX.Element | null>(null);

  const [style, setStyle] = useState("");
  const [viewSeason, setViewSeason] = useState("");
  const [selectedPlants, setSelectedPlants] = useState<string[]>([]);


  const HALF_X = (cells[0] * CELL_SIZE) / 2;
  const HALF_Y = (cells[1] * CELL_SIZE) / 2;
  const GROUP_OFFSET: [number, number, number] = [
    -5,  
    0,
   -5
  ];

  const canvasRef = useRef<HTMLCanvasElement>(null);

  function svgToPng(svgElement: SVGSVGElement, width = 600, height = 600): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const svgrand = renderToStaticMarkup(
          <svg width={600} height={600} xmlns="http://www.w3.org/2000/svg">
            {svgElement}
          </svg>
        )
        // 转成 DOM 节点
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgrand, "image/svg+xml");
        const svgNode = doc.documentElement;

        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgNode);
        const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else reject(new Error("转换失败"));
            }, "image/png");
          }
          URL.revokeObjectURL(url);
        };
        img.onerror = (err) => {
          console.error("SVG 转 PNG 加载失败", err, svgString);
          reject(new Error("SVG 转 PNG 加载失败"));
        };
        img.src = url;
      } catch (err) {
        reject(err);
      }
    });
  }

  function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // 只取 base64 部分
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}


  const handleScreenshot = async (plantList: {name: string; count: number}[]) => {
    if (!canvasRef.current) return;

    const payloads = [];

    for (const s of SEASONS.map(s => s.value)) {
      setSeason(s);
      // const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      // await sleep(10000);

      // const dataURL = canvasRef.current.toDataURL("image/png");
      // const payload = { filename: `${season}.png`, data: dataURL.split(",")[1] };
      // payloads.push(payload);
      // 
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      await sleep(2000);

      const dataURL = canvasRef.current.toDataURL("image/png");
      const payload = { filename: `${s}.png`, data: dataURL.split(",")[1] };
      payloads.push(payload);
    }


    const pngBlob = await svgToPng(svgElement, 600, 600);
    const base64Data = await blobToBase64(pngBlob);

    payloads.push({ filename: `garden.png`, data: base64Data });

    const all_payloads = {"images": payloads, "plantlist": plantList};

    const response = await savePdf(all_payloads);
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = "seasons.pdf";
    link.click();
  };


  const handleCellClick = (x: number, y: number) => {
    if (mode === "normal") {
      setObjectPositions(prev => [...prev, {x, y}]);
    } else if (mode === "water") {
      setWaterPositions(prev => [...prev, {x, y}]);
    } else if (mode === "wall") {
      let rotation = 0;

      let wallX = 0;
      let wallZ = 0;

      switch (wallOffset) {
        case "left":
          wallX = x- 0.5;          // 左边界
          wallZ = y;    // 垂直居中
          rotation = Math.PI / 2;
          break;
        case "right":
          wallX = x + 0.5;      // 右边界
          wallZ = y;
          rotation = Math.PI / 2;
          break;
        case "top":
          wallX = x;
          wallZ = y -0.5;      // 上边界
          rotation = 0;
          break;
        case "bottom":
          wallX = x ;
          wallZ = y + 0.5;          // 下边界
          rotation = 0;
          break;
      }

      setWallPositions(prev => [
      ...prev,
      { x: wallX, y: wallZ, rotation: rotation }
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
        return prev; 
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

    const targetCount = Math.floor(available.length * (100-spaceRatio)/100);
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, targetCount);

    if (spaceNeeded) {
      setFlowerPositions(selected);
    }

    // setFlowerPositions(selected);
  }, [cells, spaceRatio, spaceNeeded]);

  const PositionDatas = {
    "flowerPositions":flowerPositions,
    "waterPositions": waterPositions,
    "buildingPositions": buildingPositions,
    "wallPositions": wallPositions,
    "treePositions": treePositions,
    "objectPositions": objectPositions,
    "property": {
      "style": style,
      "viewSeason": viewSeason,
      "selectedPlants": selectedPlants,
      "lat": latitude,
    }
  }

  const rows = cells[0];
  const cols = cells[1];

  const offsetX = cols % 2 === 0 ? CELL_SIZE / 2 : 1;
  const offsetY = rows % 2 === 0 ? CELL_SIZE / 2 : 0;


  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas ref={canvasRef} camera={{ position: [10, 10, 10], fov: 50 }} shadows style={{ width: '100%', height: '100%' }} gl={{ preserveDrawingBuffer: true }}>
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
          position={[HALF_X - offsetY, 0.02, HALF_Y - offsetX]}
          // position={[HALF_X, 0.02, HALF_Y]}
        />
        <ClickablePlane onClick={handleCellClick} cells={cells} mode={mode} terrainHeight={terrainHeight} flowerPositions={flowerPositions} setWallPositions={setWallPositions}/>

        {loaded &&
          plantsData.map((plantCfg, i) => {
            const latinName = plantCfg.plant?.latin_name ?? ""; // 获取 latin_name
            return (
              <group key={`group-${i}`}>
                {plantCfg.models
                  .filter((seasonCfg) => seasonCfg.season === season)
                  .map((seasonCfg, si) => (
                    <group key={`${plantCfg.plant.id}-group-${i}-${si}`}>
                      {seasonCfg.models.map((m, j) => (
                        <ObjectGLBModel
                          key={`${seasonCfg.keyPrefix}-${j}-${i}`}
                          Reasource={m.resource}
                          name={m.name}
                          latinName={latinName} // 传入 latin_name
                          zhName={plantCfg.plant.name}
                          position={[
                            plantCfg.position.x * CELL_SIZE + (m.offset?.[0] ?? 0),
                            (m.offset?.[1] ?? 0),
                            plantCfg.position.y * CELL_SIZE + (m.offset?.[2] ?? 0),
                          ]}
                          upAxis={m.upAxis}
                          target={[m.target, m.target, m.target]}
                        />
                      ))}
                    </group>
                  ))}
              </group>
            );
          })}

          

          {waterPositions.map(({x, y}, i) => (
            <WaterTile key={`water-${i}`} position={[x * CELL_SIZE, 0, y * CELL_SIZE]} />
          ))}

         {wallPositions.map((wall, i) => (
            <WallTile
              key={`wall-${i}`}
              position={[wall.x * CELL_SIZE, 0.5, wall.y * CELL_SIZE]}
              rotation={[0, wall.rotation, 0]}
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

        {/* <ScreenshotButton /> */}

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
        plantsData={plantsData}
        setPlantsData={setPlantsData}
        PositionDatas={PositionDatas}
        setLoaded={setLoaded}
        handleScreenshot = {handleScreenshot}
        wallOffset={wallOffset}
        setWallOffset={setWallOffset}
        svgElement = {svgElement}
        setSvgElement={setSvgElement}
        setLatitude={setLatitude}
        setLongitude={setLongitude}
        province={province}
        setProvince={setProvince}
        city={city}
        setCity={setCity}
        style={style}
        setStyle={setStyle}
        viewSeason={viewSeason}
        setViewSeason={setViewSeason}
        selectedPlants={selectedPlants}
        setSelectedPlants={setSelectedPlants}
        />
      </Box>
    </div>
    
  );
}