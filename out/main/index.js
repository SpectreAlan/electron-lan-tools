"use strict";
const electron = require("electron");
const path$1 = require("path");
const utils = require("@electron-toolkit/utils");
const child_process = require("child_process");
const icon = path$1.join(__dirname, "../../resources/icon.png");
const path = require("path");
const fs = require("fs");
const xlsx = require("xlsx");
const os = require("os");
const PDFDocument = require("pdfkit");
const { imageSize } = require("image-size");
const { readFileSync } = require("node:fs");
function getCurrentTime() {
  const now = /* @__PURE__ */ new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  return `${month}月${day}日 ${hours}-${minutes}-${seconds}`;
}
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    title: "Lemon Tea",
    ...process.platform === "linux" ? { icon } : {},
    webPreferences: {
      preload: path$1.join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path$1.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.electron");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  electron.ipcMain.on("ping", () => console.log("pong"));
  createWindow();
  electron.ipcMain.handle("save-excel", async (_, data) => {
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.aoa_to_sheet(data.tableData);
    xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const desktopPath = path.join(os.homedir(), "Desktop");
    const filePath = path.join(desktopPath, data.title + getCurrentTime() + ".xlsx");
    const excelBuffer = xlsx.write(workbook, { bookType: "xlsx", type: "buffer" });
    fs.writeFileSync(filePath, excelBuffer);
    return filePath;
  });
  electron.ipcMain.handle("ocr-empty-path", async (_) => {
    const desktopPath = path.join(os.homedir(), "Desktop");
    const outDir = path.join(desktopPath, "图文识别/识别结果");
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir);
  });
  electron.ipcMain.handle("save-ocr-excel", async (_, data) => {
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.aoa_to_sheet(data.tableData);
    xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const desktopPath = path.join(os.homedir(), "Desktop");
    const filePath = path.join(desktopPath, "图文识别/识别结果/" + data.title + ".xlsx");
    const excelBuffer = xlsx.write(workbook, { bookType: "xlsx", type: "buffer" });
    fs.writeFileSync(filePath, excelBuffer);
  });
  electron.ipcMain.handle("images-to-pdf", async (_, { files: ok }) => {
    const desktop = path.join(os.homedir(), "Desktop");
    const sourceDir = path.join(desktop, "图文识别/images");
    const files = fs.readdirSync(sourceDir).filter((file) => /\.(jpg|jpeg|png)$/i.test(file)).sort();
    if (!files.length) {
      console.log("没有图片");
      return;
    }
    console.log("img total: " + files.length);
    console.log(files);
    const doc1 = new PDFDocument({ autoFirstPage: false });
    doc1.pipe(fs.createWriteStream(path.join(desktop, "图文识别/识别结果/已匹配.pdf")));
    const o = {};
    for (let i = 0; i < ok.length; i++) {
      const p = files[ok[i]];
      o[p] = 1;
      const imgPath = path.join(sourceDir, p);
      const buffer = readFileSync(imgPath);
      const { width, height } = imageSize(buffer);
      doc1.addPage({
        size: [width, height]
      });
      doc1.image(imgPath, 0, 0, {
        width,
        height
      });
    }
    doc1.end();
    const doc0 = new PDFDocument({ autoFirstPage: false });
    doc0.pipe(fs.createWriteStream(path.join(desktop, "图文识别/识别结果/未匹配.pdf")));
    for (let i = 0; i < files.length; i++) {
      if (!o[files[i]]) {
        const p = files[i];
        const imgPath = path.join(sourceDir, p);
        const buffer = readFileSync(imgPath);
        const { width, height } = imageSize(buffer);
        doc0.addPage({
          size: [width, height]
        });
        doc0.image(imgPath, 0, 0, {
          width,
          height
        });
      }
    }
    doc0.end();
  });
  electron.ipcMain.handle("pdf-to-img", async (event) => {
    return new Promise((resolve, reject) => {
      const exePath = "D:\\tools\\poppler-25.12.0\\Library\\bin\\pdftoppm.exe";
      const desktop = path.join(os.homedir(), "Desktop");
      const pdfPath = path.join(desktop, "图文识别/1.pdf");
      const outputPrefix = path.join(desktop, "图文识别/images/p");
      const args = [
        "-r",
        "300",
        pdfPath,
        outputPrefix,
        "-png"
      ];
      const child = child_process.spawn(exePath, args);
      child.stdout.on("data", (data) => {
        event.sender.send("pdf-log", data.toString());
      });
      child.stderr.on("data", (data) => {
        event.sender.send("pdf-log", data.toString());
      });
      child.on("close", (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          reject(new Error("转换失败，code=" + code));
        }
      });
    });
  });
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
