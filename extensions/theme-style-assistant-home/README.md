# theme-style-assistant-home

Shopify App Home UI extension for Theme Style Assistant.

This extension provides a simple merchant-facing app home page after the app is installed. The core feature still lives in the Theme App Extension app embed.

## Purpose

- Give the installed app a visible Admin entry.
- Explain how staff should enable the "样式提示助手" app embed in a theme.
- Clarify that the assistant only runs in theme editor design mode.

## Files

```text
shopify.extension.toml
src/AppHome.jsx
locales/en.default.json
locales/zh-CN.json
```

## Development

Run commands from the project root:

```powershell
shopify app build --config <config-name>
shopify app deploy --config <config-name>
```
