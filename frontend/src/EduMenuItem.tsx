// @ts-nocheck
import { useState } from "react";

import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Textarea,
} from "@chakra-ui/react";

import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { createReserve } from "./api";

interface EduMenuItemProps {
  isOpen: boolean;
  onClose: () => void;
  reserveType?: string; // 新增可选字段
}

export function EduMenuItem({ isOpen, onClose, reserveType = "自然教育活动" }: EduMenuItemProps) {
  const [reserveTime, setReserveTime] = useState<Date | null>(null);
  const [detail, setDetail] = useState("");

  const handleSubmit = () => {
    const data = { 
      reserve_time: reserveTime ? reserveTime.toISOString() : "", 
      detail,
      reserve_type: reserveType, // 使用传入的类型
      status: "待开始"
    };
    createReserve(data);

    onClose();
    setReserveTime(null);
    setDetail("");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{reserveType}预约</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl mb={3}>
            <FormLabel>预约时间</FormLabel>
            <ReactDatePicker
              selected={reserveTime}
              onChange={(date) => setReserveTime(date)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="yyyy-MM-dd HH:mm"
              placeholderText="请选择时间"
            />
          </FormControl>
          <FormControl mb={3}>
            <FormLabel>详情</FormLabel>
            <Textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="请输入预约详情"
            />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="teal" mr={3} onClick={handleSubmit}>
            提交
          </Button>
          <Button onClick={onClose}>关闭</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default EduMenuItem;
