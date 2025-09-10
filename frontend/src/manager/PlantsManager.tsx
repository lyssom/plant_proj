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
  name?: string;
  family?: string;
  genus?: string;
  latin_name?: string;
  lifecycle?: string;
  classification?: string;
  garden_type?: string;
  sunlight?: string;
  water_need?: string;
  cold_resistance?: string;
  self_sowing?: string;
  lodging_resistance?: string;
  crown_width_cm?: string;
  height_spring?: string;
  height_summer?: string;
  height_autumn?: string;
  height_winter?: string;
  ornamental_period?: string;
  flower_color?: string;
  flower_height_cm?: string;
  usage?: string;
  control_methods?: string;
  common_diseases?: string;
  pruning?: string;
  watering_frequency?: string;
  needs_support?: string;
  color?: string;
  model_config?: string;
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
            <Th color="white">植物分类</Th>
            <Th color="white">花园类型</Th>
            <Th color="white">操作</Th>
          </Tr>
        </Thead>
        <Tbody>
        {plants.map((plant, index) => (
            <>
            {/* 主行 */}
            <Tr key={plant.id}>
                <Td>{index+1}</Td>
                <Td>{plant.name}</Td>
                <Td>{plant.family}</Td>
                <Td>{plant.genus}</Td>
                <Td>{plant.latin_name}</Td>
                <Td>{plant.lifecycle}</Td>
                <Td>{plant.classification}</Td>
                <Td>{plant.garden_type}</Td>
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
                <Td colSpan={6} p={0} border="none">
                <Collapse in={openRow === plant.id} animateOpacity>
                <Box p={4} bg="gray.50" border="1px solid #eee">
                    <VStack align="start" spacing={3}>
                    <Box fontWeight="bold">生长特性</Box>
                    <Box>生命周期: {plant.lifecycle}</Box>
                    <Box>植物分类: {plant.classification}</Box>
                    <Box>花园类型: {plant.garden_type}</Box>
                    <Box>日照: {plant.sunlight}</Box>
                    <Box>需水量: {plant.water_need}</Box>
                    <Box>耐寒能力: {plant.cold_resistance}</Box>
                    <Box>自播能力: {plant.self_sowing}</Box>
                    <Box>抗倒伏情况: {plant.lodging_resistance}</Box>
                    <Box>冠幅(cm): {plant.crown_width_cm}</Box>
                    <Box>高度-春: {plant.height_spring}</Box>
                    <Box>高度-夏: {plant.height_summer}</Box>
                    <Box>高度-秋: {plant.height_autumn}</Box>
                    <Box>高度-冬: {plant.height_winter}</Box>
                    <Box>是否需要支架: {plant.needs_support}</Box>
                    <Box>浇水频率: {plant.watering_frequency}</Box>

                    <Box fontWeight="bold" mt={3}>观赏属性</Box>
                    <Box>观赏期: {plant.ornamental_period}</Box>
                    <Box>花朵颜色: {plant.flower_color}</Box>
                    <Box>花朵高度(cm): {plant.flower_height_cm}</Box>

                    <Box fontWeight="bold" mt={3}>防治管理</Box>
                    <Box>用途/特点: {plant.usage}</Box>
                    <Box>防治方法: {plant.control_methods}</Box>
                    <Box>常见病害: {plant.common_diseases}</Box>
                    <Box>修剪节点: {plant.pruning}</Box>

                    {plant.model_config && (
                        <>
                        <Box fontWeight="bold" mt={3}>模型配置</Box>
                        <Box>{plant.model_config}</Box>
                        </>
                    )}
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
            <FormControl mb={3}>
              <FormLabel>名称</FormLabel>
              <Input
                value={currentPlant?.name || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, name: e.target.value } : prev)}
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>科</FormLabel>
              <Input
                value={currentPlant?.family || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, family: e.target.value } : prev)}
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>属</FormLabel>
              <Input
                value={currentPlant?.genus || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, genus: e.target.value } : prev)}
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>拉丁名</FormLabel>
              <Input
                value={currentPlant?.latin_name || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, latin_name: e.target.value } : prev)}
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>生命周期</FormLabel>
              <Input
                value={currentPlant?.lifecycle || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, lifecycle: e.target.value } : prev)}
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>植物分类</FormLabel>
              <Textarea
                value={currentPlant?.classification || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, classification: e.target.value } : prev)}
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>花园类型</FormLabel>
              <Textarea
                value={currentPlant?.garden_type || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, garden_type: e.target.value } : prev)}
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>日照</FormLabel>
              <Textarea
                value={currentPlant?.sunlight || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, sunlight: e.target.value } : prev)}
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>需水量</FormLabel>
              <Textarea
                value={currentPlant?.water_need || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, water_need: e.target.value } : prev)}
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>耐寒能力</FormLabel>
              <Textarea
                value={currentPlant?.cold_resistance || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, cold_resistance: e.target.value } : prev)}
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>自播能力</FormLabel>
              <Textarea
                value={currentPlant?.self_sowing || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, self_sowing: e.target.value } : prev)}
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>抗倒伏情况</FormLabel>
              <Textarea
                value={currentPlant?.lodging_resistance || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, lodging_resistance: e.target.value } : prev)}
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>冠幅（cm）</FormLabel>
              <Textarea
                value={currentPlant?.crown_width_cm || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, crown_width_cm: e.target.value } : prev)}
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>植株高度-春</FormLabel>
              <Textarea
                value={currentPlant?.height_spring || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, height_spring: e.target.value } : prev)}
              />
            </FormControl>
                        <FormControl mb={3}>
              <FormLabel>植株高度-夏</FormLabel>
              <Textarea
                value={currentPlant?.height_summer || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, height_summer: e.target.value } : prev)}
              />
            </FormControl>
                        <FormControl mb={3}>
              <FormLabel>植株高度-秋</FormLabel>
              <Textarea
                value={currentPlant?.height_autumn || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, height_autumn: e.target.value } : prev)}
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>植株高度-冬</FormLabel>
              <Textarea
                value={currentPlant?.height_winter || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, height_winter: e.target.value } : prev)}
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>观赏期</FormLabel>
              <Input
                value={currentPlant?.ornamental_period || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, ornamental_period: e.target.value } : prev)}
              />
            </FormControl>
                        <FormControl mb={3}>
              <FormLabel>花朵颜色</FormLabel>
              <Input
                value={currentPlant?.flower_color || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, flower_color: e.target.value } : prev)}
              />
            </FormControl>
                        <FormControl mb={3}>
              <FormLabel>花朵高度（cm）</FormLabel>
              <Input
                value={currentPlant?.flower_height_cm || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, flower_height_cm: e.target.value } : prev)}
              />
            </FormControl>
                        <FormControl mb={3}>
              <FormLabel>用途/特点</FormLabel>
              <Input
                value={currentPlant?.usage || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, usage: e.target.value } : prev)}
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>防治方法</FormLabel>
              <Input
                value={currentPlant?.control_methods || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, control_methods: e.target.value } : prev)}
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>常见病害</FormLabel>
              <Input
                value={currentPlant?.common_diseases || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, common_diseases: e.target.value } : prev)}
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>修剪节点</FormLabel>
              <Input
                value={currentPlant?.pruning || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, pruning: e.target.value } : prev)}
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>浇水频率</FormLabel>
              <Input
                value={currentPlant?.watering_frequency || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, watering_frequency: e.target.value } : prev)}
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>是否需要支架</FormLabel>
              <Input
                value={currentPlant?.needs_support || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, needs_support: e.target.value } : prev)}
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>颜色</FormLabel>
              <Input
                value={currentPlant?.color || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, color: e.target.value } : prev)}
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>模型配置</FormLabel>
              <Input
                value={currentPlant?.model_config || ""}
                onChange={(e) => setCurrentPlant(prev => prev ? { ...prev, model_config: e.target.value } : prev)}
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="teal" mr={3} onClick={handleSave}>保存</Button>
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
