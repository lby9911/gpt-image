# GPT Image Local

一个无账号、无自建后端的本地桌面图片生成应用。用户进入应用后只需要填写 `Base URL` 和 `API Key`，配置、图库索引和生成文件都保存在本机。

## 技术选择

- 桌面框架：Tauri 2
- 前端：Vite + TypeScript，无 React，减少安装包和前端体积
- 本地数据：`settings.json` + `gallery.json`
- 图片文件：本地应用数据目录下的 `images/`
- API：支持 OpenAI `/v1/images/generations`，也支持 OpenAI Responses 图片工具格式 `/v1/responses`

## 本地运行

先安装依赖：

```powershell
npm install
```

仅预览前端：

```powershell
npm run dev
```

运行桌面应用：

```powershell
npm run tauri:dev
```

打安装包：

```powershell
npm run tauri:build
```

当前机器需要先安装 Rust/Cargo 才能运行或打包 Tauri：

```powershell
winget install Rustlang.Rustup
```

安装后重启终端，再执行：

```powershell
rustup default stable
npm run tauri:build
```

## 本地保存位置

Tauri 会使用系统应用数据目录。例如 Windows 上通常类似：

```text
C:\Users\<用户名>\AppData\Roaming\local.gptimage.app\
```

目录结构：

```text
settings.json
gallery.json
images/
  <uuid>.png
  <uuid>.webp
  <uuid>.jpeg
```

## 使用方式

1. 打开应用。
2. 填写 `Base URL`，例如 `https://api.openai.com/v1`。
3. 填写 `API Key`。
4. 选择请求格式：
   - `OpenAI Image`：请求 `/images/generations`。
   - `Responses / 5.5`：请求 `/responses`，使用 `image_generation` tool。
5. 选择模型、图片尺寸、质量、输出格式。
   - 图片尺寸可以使用预设，也可以选 `自定义` 后填写宽高。
   - 自定义尺寸会以 `WIDTHxHEIGHT` 字符串发送给接口。
6. 可选：选择图片输出目录。留空时使用应用数据目录。
7. 输入 prompt 并生成图片。
8. 应用会保存图片文件，并在本地图库中读取展示。
9. 在图库中选择图片，可查看详情并打开文件所在位置。

## 说明

第一版故意不引入账号系统、云端数据库和自建后端。API Key 只保存在本地配置文件中，适合个人工具或 BYOK 分发模式。如果未来要替用户托管额度、计费或隐藏服务端密钥，再增加后端会更合适。

## GPT API 错误处理

请求失败时，应用会优先解析 OpenAI 返回的标准错误对象：

```json
{
  "error": {
    "message": "...",
    "type": "...",
    "param": "...",
    "code": "..."
  }
}
```

界面会展示 HTTP 状态码、`message`、`type`、`param` 和 `code`，方便判断是 API Key、模型权限、尺寸参数、额度或频率限制问题。
