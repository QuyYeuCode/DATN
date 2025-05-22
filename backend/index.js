const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");
const router = require("./routes");
const { updateAllTokenPrices } = require("./controller/tokenPriceController");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", router);

const PORT = process.env.PORT || 5000;

// Kết nối database
connectDB();

// Thiết lập cập nhật giá token định kỳ (mỗi 1 phút)
setInterval(async () => {
  try {
    await updateAllTokenPrices();
  } catch (error) {
    console.error("Error updating token prices:", error);
  }
}, 60000); // 60000ms = 1 phút

// Cập nhật giá ngay khi khởi động server
updateAllTokenPrices().catch(console.error);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
