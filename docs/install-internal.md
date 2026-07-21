# 安装、部署与排错指南

## 前置条件

- 已安装并登录 Shopify CLI。
- 有权限访问用于开发和分发 app 的 Shopify Partner 组织。
- 有权限在目标店铺安装自定义分发 app。
- 店铺域名使用标准格式，例如 `<store>.myshopify.com`，不是 `my-shopify.com`。

## 关联本地项目

推荐使用具名配置，避免覆盖已有 Shopify app 绑定：

```powershell
shopify app config link --reset --config <config-name>
```

按 CLI 提示选择 Partner 组织，并选择或创建 app。该命令会生成类似 `shopify.app.<config-name>.toml` 的本地配置文件，其中可能包含真实 `client_id`。这些文件必须保持在 `.gitignore` 中，不要提交。

## 发布 App Version

```powershell
shopify app deploy --config <config-name> --allow-updates --message "Deploy Theme Style Assistant"
```

注意：deploy 只是在 Shopify Dev Dashboard 中发布 app 版本。它不会：

- 自动把 app 安装到任何店铺。
- 自动出现在 Shopify Admin 的应用列表中。
- 自动启用任何主题的 App Embed。

## 安装到目标店铺

Theme App Extension 必须随 app 安装到店铺后，才会出现在主题编辑器的 App embeds 列表中。

在 Shopify Partner / Dev Dashboard 中：

1. 打开 Apps。
2. 进入对应 app。
3. 打开 Distribution / App distribution。
4. 选择 Custom distribution。
5. 输入目标店铺域名。
6. 生成安装链接。
7. 在已登录目标店铺后台的浏览器中打开安装链接并完成安装。

如果出现“只能安装在属于同一组织的商店中”或类似提示，通常不是代码问题，而是 Partner 组织和目标店铺所属组织不匹配。需要把本地项目重新 link/deploy 到可分发给该店铺的 Partner 组织，或让店铺所有者在正确组织下创建/授权 app。

## 启用 App Embed

安装 app 后，在目标主题编辑器中启用：

1. 打开 Shopify Admin。
2. 进入 Online Store > Themes。
3. 打开目标 theme 的 Customize。
4. 打开 Theme settings > App embeds。
5. 启用“样式提示助手”。
6. 保存主题编辑器更改。

可选深链格式：

```text
https://<myshopifyDomain>/admin/themes/current/editor?context=apps&template=index&activateAppId=<client_id>/theme-style-assistant
```

深链只会尝试激活已安装 app 的 App Embed，不会触发安装流程。如果店铺尚未安装 app，打开该链接通常不会出现安装提示。

## 临时主题预览方案

在 app 无法安装但需要尽快验证 UI 时，可以把临时 loader、JS、CSS 上传到一个未发布备份主题中测试。只建议用于短期验证，并且必须确认目标 theme 不是 live theme。

推荐原则：

- 只写入明确指定的 unpublished theme。
- 临时代码仍使用与 Theme App Extension 相同的 JS/CSS，降低测试和正式部署差异。
- loader 必须包在 `{% if request.design_mode %}` 中，避免普通顾客页面加载助手。
- 测试完成后，正式方案仍应回到 app install + app embed。

## 使用验证

1. 在主题编辑器预览区选择一个分区或区块。
2. 确认右侧出现“样式助手”入口。
3. 打开助手并填写样式修改需求。
4. 核对“现有自定义 CSS”输入框。助手会尝试从 HTML 末尾的 style 标签反向识别已保存自定义 CSS，但 Shopify 右侧输入框中的未保存内容无法自动读取。
5. 如果右侧输入框有未保存内容，手动复制并覆盖助手中的“现有自定义 CSS”。
6. 点击“复制提示词”。
7. 把提示词粘贴给目标 AI 模型，确认返回内容包含简要修改说明和一个完整 CSS 代码块。
8. 在普通店铺页面访问时，确认助手资源没有加载。
