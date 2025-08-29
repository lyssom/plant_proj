import { Box, Input, Button, Stack, Heading, Text, Link, useToast } from '@chakra-ui/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from './api'; // 假设你有注册接口

export function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();

  const handleRegister = async () => {
    if (!username || !password || !phone) {
      toast({
        title: '请完整填写信息',
        status: 'warning',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });
      return;
    }

    setLoading(true);
    try {
      const payload = { username, password, phone };
      const response = await register(payload);
      console.log('注册成功:', response);

      toast({
        title: '注册成功',
        status: 'success',
        duration: 2000,
        isClosable: true,
        position: 'top',
      });

      navigate('/login'); // 注册成功后跳转登录页
    } catch (error: any) {
      console.error('注册失败:', error);

      toast({
        title: '注册失败',
        description: error.response?.data?.msg || error.message,
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
      <Heading mb="6" textAlign="center">注册</Heading>
      <Stack spacing="4">
        <Input
          placeholder="用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Input
          placeholder="密码"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          placeholder="手机号"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Button colorScheme="blue" onClick={handleRegister} isLoading={loading}>
          注册
        </Button>
        <Text textAlign="center" mt="2" fontSize="sm">
          已有账号？{' '}
          <Link color="blue.500" onClick={() => navigate('/login')}>
            去登录
          </Link>
        </Text>
      </Stack>
    </Box>
  );
}
