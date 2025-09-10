// MainLayout.tsx
import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";

export default function MainLayout() {
  return (
    <div>
      <TopBar />
      {/* 顶栏高度 50px，给内容留出空白 */}
      <div style={{ marginTop: "50px" }}>
        <Outlet />
      </div>
    </div>
  );
}
