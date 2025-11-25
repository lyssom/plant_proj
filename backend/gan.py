import os, random
import numpy as np
from PIL import Image
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as T
import noise

# =====================  数据生成部分  =====================
def generate_pair(size=64):
    """生成模拟地形 + 花径mask"""
    x, y = np.mgrid[0:size, 0:size]
    terrain = np.zeros((size, size))
    for i in range(size):
        for j in range(size):
            terrain[i, j] = noise.pnoise2(i / 20, j / 20)
    terrain = (terrain - terrain.min()) / (terrain.max() - terrain.min())

    path = np.zeros_like(terrain)
    cx, cy = size // 2, size // 2
    # 模拟花径：随机正弦曲线
    for t in np.linspace(0, 2 * np.pi, 100):
        px = int(cx + np.sin(t) * (size / 3) + random.uniform(-2, 2))
        py = int(cy + np.cos(t) * (size / 3) + random.uniform(-2, 2))
        if 0 <= px < size and 0 <= py < size:
            path[px, py] = 1
    return terrain, path

class FakeDataset(Dataset):
    def __init__(self, n=200, size=64):
        self.data = [generate_pair(size) for _ in range(n)]
        self.tf = T.ToTensor()

    def __len__(self): return len(self.data)
    def __getitem__(self, idx):
        terrain, path = self.data[idx]
        return torch.tensor(terrain).unsqueeze(0).float(), torch.tensor(path).unsqueeze(0).float()

# =====================  模型结构  =====================
class UNetGenerator(nn.Module):
    def __init__(self, in_channels=1, out_channels=1):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Conv2d(in_channels, 64, 4, 2, 1), nn.LeakyReLU(0.2),
            nn.Conv2d(64, 128, 4, 2, 1), nn.BatchNorm2d(128), nn.LeakyReLU(0.2)
        )
        self.decoder = nn.Sequential(
            nn.ConvTranspose2d(128, 64, 4, 2, 1), nn.ReLU(),
            nn.ConvTranspose2d(64, out_channels, 4, 2, 1), nn.Sigmoid()
        )
    def forward(self, x):
        return self.decoder(self.encoder(x))

class PatchDiscriminator(nn.Module):
    def __init__(self, in_channels=2):
        super().__init__()
        self.model = nn.Sequential(
            nn.Conv2d(in_channels, 64, 4, 2, 1), nn.LeakyReLU(0.2),
            nn.Conv2d(64, 128, 4, 2, 1), nn.BatchNorm2d(128), nn.LeakyReLU(0.2),
            nn.Conv2d(128, 1, 4, 1, 1), nn.Sigmoid()
        )
    def forward(self, x): return self.model(x)

# =====================  训练部分  =====================
def train_gan(epochs=10, batch_size=8):
    dataset = FakeDataset()
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    G, D = UNetGenerator(), PatchDiscriminator()
    opt_g = optim.Adam(G.parameters(), lr=2e-4)
    opt_d = optim.Adam(D.parameters(), lr=2e-4)
    bce, l1 = nn.BCELoss(), nn.L1Loss()

    for epoch in range(epochs):
        for real_x, real_y in loader:
            fake_y = G(real_x)

            # 训练判别器
            real_pair = torch.cat([real_x, real_y], 1)
            fake_pair = torch.cat([real_x, fake_y.detach()], 1)
            loss_d = 0.5 * (bce(D(real_pair), torch.ones_like(D(real_pair))) +
                            bce(D(fake_pair), torch.zeros_like(D(fake_pair))))
            opt_d.zero_grad(); loss_d.backward(); opt_d.step()

            # 训练生成器
            fake_pair = torch.cat([real_x, fake_y], 1)
            loss_g_gan = bce(D(fake_pair), torch.ones_like(D(fake_pair)))
            loss_g_l1 = l1(fake_y, real_y) * 100
            loss_g = loss_g_gan + loss_g_l1
            opt_g.zero_grad(); loss_g.backward(); opt_g.step()

        print(f"[Epoch {epoch+1}/{epochs}]  Loss_D: {loss_d.item():.3f}  Loss_G: {loss_g.item():.3f}")

    torch.save(G.state_dict(), "fake_gan_model.pt")
    print("✅ 模型已保存：fake_gan_model.pt")

# =====================  推理部分  =====================
def infer_once(size=64):
    G = UNetGenerator()
    G.load_state_dict(torch.load("fake_gan_model.pt"))
    G.eval()
    terrain, _ = generate_pair(size)
    x = torch.tensor(terrain).unsqueeze(0).unsqueeze(0).float()
    with torch.no_grad():
        out = G(x)[0, 0].numpy()
    mask = (out > 0.5).astype(np.uint8) * 255
    Image.fromarray(mask).save("generated_mask.png")
    print("✅ 推理完成，输出保存为 generated_mask.png")

# =====================  主入口  =====================
if __name__ == "__main__":
    if not os.path.exists("fake_gan_model.pt"):
        train_gan(epochs=10)
    infer_once()
