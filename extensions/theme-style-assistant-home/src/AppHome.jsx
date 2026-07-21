import {render} from 'preact';

export default async () => {
  render(<App />, document.body);
};

function App() {
  return (
    <s-page heading="样式提示助手">
      <s-section>
        <s-stack gap="base">
          <s-text>
            这个应用用于在主题编辑器中选择分区或区块后，生成中文 CSS 修改提示词。
          </s-text>
          <s-text>
            应用不会自动修改主题代码，也不会调用 AI 服务。请在目标主题的 App embeds 中启用“样式提示助手”，然后保存主题设置。
          </s-text>
        </s-stack>
      </s-section>

      <s-section heading="测试步骤">
        <s-ordered-list>
          <s-list-item>打开要测试的未发布主题。</s-list-item>
          <s-list-item>进入 Theme settings / App embeds。</s-list-item>
          <s-list-item>启用“样式提示助手”并保存。</s-list-item>
          <s-list-item>在主题编辑器预览区选择任意分区或区块。</s-list-item>
          <s-list-item>点击右侧“样式助手”，核对现有自定义 CSS，填写需求并复制提示词。</s-list-item>
        </s-ordered-list>
      </s-section>

      <s-section heading="重要限制">
        <s-unordered-list>
          <s-list-item>普通顾客访问店铺时不会加载助手；它只在主题编辑器设计模式中加载。</s-list-item>
          <s-list-item>助手会尝试从 HTML 反向识别已保存自定义 CSS，但 Shopify 右侧输入框里的未保存内容无法自动读取。如需保留，请手动粘贴到助手中的“现有自定义 CSS”。</s-list-item>
          <s-list-item>建议先在未发布主题中测试，确认后再在当前 live theme 的 App embeds 中启用。</s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}
