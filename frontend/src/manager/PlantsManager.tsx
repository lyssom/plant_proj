import { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Collapse,
  VStack,
} from "@chakra-ui/react";

import { getPlants, createPlant, updatePlant, deletePlant } from "../api";

interface Plant {
  id: number;
  name?: string;                        // 植物名称
  family?: string;                      // 科
  genus?: string;                       // 属
  latin_name?: string;                  // 拉丁名
  lifecycle?: string;                   // 生命周期
  classification?: string;              // 植物分类
  crown_width?: string;                 // 冠幅
  sunlight?: string;                    // 日照
  water_need?: string;                  // 需水量
  self_sowing?: string;                 // 自播能力
  lodging_resistance?: string;          // 抗倒伏情况
  color?: string;                       // 色系
  usage?: string;                       // 用途/特点
  control_methods?: string;             // 防治方法
  common_diseases?: string;             // 常见病害
  pruning?: string;                     // 修剪节点
  watering_frequency?: string;          // 浇水频率
  needs_support?: string;               // 是否需要支架
  hard_zone?: string;                   // 耐寒分区
  rock?: string;                        // 岩石园
  insect?: string;                      // 昆虫友好花园
  edible?: string;                      // 可食花园
  meadow?: string;                      // 混合草甸花园
  rain_garden?: string;                 // 雨水花园
  healing?: string;                     // 疗愈花园
  scent_garden?: string;                // 芳香花园
  normal_garden?: string;               // 零维护花园
  model_path?: string;                  // 模型路径
  show_type?: string;                   // 展示类型
}

export default function PlantsManager() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [currentPlant, setCurrentPlant] = useState<Plant | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [openRow, setOpenRow] = useState<number | null>(null);

  const toggleRow = (id: number) => {
    setOpenRow(openRow === id ? null : id);
  };

  const { isOpen, onOpen, onClose } = useDisclosure(); // Modal
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure(); // 删除确认

  const cancelRef = useRef<HTMLButtonElement>(null);
  const [deletePlantId, setDeletePlantId] = useState<number | null>(null);

  // 获取植物列表
  useEffect(() => {
    getPlants().then((res) => setPlants(res.data.data));
  }, []);

  // 新增
  const handleAdd = () => {
    setIsEditing(false);
    setCurrentPlant({ id: Date.now() });
    onOpen();
  };

  // 编辑
  const handleEdit = (plant: Plant) => {
    setIsEditing(true);
    setCurrentPlant({ ...plant });
    onOpen();
  };

  // 保存
  const handleSave = async () => {
    if (!currentPlant) return;
    if (isEditing) {
      await updatePlant(currentPlant);
    //   setPlants(plants.map((p) => (p.id === currentPlant.id ? currentPlant : p)));
    } else {
      await createPlant(currentPlant);
    //   setPlants([...plants, res.data]);
    }
    getPlants().then((res) => setPlants(res.data.data));
    onClose();
  };

  // 删除
  const handleDelete = (id: number) => {
    setDeletePlantId(id);
    onDeleteOpen();
  };

  const confirmDelete = async () => {
    if (deletePlantId !== null) {
      const payload = { id: deletePlantId };
      await deletePlant(payload);
      setPlants(plants.filter((p) => p.id !== deletePlantId));
    }
    onDeleteClose();
  };

  return (
    <Box p={6}>
      <Flex mb={4} justify="space-between">
        <Box fontSize="xl" fontWeight="bold">植物管理</Box>
        <Button colorScheme="teal" onClick={handleAdd}>新增植物</Button>
      </Flex>

      <Box overflowX="auto">
        <Table variant="simple" minW="800px">
          <Thead bg="gray.700">
            <Tr>
              <Th color="white">ID</Th>
              <Th color="white">植物名称</Th>
              <Th color="white">科</Th>
              <Th color="white">属</Th>
              <Th color="white">拉丁名</Th>
              <Th color="white">生命周期</Th>
              <Th color="white">展示类型</Th>
              <Th color="white">操作</Th>
            </Tr>
          </Thead>
          <Tbody>
            {plants.map((plant, index) => (
              <>
                {/* 主行 */}
                <Tr key={plant.id}>
                  <Td>{index + 1}</Td>
                  <Td>{plant.name}</Td>
                  <Td>{plant.family}</Td>
                  <Td>{plant.genus}</Td>
                  <Td>{plant.latin_name}</Td>
                  <Td>{plant.lifecycle}</Td>
                  <Td>{plant.show_type}</Td>
                  <Td>
                    <Button size="sm" mr={2} onClick={() => toggleRow(plant.id)}>
                      {openRow === plant.id ? "收起" : "详情"}
                    </Button>
                    <Button size="sm" colorScheme="blue" mr={2} onClick={() => handleEdit(plant)}>编辑</Button>
                    <Button size="sm" colorScheme="red" onClick={() => handleDelete(plant.id)}>删除</Button>
                  </Td>
                </Tr>

                {/* 折叠行 */}
                <Tr>
                  <Td colSpan={9} p={0} border="none">
                    <Collapse in={openRow === plant.id} animateOpacity>
                      <Box p={4} bg="gray.50" border="1px solid #eee">
                        <VStack align="start" spacing={3}>
                          <Box fontWeight="bold">生长特性</Box>
                          <Box>生命周期: {plant.lifecycle}</Box>
                          <Box>植物分类: {plant.classification}</Box>
                          <Box>
                          <Box fontWeight="bold">花园类型</Box>
                          <VStack align="start" spacing={1}>
                            {[
                              { label: "岩石园", value: plant.rock },
                              { label: "昆虫友好花园", value: plant.insect },
                              { label: "可食花园", value: plant.edible },
                              { label: "混合草甸花园", value: plant.meadow },
                              { label: "雨水花园", value: plant.rain_garden },
                              { label: "疗愈花园", value: plant.healing },
                              { label: "芳香花园", value: plant.scent_garden },
                              { label: "零维护花园", value: plant.normal_garden },
                            ]
                              .filter((item) => item.value)
                              .map((item) => (
                                <Box key={item.label} px={2} py={1} bg="gray.100" borderRadius="md">
                                  {item.label}: {item.value}
                                </Box>
                              ))}
                          </VStack>
                        </Box>
                          <Box>日照: {plant.sunlight}</Box>
                          <Box>需水量: {plant.water_need}</Box>
                          <Box>耐寒分区: {plant.hard_zone}</Box>
                          <Box>自播能力: {plant.self_sowing}</Box>
                          <Box>抗倒伏情况: {plant.lodging_resistance}</Box>
                          <Box>冠幅: {plant.crown_width}</Box>
                          <Box>是否需要支架: {plant.needs_support}</Box>
                          <Box>浇水频率: {plant.watering_frequency}</Box>

                          <Box fontWeight="bold" mt={3}>防治管理</Box>
                          <Box>用途/特点: {plant.usage}</Box>
                          <Box>防治方法: {plant.control_methods}</Box>
                          <Box>常见病害: {plant.common_diseases}</Box>
                          <Box>修剪节点: {plant.pruning}</Box>
                          <Box fontWeight="bold" mt={3}>模型</Box>
                          <Box>模型路径: {plant.model_path}</Box>
                          <Box>色系: {plant.color}</Box>
                        </VStack>
                      </Box>
                    </Collapse>
                  </Td>
                </Tr>
              </>
            ))}
          </Tbody>
        </Table>
      </Box>



    {/* 新增/编辑 Modal */}
    <Modal isOpen={isOpen} onClose={onClose} size="4xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{isEditing ? "编辑植物" : "新增植物"}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {[
            { label: "名称", key: "name", type: "input" },
            { label: "科", key: "family", type: "input" },
            { label: "属", key: "genus", type: "input" },
            { label: "拉丁名", key: "latin_name", type: "input" },
            { label: "生命周期", key: "lifecycle", type: "input" },
            { label: "植物分类", key: "classification", type: "textarea" },
            { label: "日照", key: "sunlight", type: "textarea" },
            { label: "需水量", key: "water_need", type: "textarea" },
            { label: "耐寒分区", key: "hard_zone", type: "textarea" },
            { label: "自播能力", key: "self_sowing", type: "textarea" },
            { label: "抗倒伏情况", key: "lodging_resistance", type: "textarea" },
            { label: "冠幅", key: "crown_width", type: "textarea" },
            { label: "是否需要支架", key: "needs_support", type: "textarea" },
            { label: "浇水频率", key: "watering_frequency", type: "input" },
            { label: "颜色", key: "color", type: "input" },
            { label: "用途/特点", key: "usage", type: "textarea" },
            { label: "防治方法", key: "control_methods", type: "textarea" },
            { label: "常见病害", key: "common_diseases", type: "textarea" },
            { label: "修剪节点", key: "pruning", type: "input" },
            { label: "岩石园", key: "rock", type: "input" },
            { label: "昆虫友好花园", key: "insect", type: "input" },
            { label: "可食花园", key: "edible", type: "input" },
            { label: "混合草甸花园", key: "meadow", type: "input" },
            { label: "雨水花园", key: "rain_garden", type: "input" },
            { label: "疗愈花园", key: "healing", type: "input" },
            { label: "芳香花园", key: "scent_garden", type: "input" },
            { label: "零维护花园", key: "normal_garden", type: "input" },
            { label: "展示类型", key: "show_type", type: "textarea" },
            { label: "模型路径", key: "model_path", type: "textarea" },
          ].map((field) => (
            <FormControl key={field.key} mb={3}>
              <FormLabel>{field.label}</FormLabel>
              {field.type === "input" ? (
                <Input
                  value={currentPlant?.[field.key] || ""}
                  onChange={(e) =>
                    setCurrentPlant((prev) =>
                      prev ? { ...prev, [field.key]: e.target.value } : prev
                    )
                  }
                />
              ) : (
                <Textarea
                  value={currentPlant?.[field.key] || ""}
                  onChange={(e) =>
                    setCurrentPlant((prev) =>
                      prev ? { ...prev, [field.key]: e.target.value } : prev
                    )
                  }
                />
              )}
            </FormControl>
          ))}
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="teal" mr={3} onClick={handleSave}>
            保存
          </Button>
          <Button onClick={onClose}>取消</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>


      {/* 删除确认 */}
      <AlertDialog isOpen={isDeleteOpen} leastDestructiveRef={cancelRef} onClose={onDeleteClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>确认删除</AlertDialogHeader>
            <AlertDialogBody>确定要删除该植物吗？</AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>取消</Button>
              <Button colorScheme="red" ml={3} onClick={confirmDelete}>删除</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
