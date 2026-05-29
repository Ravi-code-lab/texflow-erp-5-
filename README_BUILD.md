# Ravi-Textile ERP: Windows Build Guide

## Requirements
- Node.js 18+ 
- Windows 10 or 11

## Build Steps

1. **Install modules**:
   `npm install`

2. **Set your Gemini API Key**:
   (CMD): `set API_KEY=your_key`
   (PS): `$env:API_KEY="your_key"`

3. **Generate Executable**:
   `npm run electron:build`

## ⚠️ Troubleshooting: "Privilege not held" Error
If you see an error regarding "symbolic links" or "required privilege":

1. **Run as Administrator**: Close your terminal, right-click your CMD/PowerShell icon, and select **"Run as Administrator"**.
2. **Enable Developer Mode**: Go to Windows Settings -> Privacy & Security -> For developers, and turn **Developer Mode** to **ON**. This allows the build tools to create the necessary links.

## Output
The installer will be generated in the `/release` folder as `RaviTextileERP_Setup_4.1.0.exe`.
