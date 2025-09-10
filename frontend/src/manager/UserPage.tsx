// @ts-nocheck
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
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogBody,
} from "@chakra-ui/react";

import { getUsers, deleteUser } from '../api';

interface User {
  id: number;
  username: string;
  password_hash: string;
  telephone: string;
}

export default function UserPage() {
  const [users, setUsers] = useState<User[]>([
  ]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { isOpen, onOpen, onClose } = useDisclosure(); // 表单弹窗
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure(); // 删除确认

  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);


  useEffect(() => {
    getUsers().then((res) => {
      setUsers(res.data.data);
    })
   }, []);

  

  // // 打开新增表单
  // const handleAdd = () => {
  //   setIsEditing(false);
  //   setCurrentUser({ id: Date.now(), username: "", password_hash: "", telephone: "" });
  //   onOpen();
  // };

  // // 打开编辑表单
  // const handleEdit = (user: User) => {
  //   setIsEditing(true);
  //   setCurrentUser({ ...user });
  //   onOpen();
  // };

  // 保存用户
  const handleSave = () => {
    if (!currentUser) return;
    if (isEditing) {
      setUsers(users.map((u) => (u.id === currentUser.id ? currentUser : u)));
    } else {
      setUsers([...users, currentUser]);
    }
    onClose();
  };

  // 删除用户
  const handleDelete = (id: number) => {
    setDeleteUserId(id);
    onDeleteOpen();
  };

  const confirmDelete = () => {
    if (deleteUserId !== null) {
      setUsers(users.filter((u) => u.id !== deleteUserId));
      deleteUser({ id: deleteUserId });
    }
    onDeleteClose();
  };

  return (
    <Box p={6}>
      <Flex mb={4} justify="space-between">
        <Box fontSize="xl" fontWeight="bold">
          用户管理
        </Box>
        {/* <Button colorScheme="teal" onClick={handleAdd}>
          新增用户
        </Button> */}
      </Flex>

      {/* 用户表格 */}
      <Table variant="simple" colorScheme="gray">
        <Thead bg="gray.700">
          <Tr>
            <Th color="white">ID</Th>
            <Th color="white">用户名</Th>
            <Th color="white">电话</Th>
            <Th color="white">操作</Th>
          </Tr>
        </Thead>
        <Tbody>
          {(users || []).map((user) => (
            <Tr key={user.id}>
              <Td>{user.id}</Td>
              <Td>{user.username}</Td>
              <Td>{user.telephone}</Td>
              <Td>
                {/* <Button size="sm" colorScheme="blue" mr={2} onClick={() => handleEdit(user)}>
                  编辑
                </Button> */}
                <Button size="sm" colorScheme="red" onClick={() => handleDelete(user.id)}>
                  删除
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {/* 新增/编辑用户 Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{isEditing ? "编辑用户" : "新增用户"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={3}>
              <FormLabel>用户名</FormLabel>
              <Input
                value={currentUser?.username || ""}
                onChange={(e) =>
                  setCurrentUser((prev) => (prev ? { ...prev, username: e.target.value } : null))
                }
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>密码</FormLabel>
              <Input
                type="password"
                value={currentUser?.password_hash || ""}
                onChange={(e) =>
                  setCurrentUser((prev) => (prev ? { ...prev, password_hash: e.target.value } : null))
                }
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>电话</FormLabel>
              <Input
                value={currentUser?.telephone || ""}
                onChange={(e) =>
                  setCurrentUser((prev) => (prev ? { ...prev, telephone: e.target.value } : null))
                }
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="teal" mr={3} onClick={handleSave}>
              保存
            </Button>
            <Button onClick={onClose}>取消</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 删除确认对话框 */}
      <AlertDialog isOpen={isDeleteOpen} leastDestructiveRef={undefined} onClose={onDeleteClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>确认删除</AlertDialogHeader>
            <AlertDialogBody>确定要删除这个用户吗？</AlertDialogBody>
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
