import React from "react";
import { Box, Heading, Text, VStack, Link } from "@chakra-ui/react";

const ContactUs: React.FC = () => {
  return (
    <Box maxW="600px" mx="auto" mt="10" p="6" borderWidth="1px" borderRadius="md" bg="gray.50">
      <VStack spacing={4} align="start">
        <Heading size="lg">联系我们</Heading>

        <Box>
          <Text fontWeight="bold">公司名称：</Text>
          <Text>示例科技有限公司</Text>
        </Box>

        <Box>
          <Text fontWeight="bold">地址：</Text>
          <Text></Text>
        </Box>

        <Box>
          <Text fontWeight="bold">电话：</Text>
          <Text></Text>
        </Box>

        <Box>
          <Text fontWeight="bold">邮箱：</Text>
          <Link href="mailto:contact@example.com" color="teal.500">
           
          </Link>
        </Box>

        <Box>
          <Text fontWeight="bold">官网：</Text>
          <Link href="https://www.example.com" color="teal.500" isExternal>
            www.example.com
          </Link>
        </Box>
      </VStack>
    </Box>
  );
};

export default ContactUs;
