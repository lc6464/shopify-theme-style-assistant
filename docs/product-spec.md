# 产品说明

## 产品定位

- App name：Theme Style Assistant
- Merchant-facing name：样式提示助手
- Theme extension handle：theme-style-assistant

样式提示助手面向需要频繁调整 Shopify 主题分区样式、但不熟悉 CSS 的运营、实习生或内容同事。它把选中分区的 HTML、CSS 上下文和修改需求整理成中文提示词，交给外部 AI 模型生成可复制回 Shopify 自定义 CSS 输入框的完整 CSS。

## 运行边界

该 app 通过 Theme App Extension app embed 运行在店铺预览 iframe 内，只在 `request.design_mode` 下加载。它不注入 Shopify Admin 外层右侧设置栏 DOM，因为 app embed 代码无法稳定运行在 Shopify Admin 外层应用中。

## 当前能力

- 监听 Shopify 主题编辑器中的 section/block 选择事件。
- 在选中元素附近显示入口；展开后固定在右上角。
- 提取当前 HTML 结构，并清理脚本、大型 SVG、过长属性等噪声。
- 收集与当前分区相关的已渲染 CSS 作为上下文。
- 从选中分区 HTML 中由后往前查找 style 标签，尝试反向识别 Shopify 保存后处理过的自定义 CSS。
- 要求用户核对“现有自定义 CSS”。如果为空，必须显式勾选风险确认。
- 复制中文提示词，要求目标模型先简要说明 CSS 修改和作用，再输出一个可全量替换的完整 CSS 代码块。
- 自动复制失败时，在面板中显示已选中的文本，方便手动按 `Ctrl+C`。

## 重要限制

- 不调用 OpenAI、Claude 或其他 AI API。
- 不自动写回 Shopify CSS。
- 不读取 Shopify Admin 右侧 CSS 输入框中的未保存草稿；如需保留，用户必须手动粘贴到助手输入框。
- 自动检测 CSS 可能包含主题默认变量、编辑器注入规则和重复规则，只能作为上下文。
- HTML 末尾 style 标签通常更接近 Shopify 处理后的自定义 CSS，但仍需要用户核对。
- 不做埋点、分析或遥测。

## 使用流程

1. 用户打开 Shopify 主题编辑器。
2. 用户启用“样式提示助手”App Embed。
3. 用户在预览区选择分区或区块。
4. 用户打开右侧“样式助手”。
5. 用户填写样式修改需求。
6. 用户核对“现有自定义 CSS”。如果右侧 Shopify CSS 输入框有未保存内容，手动粘贴覆盖自动识别结果。
7. 用户复制生成的提示词。
8. 用户把提示词粘贴给 AI 模型，得到简要修改说明和完整 CSS。
9. 用户人工审核后，把 CSS 全量替换回 Shopify 自定义 CSS 区域。
