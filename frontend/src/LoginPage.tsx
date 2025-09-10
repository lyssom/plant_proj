import { Box, Input, Button, Stack, Heading, Text, Link, useToast } from '@chakra-ui/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from './api';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const payload = { username, password };
      const response = await login(payload);

      console.log(response)
      console.log(response.data.success);

      if (response.data.success) {
        // ✅ 保存 token 和用户名
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('username', response.data.username);

        window.dispatchEvent(new Event("storage"));

        toast({
          title: '登录成功',
          status: 'success',
          duration: 2000,
          isClosable: true,
          position: 'top',
        });

        navigate('/');
      } else {
        toast({
          title: '登录失败',
          description: response.data.message || '用户名或密码错误',
          status: 'error',
          duration: 3000,
          isClosable: true,
          position: 'top',
        });
      }
    } catch (error: any) {
      console.error('登录失败:', error);

      toast({
        title: '登录失败',
        description: error.response?.data?.message || error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxW="sm" mx="auto" mt="20">
      <Heading mb="6" textAlign="center">登录</Heading>
      <Stack spacing="4">
        <Input
          placeholder="账号"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Input
          placeholder="密码"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button colorScheme="blue" onClick={handleLogin} isLoading={loading}>
          登录
        </Button>
        <Text textAlign="center" mt="2" fontSize="sm">
          暂无账号？{' '}
          <Link color="blue.500" onClick={() => navigate('/register')}>
            去注册
          </Link>
        </Text>
      </Stack>
    </Box>
  );
}
