import { app, BrowserWindow, ipcMain, shell } from "electron";
import { join } from "path";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";

const path = require("path");
const fss = require('fs/promises');
const fs = require('fs');
const xlsx = require("xlsx");
const os = require("os");
const PDFDocument = require("pdfkit");
const { imageSize } = require("image-size");
const { readFileSync } = require("node:fs");

function getCurrentTime() {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, "0"); // 月份从0开始，需要加1，并确保是两位数
  const day = now.getDate().toString().padStart(2, "0"); // 确保是两位数
  const hours = now.getHours().toString().padStart(2, "0"); // 确保是两位数
  const minutes = now.getMinutes().toString().padStart(2, "0"); // 确保是两位数
  const seconds = now.getSeconds().toString().padStart(2, "0"); // 确保是两位数

  return `${month}月${day}日 ${hours}-${minutes}-${seconds}`;
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    title: "Lemon Tea",
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  // mainWindow.webContents.openDevTools()

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron");

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC test
  ipcMain.on("ping", () => console.log("pong"));

  createWindow();
  ipcMain.handle("save-excel", async (_, data) => {
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.aoa_to_sheet(data.tableData); // 将数据转换为工作表
    xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1"); // 添加工作表到工作簿

    // 获取桌面路径
    const desktopPath = path.join(os.homedir(), "Desktop");
    const filePath = path.join(
      desktopPath,
      data.title + getCurrentTime() + ".xlsx",
    );

    // 将 Excel 写入文件
    const excelBuffer = xlsx.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    });

    // 保存文件到桌面
    fs.writeFileSync(filePath, excelBuffer);
    return filePath; // 返回文件路径
  });

  ipcMain.handle("save-ocr-excel", async (_, data) => {
    const desktopPath = path.join(os.homedir(), "Desktop");
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.aoa_to_sheet(data.tableData); // 将数据转换为工作表
    xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1"); // 添加工作表到工作簿
    const filePath = path.join(
      desktopPath,
      "图文识别/识别结果/" + data.title + ".xlsx",
    );
    const excelBuffer = xlsx.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    });
    fs.writeFileSync(filePath, excelBuffer);
  });
  ipcMain.handle("empty-folder", async (_, folder) => {
    const desktop = path.join(os.homedir(), "Desktop");
    const target = path.join(desktop, `图文识别/${folder}`);
    await fss.rm(target, { recursive: true, force: true });
    await fss.mkdir(target, { recursive: true });
  });
  ipcMain.handle("images-to-pdf", async (_, { files: ok }) => {
    const desktop = path.join(os.homedir(), "Desktop");
    const sourceDir = path.join(desktop, "图文识别/images");
    if (!fs.existsSync(sourceDir)) {
      return { error: "桌面/图文识别/images 目录不存在", success: false };
    }
    const files = fs
      .readdirSync(sourceDir)
      .filter((file) => /\.(jpg|jpeg|png)$/i.test(file))
      .sort(); // 可按名称排序

    if (!files.length) {
      return { error: "桌面/图文识别/images 没有图片", success: false };
    }
    const doc1 = new PDFDocument({ autoFirstPage: false });
    doc1.pipe(
      fs.createWriteStream(path.join(desktop, "图文识别/识别结果/已匹配.pdf")),
    );
    const o: any = {};
    for (let i = 0; i < ok.length; i++) {
      const p = files[ok[i]];
      o[p] = 1;
      const imgPath = path.join(sourceDir, p);
      const buffer = readFileSync(imgPath);
      const { width, height } = imageSize(buffer);
      doc1.addPage({
        size: [width, height],
      });

      doc1.image(imgPath, 0, 0, {
        width,
        height,
      });
    }
    doc1.end();
    const doc0 = new PDFDocument({ autoFirstPage: false });
    doc0.pipe(
      fs.createWriteStream(path.join(desktop, "图文识别/识别结果/未匹配.pdf")),
    );
    for (let i = 0; i < files.length; i++) {
      if (!o[files[i]]) {
        const p = files[i];
        const imgPath = path.join(sourceDir, p);
        const buffer = readFileSync(imgPath);
        const { width, height } = imageSize(buffer);
        doc0.addPage({
          size: [width, height],
        });

        doc0.image(imgPath, 0, 0, {
          width,
          height,
        });
      }
    }
    doc0.end();
    return { success: true };
  });

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
