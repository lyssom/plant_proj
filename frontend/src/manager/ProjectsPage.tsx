import React from 'react';
import { Box, Image, Text, Link, VStack } from '@chakra-ui/react';

const ProjectShowcase: React.FC = () => {
  return (
    <Box>
      <VStack spacing={6} align="start">
        <Image
          src="./project.jpeg"
          alt="Pollinator Pathmaker"
          borderRadius="md"
          boxSize="20%"
          objectFit="cover"
        />
        <Text fontSize="xl" fontWeight="bold">
          项目简介
        </Text>
        <Text>
          是由艺术家创作的一个艺术作品，旨在为您设计友好的花园。
        </Text>
        <Text>
          该作品通过算法生成种植方案，优先考虑传粉者的需求，而非人类的美学偏好。公众可以使用在线工具设计和种植自己的花园，帮助创建更多适合传粉者的生态环境。
        </Text>
        <Text>
          目前已建成多个项目：<br/><br/><br/>
          项目1，项目2，项目3
        </Text><br/>
        <Text>
          欲了解更多信息，请联系我们{' '}。
        </Text>
      </VStack>
    </Box>
  );
};

export default ProjectShowcase;
