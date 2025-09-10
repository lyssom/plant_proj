import { useState, useEffect } from "react";
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
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from "@chakra-ui/react";

import { getReserves, deleteReserve } from "../api";

interface Reserve {
  id: number;
  username: string;
  reserve_type: string;
  detail: string;
  reserve_time: string;
}

export default function ReservePage() {
  const [reserves, setReserves] = useState<Reserve[]>([]);
  const [deleteReserveId, setDeleteReserveId] = useState<number | null>(null);

  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure(); // 删除确认

  useEffect(() => {
    getReserves().then((res) => {
      setReserves(res.data.data);
    });
  }, []);

  // 删除操作
  const handleDelete = (id: number) => {
    setDeleteReserveId(id);
    onDeleteOpen();
  };

  const confirmDelete = () => {
    if (deleteReserveId !== null) {
      setReserves(reserves.filter((r) => r.id !== deleteReserveId));
      deleteReserve({ id: deleteReserveId });
    }
    onDeleteClose();
  };

  return (
    <Box p={6}>
      <Flex mb={4} justify="space-between">
        <Box fontSize="xl" fontWeight="bold">
          预约管理
        </Box>
      </Flex>

      {/* 预约表格 */}
      <Table variant="simple" colorScheme="gray">
        <Thead bg="gray.700">
          <Tr>
            <Th color="white">ID</Th>
            <Th color="white">用户名</Th>
            <Th color="white">预约类型</Th>
            <Th color="white">详情</Th>
            <Th color="white">预约时间</Th>
            <Th color="white">操作</Th>
          </Tr>
        </Thead>
        <Tbody>
          {reserves.map((reserve) => (
            <Tr key={reserve.id}>
              <Td>{reserve.id}</Td>
              <Td>{reserve.username}</Td>
              <Td>{reserve.reserve_type}</Td>
              <Td>{reserve.detail}</Td>
              <Td>{reserve.reserve_time}</Td>
              <Td>
                <Button
                  size="sm"
                  colorScheme="red"
                  onClick={() => handleDelete(reserve.id)}
                >
                  删除
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {/* 删除确认对话框 */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={undefined}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>确认删除</AlertDialogHeader>
            <AlertDialogBody>确定要删除这个预约吗？</AlertDialogBody>
            <AlertDialogFooter>
              <Button onClick={onDeleteClose}>取消</Button>
              <Button colorScheme="red" ml={3} onClick={confirmDelete}>
                删除
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
