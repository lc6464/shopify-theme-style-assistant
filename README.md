# Shopify Theme Style Assistant

A Shopify theme app extension that helps staff generate Chinese AI prompts for section-scoped custom CSS edits in the Shopify theme editor.

The assistant does not call any AI service and does not write back to Shopify. It only runs in Shopify design mode, collects the selected section or block context, and copies a structured Chinese prompt to the clipboard.

## Features

- Shows a floating assistant after a section or block is selected in the theme editor preview.
- Captures the selected HTML structure.
- Collects rendered CSS context for the selected section.
- Attempts to restore saved custom CSS from the selected section HTML.
- Requires staff to paste unsaved custom CSS manually, because Shopify sidebar drafts are not readable from an app embed.
- Generates a Chinese prompt that asks the target model to explain the CSS changes briefly and return one complete replacement CSS block.

## Project Structure

```text
extensions/
  theme-style-assistant/
    assets/
      theme-style-assistant.css
      theme-style-assistant.js
    blocks/
      theme-style-assistant.liquid
    locales/
      en.default.json
      zh-CN.json
    shopify.extension.toml
  theme-style-assistant-home/
    src/
      AppHome.jsx
    shopify.extension.toml
```

## Local Setup

Install dependencies:

```powershell
npm install
```

Link the project to your Shopify app:

```powershell
shopify app config link --reset --config <config-name>
```

Then build:

```powershell
shopify app build --config <config-name>
```

Do not commit generated `.env` files, linked app configs, store domains, client IDs, app IDs, tokens, or secrets.

## Deployment Notes

`shopify app deploy` releases a new app version in the Shopify Dev Dashboard. It does not install the app to a store and does not enable the app embed in any theme.

For custom distribution, the app usually must be installed into a store that belongs to the same Shopify organization or an allowed organization for that app distribution. If installation fails with an organization mismatch, relink and deploy the app under the Partner organization that can distribute to the target store, or ask the store owner to create/authorize the app from the correct organization.

After installation, enable the app embed in the target theme editor:

```text
Online Store > Themes > Customize > App embeds > 样式提示助手
```

## Extension UID Handling

Shopify CLI may add `uid` fields to `extensions/*/shopify.extension.toml` after linking or deploying an app. Those IDs bind local extension config to a specific Shopify app extension instance.

For open-source use, this repository keeps committed extension TOML files without `uid`. Let Shopify CLI add or update those IDs in your own linked working copy, and do not commit generated app-specific IDs.
