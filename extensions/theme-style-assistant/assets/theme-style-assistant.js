(function () {
  "use strict";

  var ROOT_ID = "theme-style-assistant-root";
  var MAX_SECTION_HTML_LENGTH = 26000;
  var MAX_BLOCK_HTML_LENGTH = 10000;
  var MAX_CSS_LENGTH = 14000;

  if (window.__stylePromptAssistantLoaded) {
    return;
  }
  window.__stylePromptAssistantLoaded = true;

  var root = document.getElementById(ROOT_ID);
  if (!root) {
    return;
  }

  var state = {
    sectionEl: null,
    blockEl: null,
    sectionId: "",
    blockId: "",
    expanded: false,
    isScrolling: false,
    scrollTimer: 0,
    statusTimer: 0
  };

  root.innerHTML = [
    '<button class="spa-launcher" type="button" aria-expanded="false">',
    '  <span class="spa-launcher__dot" aria-hidden="true"></span>',
    '  <span>样式助手</span>',
    '</button>',
    '<section class="spa-panel" aria-label="样式提示助手">',
    '  <div class="spa-panel__header">',
    '    <div>',
    '      <p class="spa-eyebrow">样式提示助手</p>',
    '      <p class="spa-target" data-spa-target>未选择分区</p>',
    '    </div>',
    '    <button class="spa-icon-button" type="button" data-spa-collapse aria-label="收起助手">×</button>',
    '  </div>',
    '  <label class="spa-label" for="spa-request">样式修改需求</label>',
    '  <textarea id="spa-request" class="spa-textarea" rows="5" placeholder="例如：把当前分区标题改为居中，移动端缩小间距，并让按钮更醒目。"></textarea>',
    '  <label class="spa-label spa-label--spaced" for="spa-manual-css">现有自定义 CSS</label>',
    '  <textarea id="spa-manual-css" class="spa-textarea spa-textarea--compact" rows="4" placeholder="系统会尝试从当前 HTML 识别已保存的自定义 CSS；请核对。如右侧输入框有未保存内容，请粘贴覆盖这里。"></textarea>',
    '  <label class="spa-check" for="spa-empty-css">',
    '    <input id="spa-empty-css" type="checkbox">',
    '    <span>风险确认：我已检查 Shopify 右侧自定义 CSS 输入框，确认其中没有已保存或未保存的 CSS；否则生成结果可能覆盖并丢失原有样式。</span>',
    '  </label>',
    '  <div class="spa-actions">',
    '    <button class="spa-button spa-button--primary" type="button" data-spa-copy>复制提示词</button>',
    '  </div>',
    '  <p class="spa-note">注意：这里会尝试从 HTML 反推出已保存的自定义 CSS，但 Shopify 右侧输入框中的未保存更改无法自动读取。如需保留，必须手动粘贴覆盖上方内容。</p>',
    '  <div class="spa-output" data-spa-output hidden>',
    '    <label class="spa-label" for="spa-copy-output">手动复制内容</label>',
    '    <textarea id="spa-copy-output" class="spa-textarea spa-textarea--output" rows="7" readonly></textarea>',
    '  </div>',
    '  <p class="spa-status" role="status" aria-live="polite"></p>',
    '</section>'
  ].join("");

  var launcher = root.querySelector(".spa-launcher");
  var panel = root.querySelector(".spa-panel");
  var targetText = root.querySelector("[data-spa-target]");
  var textarea = root.querySelector(".spa-textarea");
  var manualCssTextarea = root.querySelector("#spa-manual-css");
  var emptyCssCheckbox = root.querySelector("#spa-empty-css");
  var collapseButton = root.querySelector("[data-spa-collapse]");
  var copyButton = root.querySelector("[data-spa-copy]");
  var outputWrapper = root.querySelector("[data-spa-output]");
  var outputTextarea = root.querySelector("#spa-copy-output");
  var statusText = root.querySelector(".spa-status");

  launcher.addEventListener("click", function () {
    setExpanded(true);
  });

  collapseButton.addEventListener("click", function () {
    setExpanded(false);
  });

  copyButton.addEventListener("click", function () {
    var request = textarea.value.trim();
    if (!validateInputs(request)) {
      return;
    }

    hideManualCopy();
    var prompt = buildPrompt(request);
    copyText(prompt).then(function () {
      setStatus("提示词已复制。", "success");
    }).catch(function () {
      showManualCopy(prompt);
      setStatus("浏览器阻止了自动复制，已在下方选中内容，请按 Ctrl+C 手动复制。", "error");
    });
  });

  manualCssTextarea.addEventListener("input", updateEmptyCssControl);

  document.addEventListener("shopify:section:select", function (event) {
    var detail = event.detail || {};
    var previousSectionId = state.sectionId;
    state.sectionId = detail.sectionId || "";
    state.sectionEl = findSectionElement(state.sectionId, event.target);
    state.blockEl = null;
    state.blockId = "";
    syncCustomCssInputFromSelection(previousSectionId !== state.sectionId || !manualCssTextarea.value.trim());
    setExpanded(false);
    render();
  }, true);

  document.addEventListener("shopify:section:deselect", function (event) {
    var detail = event.detail || {};
    var deselectedId = detail.sectionId || "";
    if (!deselectedId || deselectedId === state.sectionId) {
      clearSelection();
    }
  }, true);

  document.addEventListener("shopify:block:select", function (event) {
    var detail = event.detail || {};
    var previousSectionId = state.sectionId;
    state.blockId = detail.blockId || "";
    state.blockEl = findBlockElement(state.blockId, event.target);
    state.sectionId = detail.sectionId || state.sectionId || "";
    state.sectionEl = findSectionElement(state.sectionId, state.blockEl || event.target) || state.sectionEl;
    syncCustomCssInputFromSelection(previousSectionId !== state.sectionId || !manualCssTextarea.value.trim());
    setExpanded(false);
    render();
  }, true);

  document.addEventListener("shopify:block:deselect", function (event) {
    var detail = event.detail || {};
    var deselectedBlockId = detail.blockId || "";
    if (!deselectedBlockId || deselectedBlockId === state.blockId) {
      state.blockEl = null;
      state.blockId = "";
      render();
    }
  }, true);

  window.addEventListener("scroll", handleViewportScroll, { passive: true });
  document.addEventListener("scroll", handleViewportScroll, true);
  window.addEventListener("resize", function () {
    positionAssistant(Boolean(state.sectionEl || state.blockEl));
  });

  function clearSelection() {
    state.sectionEl = null;
    state.blockEl = null;
    state.sectionId = "";
    state.blockId = "";
    setExpanded(false);
    render();
  }

  function render() {
    var hasSelection = Boolean(state.sectionEl || state.blockEl);
    root.dataset.visible = hasSelection ? "true" : "false";
    root.dataset.expanded = state.expanded ? "true" : "false";
    root.dataset.scrolling = state.isScrolling ? "true" : "false";
    targetText.textContent = hasSelection ? getTargetLabel() : "未选择分区";
    positionAssistant(hasSelection);
    launcher.setAttribute("aria-expanded", state.expanded ? "true" : "false");
    panel.hidden = !hasSelection || !state.expanded;
    launcher.hidden = !hasSelection || state.expanded;
  }

  function positionAssistant(hasSelection) {
    if (!hasSelection) {
      root.style.removeProperty("--spa-top");
      return;
    }

    if (state.expanded) {
      root.style.setProperty("--spa-top", "16px");
      return;
    }

    var target = state.blockEl || state.sectionEl;
    if (!target || typeof target.getBoundingClientRect !== "function") {
      root.style.removeProperty("--spa-top");
      return;
    }

    var rect = target.getBoundingClientRect();
    var panelHeight = 44;
    var top = clamp(rect.top + 8, 72, window.innerHeight - panelHeight - 16);
    root.style.setProperty("--spa-top", Math.round(top) + "px");
  }

  function handleViewportScroll() {
    var hasSelection = Boolean(state.sectionEl || state.blockEl);
    if (!hasSelection || state.expanded) {
      return;
    }

    state.isScrolling = true;
    render();
    window.clearTimeout(state.scrollTimer);
    state.scrollTimer = window.setTimeout(function () {
      state.isScrolling = false;
      render();
    }, 180);
  }

  function setExpanded(expanded) {
    state.expanded = expanded;
    render();
    if (expanded) {
      textarea.focus();
    }
  }

  function setStatus(message, tone) {
    window.clearTimeout(state.statusTimer);
    statusText.textContent = message;
    statusText.dataset.tone = tone || "neutral";
    state.statusTimer = window.setTimeout(function () {
      statusText.textContent = "";
      statusText.removeAttribute("data-tone");
    }, 4500);
  }

  function showManualCopy(text) {
    outputTextarea.value = text;
    outputWrapper.hidden = false;
    window.setTimeout(function () {
      outputTextarea.focus();
      outputTextarea.select();
      try {
        outputTextarea.setSelectionRange(0, outputTextarea.value.length);
      } catch (error) {}
    }, 0);
  }

  function hideManualCopy() {
    outputTextarea.value = "";
    outputWrapper.hidden = true;
  }

  function validateInputs(request) {
    if (!request) {
      setStatus("请先填写样式修改需求。", "error");
      textarea.focus();
      return false;
    }

    return validateManualCss();
  }

  function validateManualCss() {
    if (manualCssTextarea.value.trim() || emptyCssCheckbox.checked) {
      return true;
    }

    setStatus("请粘贴现有自定义 CSS；只有确认右侧输入框没有任何已保存或未保存 CSS 时，才可勾选风险确认。", "error");
    manualCssTextarea.focus();
    return false;
  }

  function syncCustomCssInputFromSelection(shouldRefresh) {
    if (!shouldRefresh) {
      updateEmptyCssControl();
      return;
    }

    manualCssTextarea.value = extractSavedCustomCssFromHtml();
    emptyCssCheckbox.checked = false;
    updateEmptyCssControl();
    hideManualCopy();
  }

  function updateEmptyCssControl() {
    var hasCustomCss = Boolean(manualCssTextarea.value.trim());
    emptyCssCheckbox.checked = hasCustomCss ? false : emptyCssCheckbox.checked;
    emptyCssCheckbox.closest(".spa-check").hidden = hasCustomCss;
  }

  function getTargetLabel() {
    var parts = [];
    if (state.blockEl || state.blockId) {
      parts.push("区块" + (state.blockId ? " " + state.blockId : ""));
    }
    if (state.sectionEl || state.sectionId) {
      parts.push("分区" + (state.sectionId ? " " + state.sectionId : ""));
    }
    return parts.join(" / ") || "已选择的主题元素";
  }

  function buildPrompt(request) {
    var htmlContext = buildHtmlContext();
    var detectedCssContext = buildDetectedCssContext();
    var manualCssContext = buildManualCssContext();

    return [
      "你是一个精通 Shopify 主题开发、Liquid 模板结构和前端 CSS 调试的资深工程师。",
      "",
      "我正在 Shopify 主题编辑器中修改一个分区或区块的样式。请根据下面的上下文和我的需求，给出可以粘贴到 Shopify 自定义 CSS 区域的结果。",
      "",
      "要求：",
      "1. 先用中文简要说明你修改了哪些 CSS，以及这些修改分别起什么作用，最多 3 条，面向不懂 CSS 的运营/实习同事，不要写得太复杂。",
      "2. 然后给出基于现有 CSS 更新后的完整 CSS，必须使用且只使用一个 ```css 代码块包裹。",
      "3. CSS 代码必须是可以直接全量替换当前区域样式的完整版本，不要只给差异片段或 patch。",
      "4. 「现有自定义 CSS」是从 Shopify 右侧自定义 CSS 输入框人工提供，或从当前 HTML 反向识别出的已保存自定义 CSS，优先级高于自动检测 CSS。请基于它生成可全量替换的完整 CSS。",
      "5. 优先使用当前分区范围内稳定的 class、id 或 data 属性选择器。",
      "6. Shopify 保存或渲染自定义 CSS 时，通常会自动为选择器补上当前分区的 section id。请输出适合直接粘贴回 Shopify 自定义 CSS 输入框的原始写法，不要把 HTML 里已经补过的 `#shopify-section-...` 当成必须手写的前缀。",
      "7. 不要修改 HTML，不要输出 Liquid，不要编造不存在的结构。",
      "8. 避免使用过强的全局选择器，除非没有其他可靠选择。",
      "9. 如果「现有自定义 CSS」明确为空，不要把自动检测 CSS 当作已保存的自定义 CSS。请先在回答开头明确提醒用户：必须确认 Shopify 右侧自定义 CSS 输入框确实没有已保存或未保存内容；如果判断错误，全量替换可能丢失原有自定义样式。提醒后，再从空 CSS 开始给出完全重新创建的完整 CSS。",
      "10. 如果缺少 HTML 结构、现有自定义 CSS 状态或修改需求，请先要求我补充，不要直接写 CSS。注意：如果下方明确写着现有自定义 CSS 为空，就表示 CSS 已提供且为空，不要再索要 CSS。",
      "11. 下方自动检测 CSS 可能包含主题默认变量、编辑器注入规则、响应式辅助规则或与你的需求无关的全局规则。除非它们和当前需求直接相关，否则把它们当作上下文，不要原样保留；输出时仍然以当前需求为主，基于现有的“自定义 CSS”给出可以直接全量替换的完整“自定义 CSS”。",
      "12. 当前 HTML 结构末尾的 style 标签大概率是 Shopify 处理过后的自定义 CSS，其中可能已经被自动加上 section id；你可以把它和上方明确给出的“现有自定义 CSS”相互对照，但最终输出仍以“现有自定义 CSS”为准。",
      "",
      "当前目标：",
      getTargetLabel(),
      "",
      "我的修改需求：",
      escapeFenceText(request),
      "",
      "自动检测 CSS（仅作为上下文，可能包含主题默认规则、编辑器注入规则和重复规则）：",
      "```css",
      escapeFenceText(detectedCssContext),
      "```",
      "",
      "现有自定义 CSS（来自人工粘贴或从 HTML 反向识别，优先基于这里生成）：",
      "```css",
      escapeFenceText(manualCssContext),
      "```",
      "",
      "当前 HTML 结构：",
      "```html",
      escapeFenceText(htmlContext),
      "```"
    ].join("\n");
  }

  function buildDetectedCssContext() {
    return extractCssContext();
  }

  function buildManualCssContext() {
    var manualCss = manualCssTextarea.value.trim();
    if (manualCss) {
      return manualCss;
    }

    return "当前为空：用户勾选了风险确认，表示已检查 Shopify 右侧自定义 CSS 输入框，确认其中没有已保存或未保存的 CSS。请注意：如果该确认有误，后续全量替换 CSS 可能丢失原有自定义样式。";
  }

  function buildHtmlContext() {
    if (state.blockEl) {
      return [
        "<!-- 当前选中的区块 HTML 结构 -->",
        cleanHtml(state.blockEl, MAX_BLOCK_HTML_LENGTH),
        "",
        "<!-- 父级分区 HTML 结构 -->",
        cleanHtml(state.sectionEl || state.blockEl, MAX_SECTION_HTML_LENGTH)
      ].join("\n");
    }

    if (state.sectionEl) {
      return cleanHtml(state.sectionEl, MAX_SECTION_HTML_LENGTH);
    }

    return "当前为空：未检测到选中分区或区块的 HTML 结构。";
  }

  function cleanHtml(element, maxLength) {
    if (!element || element.nodeType !== 1) {
      return "当前为空：未检测到 HTML 结构。";
    }

    var clone = element.cloneNode(true);
    cleanupNode(clone);
    return truncateText(formatHtml(clone.outerHTML), maxLength);
  }

  function cleanupNode(node) {
    var removableSelectors = [
      "script",
      "noscript",
      "iframe",
      "#" + ROOT_ID
    ];

    node.querySelectorAll(removableSelectors.join(",")).forEach(function (item) {
      item.remove();
    });

    node.querySelectorAll("svg").forEach(function (svg) {
      if (svg.outerHTML.length > 2000) {
        svg.replaceWith(document.createComment("大型内联 SVG 已移除"));
      }
    });

    var walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
    var current = node;
    while (current) {
      cleanupAttributes(current);
      current = walker.nextNode();
    }
  }

  function cleanupAttributes(element) {
    Array.prototype.slice.call(element.attributes || []).forEach(function (attribute) {
      var name = attribute.name.toLowerCase();
      var value = attribute.value || "";

      if (name.indexOf("on") === 0) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (name === "srcset" || name === "data-srcset" || name === "imagesrcset") {
        element.removeAttribute(attribute.name);
        return;
      }

      if ((name === "src" || name === "href" || name === "style") && value.length > 700) {
        element.setAttribute(attribute.name, value.slice(0, 700) + "...[已截断]");
      }
    });
  }

  function extractSavedCustomCssFromHtml() {
    var sectionEl = state.sectionEl || state.blockEl;
    if (!sectionEl) {
      return "";
    }

    var sectionDomId = getSectionDomId(sectionEl, state.sectionId);
    if (!sectionDomId) {
      return "";
    }

    var styleEls = Array.prototype.slice.call(sectionEl.querySelectorAll("style"));
    for (var index = styleEls.length - 1; index >= 0; index -= 1) {
      var styleEl = styleEls[index];
      var text = (styleEl.textContent || "").trim();
      if (!text || text.indexOf(sectionDomId) === -1 || isThemeGeneratedSectionCss(text, index) || isShopifyEditorCss(text)) {
        continue;
      }

      return cleanupExtractedCustomCss(reverseShopifySectionScope(text, sectionDomId));
    }

    return "";
  }

  function isShopifyEditorCss(text) {
    return text.indexOf("data-shopify-editor-section") !== -1 ||
      text.indexOf("pointer-events: none") !== -1 ||
      text.indexOf("cursor: default") !== -1;
  }

  function isThemeGeneratedSectionCss(text, index) {
    if (index !== 0) {
      return false;
    }

    return text.indexOf("--section-background") !== -1 ||
      text.indexOf("--top-padding") !== -1 ||
      text.indexOf("--bottom-padding") !== -1 ||
      text.indexOf("--heading-color") !== -1 ||
      text.indexOf("--text-color") !== -1;
  }

  function reverseShopifySectionScope(cssText, sectionDomId) {
    var idPattern = "#" + escapeRegExp(sectionDomId);

    return String(cssText || "")
      .replace(new RegExp(idPattern + "\\s*(&)", "g"), "$1")
      .replace(new RegExp(idPattern + "\\s+", "g"), "")
      .replace(new RegExp(idPattern + "(?=\\s*[,{])", "g"), ":scope")
      .replace(/}\s*/g, "}\n\n")
      .trim();
  }

  function cleanupExtractedCustomCss(cssText) {
    return String(cssText || "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function extractCssContext() {
    var sectionEl = state.sectionEl || state.blockEl;
    if (!sectionEl) {
      return "当前为空：未检测到已保存/已渲染的分区 CSS。";
    }

    var sectionId = getSectionDomId(sectionEl, state.sectionId);
    var snippets = [];
    var exactTokens = getExactSelectorTokens(sectionEl, state.blockEl);

    sectionEl.querySelectorAll("style").forEach(function (styleEl) {
      addSnippet(snippets, styleEl.textContent, "选中分区内部的 style 标签");
    });

    document.querySelectorAll("style").forEach(function (styleEl) {
      if (sectionEl.contains(styleEl)) {
        return;
      }
      var text = styleEl.textContent || "";
      var matchingText = extractMatchingCssText(text, sectionId, exactTokens);
      if (matchingText) {
        addSnippet(snippets, matchingText, "页面 style 标签中匹配当前分区的规则");
      }
    });

    Array.prototype.slice.call(document.styleSheets || []).forEach(function (sheet) {
      collectCssRules(sheet, sectionId, exactTokens, snippets);
    });

    if (!snippets.length) {
      return "当前为空：未检测到已保存/已渲染的分区 CSS。";
    }

    return truncateText(dedupeLines(snippets.join("\n\n")), MAX_CSS_LENGTH);
  }

  function collectCssRules(sheet, sectionId, exactTokens, snippets) {
    var rules;
    try {
      rules = sheet.cssRules;
    } catch (error) {
      return;
    }

    if (!rules) {
      return;
    }

    Array.prototype.slice.call(rules).forEach(function (rule) {
      if (rule.type === CSSRule.STYLE_RULE && isRelevantSelector(rule.selectorText, sectionId, exactTokens)) {
        addSnippet(snippets, rule.cssText, "可访问样式表中匹配当前分区的规则");
        return;
      }

      if ((rule.type === CSSRule.MEDIA_RULE || rule.type === CSSRule.SUPPORTS_RULE) && rule.cssRules) {
        var nested = [];
        Array.prototype.slice.call(rule.cssRules).forEach(function (nestedRule) {
          if (nestedRule.type === CSSRule.STYLE_RULE && isRelevantSelector(nestedRule.selectorText, sectionId, exactTokens)) {
            nested.push(nestedRule.cssText);
          }
        });
        if (nested.length) {
          var atRule = rule.type === CSSRule.SUPPORTS_RULE ? "@supports " : "@media ";
          addSnippet(snippets, rule.conditionText ? atRule + rule.conditionText + " {\n" + nested.join("\n") + "\n}" : nested.join("\n"), "媒体查询或条件规则中匹配当前分区的规则");
        }
      }
    });
  }

  function extractMatchingCssText(text, sectionId, exactTokens) {
    if (!text) {
      return "";
    }

    return text.split("}").map(function (chunk) {
      var ruleText = chunk.trim();
      if (!ruleText || ruleText.indexOf("{") === -1) {
        return "";
      }
      return isRelevantSelector(ruleText, sectionId, exactTokens) ? ruleText + "}" : "";
    }).filter(Boolean).join("\n");
  }

  function isRelevantSelector(selectorText, sectionId, exactTokens) {
    if (!selectorText) {
      return false;
    }

    if (exactTokens.some(function (token) {
      return selectorText.indexOf(token) !== -1;
    })) {
      return true;
    }

    return Boolean(sectionId && selectorText.indexOf(sectionId) !== -1);
  }

  function getExactSelectorTokens(sectionEl, blockEl) {
    var tokens = [];
    collectElementTokens(sectionEl, tokens);
    collectElementTokens(blockEl, tokens);
    if (state.sectionId) {
      tokens.push(state.sectionId);
      tokens.push("shopify-section-" + state.sectionId);
    }
    if (state.blockId) {
      tokens.push(state.blockId);
    }
    return tokens.filter(function (token, index) {
      return token && token.length > 2 && tokens.indexOf(token) === index;
    });
  }

  function collectElementTokens(element, tokens) {
    if (!element || element.nodeType !== 1) {
      return;
    }

    if (element.id) {
      tokens.push(element.id);
    }

    Array.prototype.slice.call(element.attributes || []).forEach(function (attribute) {
      var name = attribute.name.toLowerCase();
      var value = attribute.value || "";
      if ((name === "data-section-id" || name === "data-block-id" || name === "data-shopify-editor-section" || name === "data-shopify-editor-block") && value.length > 0) {
        tokens.push(value);
      }
    });
  }

  function addSnippet(snippets, text, label) {
    var normalized = (text || "").trim();
    if (!normalized) {
      return;
    }
    snippets.push("/* " + label + " */\n" + truncateText(normalized, 6000));
  }

  function dedupeLines(text) {
    var seen = Object.create(null);
    return text.split("\n").filter(function (line) {
      var key = line.trim();
      if (!key) {
        return true;
      }
      if (seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    }).join("\n");
  }

  function findSectionElement(sectionId, target) {
    var fromTarget = closestElement(target, '[id^="shopify-section-"], [data-section-id], .shopify-section');
    if (fromTarget) {
      return fromTarget;
    }

    if (sectionId) {
      return document.getElementById("shopify-section-" + sectionId) ||
        document.getElementById(sectionId) ||
        document.querySelector('[data-section-id="' + escapeAttribute(sectionId) + '"]');
    }

    return null;
  }

  function findBlockElement(blockId, target) {
    var fromTarget = closestElement(target, '[data-block-id], [data-shopify-editor-block], [id*="shopify-block-"]');
    if (fromTarget) {
      return fromTarget;
    }

    if (!blockId) {
      return null;
    }

    var escaped = escapeAttribute(blockId);
    return document.querySelector('[data-block-id="' + escaped + '"]') ||
      document.querySelector('[data-shopify-editor-block*="' + escaped + '"]') ||
      document.querySelector('[id*="' + escaped + '"]');
  }

  function closestElement(target, selector) {
    if (!target || target.nodeType !== 1) {
      return null;
    }

    try {
      return target.matches(selector) ? target : target.closest(selector);
    } catch (error) {
      return null;
    }
  }

  function getSectionDomId(sectionEl, sectionId) {
    if (sectionEl && sectionEl.id) {
      return sectionEl.id;
    }
    return sectionId ? "shopify-section-" + sectionId : "";
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise(function (resolve, reject) {
      var copyTarget = document.createElement("textarea");
      copyTarget.value = text;
      copyTarget.setAttribute("readonly", "");
      copyTarget.className = "spa-copy-buffer";
      document.body.appendChild(copyTarget);
      copyTarget.select();

      try {
        if (document.execCommand("copy")) {
          resolve();
        } else {
          reject(new Error("execCommand copy returned false"));
        }
      } catch (error) {
        reject(error);
      } finally {
        copyTarget.remove();
      }
    });
  }

  function formatHtml(html) {
    return html
      .replace(/></g, ">\n<")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) {
      return text || "";
    }

    return text.slice(0, maxLength) + "\n...[已截断 " + (text.length - maxLength) + " 个字符]";
  }

  function clamp(value, min, max) {
    if (max < min) {
      return min;
    }
    return Math.min(Math.max(value, min), max);
  }

  function escapeFenceText(text) {
    return String(text || "").replace(/```/g, "`\u200b``");
  }

  function escapeAttribute(value) {
    return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function escapeCss(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }
    return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  updateEmptyCssControl();
  render();
})();
