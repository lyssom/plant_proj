import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Box, Button, MenuButton, Menu, MenuList, MenuItem,
  Flex, Spacer, IconButton
} from "@chakra-ui/react";

import EduMenuItem from "./EduMenuItem";
import { getUser, removeToken, removeUser } from "./utils/auth";

import { FiHome } from "react-icons/fi"; // 小房子图标

function TopBar() {
  const navigate = useNavigate();
  const [isEduOpen, setEduOpen] = useState(false);
  const [eduType, setEduType] = useState<"自然教育活动" | "志愿者服务">("自然教育活动");

  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const updateUser = () => {
      const user = getUser();
      setUsername(user);
    };

    updateUser(); // 初次渲染也执行一次

    window.addEventListener("storage", updateUser);
    return () => window.removeEventListener("storage", updateUser);
  }, []);

  const handleLogout = () => {
    removeToken();
    removeUser();
    setUsername(null);
    navigate("/login"); // 跳回登录页
  };

  return (
    <>
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
        <Spacer flex="0.5" />

        {/* 中间菜单区 */}
        <Box display="flex" gap={4}>
          <Menu>
            <MenuButton as={Button} variant="ghost" colorScheme="teal" color="white" _hover={{ bg: "#2D3748" }}>
              菜单
            </MenuButton>
            <MenuList color="#4A5568">
              <MenuItem _hover={{ bg: "#4A5568", color: "#FFFFFF" }} onClick={() => navigate("/projects")}>建成项目</MenuItem>
              <MenuItem _hover={{ bg: "#4A5568", color: "#FFFFFF" }} onClick={() => navigate("/events")}>往期活动</MenuItem>
              <MenuItem _hover={{ bg: "#4A5568", color: "#FFFFFF" }} onClick={() => navigate("/research")}>研究成果</MenuItem>
              <MenuItem _hover={{ bg: "#4A5568", color: "#FFFFFF" }} onClick={() => navigate("/partners")}>合作单位</MenuItem>
              <MenuItem onClick={() => { setEduType("自然教育活动"); setEduOpen(true); }}>自然教育活动预约</MenuItem>
              <MenuItem onClick={() => { setEduType("志愿者服务"); setEduOpen(true); }}>志愿者服务预约</MenuItem>
              <MenuItem _hover={{ bg: "#4A5568", color: "#FFFFFF" }} onClick={() => navigate("/about_us")}>联系我们</MenuItem>
            </MenuList>
          </Menu>

          {username === "admin" && (<Menu>
            <MenuButton as={Button} variant="ghost" colorScheme="teal" color="white" _hover={{ bg: "#2D3748" }}>
              管理
            </MenuButton>
            <MenuList color="#4A5568">
              <MenuItem _hover={{ bg: "#4A5568", color: "#FFFFFF" }} onClick={() => navigate("/manage/reservations")}>预约管理</MenuItem>
              <MenuItem _hover={{ bg: "#4A5568", color: "#FFFFFF" }} onClick={() => navigate("/manage/users")}>用户管理</MenuItem>
              <MenuItem _hover={{ bg: "#4A5568", color: "#FFFFFF" }} onClick={() => navigate("/manage/plants")}>植物管理</MenuItem>
            </MenuList>
          </Menu>)}
        </Box>

        <Spacer flex="2" />

        <IconButton
          aria-label="主页"
          icon={<FiHome />}
          variant="outline"
          colorScheme="whiteAlpha"
          onClick={() => navigate("/")}
          mr={20} // 右边间距
          size="sm" // 可以根据需要调整大小
        />

        {/* 登录/退出 */}
        {username ? (
          <Flex align="center" gap={2}>
            <Box>欢迎，{username}</Box>
            <Button variant="outline" colorScheme="red" onClick={handleLogout}>
              退出
            </Button>
          </Flex>
        ) : (
          <Button
            variant="outline"
            colorScheme="whiteAlpha"
            onClick={() => navigate("/login")}
          >
            登录
          </Button>
        )}
      </Flex>

      <EduMenuItem isOpen={isEduOpen} onClose={() => setEduOpen(false)} reserveType={eduType} />
    </>
  );
}

export default TopBar;
