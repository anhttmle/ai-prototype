/**
 * QA UI prototype — mock chat & citations (no backend).
 */
(function () {
  "use strict";

  const chatScroll = document.getElementById("chat-scroll");
  const emptyState = document.getElementById("empty-state");
  const questionInput = document.getElementById("question-input");
  const btnSend = document.getElementById("btn-send");
  const btnReset = document.getElementById("btn-reset");
  const btnRefreshIndex = document.getElementById("btn-refresh-index");
  const indexBadge = document.getElementById("index-badge");
  const indexBadgeText = document.getElementById("index-badge-text");
  const sourcesList = document.getElementById("sources-list");
  const sourcesContext = document.getElementById("sources-context");
  const tabChat = document.getElementById("tab-chat");
  const tabSources = document.getElementById("tab-sources");
  const panelChat = document.getElementById("panel-chat");
  const panelSources = document.getElementById("panel-sources");
  const modelSelect = document.getElementById("model-select");
  const refPopover = document.getElementById("ref-popover");
  const refPopoverType = document.getElementById("ref-popover-type");
  const refPopoverPath = document.getElementById("ref-popover-path");
  const refPopoverTitle = document.getElementById("ref-popover-title");
  const refPopoverBody = document.getElementById("ref-popover-body");

  let selectedAssistantId = null;
  let msgIdCounter = 0;
  let refPopoverHideTimer = null;

  /**
   * Dummy references: BA doc, repo code, call graph, uploaded doc.
   * @type {Record<string, { type: string, typeLabel: string, title: string,
   *   path: string, bodyHtml: string }>}
   */
  const REF_LIBRARY = {
    ref_ba_timeout: {
      type: "ba_doc",
      typeLabel: "Tài liệu BA",
      title: "Điều kiện timeout & hoàn tiền (trích BRD)",
      path: "design/ba/payment/refund-timeout-flow.md",
      bodyHtml:
        "<p>Phiên bản do <strong>BA Assistant</strong> soạn thảo từ workshop " +
        "2025-03.</p>" +
        "<p><strong>BR-042:</strong> Sau 120s không có callback capture " +
        "thành công, giao dịch chuyển trạng thái <code>TIMEOUT</code> và " +
        "được đưa vào hàng đợi hoàn tiền tự động.</p>",
    },
    ref_code_refund_svc: {
      type: "repo_code",
      typeLabel: "Source code repo",
      title: "schedule_timeout_refund",
      path: "src/domain/refund/refund_service.py · L88–112",
      bodyHtml:
        '<pre class="ref-popover__code"><code>def schedule_timeout_refund(' +
        "tx_id: str) -> None:\n" +
        '    """Enqueue refund job after gateway timeout."""\n' +
        "    if not _authorized_within_window(tx):\n" +
        "        raise RefundPolicyError(\"outside_24h_window\")\n" +
        "    queue.enqueue(\"refund_timeout\", tx_id=tx_id)</code></pre>",
    },
    ref_call_graph: {
      type: "call_graph",
      typeLabel: "Call graph (repo)",
      title: "Cạnh liên quan: API → domain → worker",
      path: "call-graph · subgraph \"timeout_refund\"",
      bodyHtml:
        '<pre class="ref-popover__graph">' +
        "POST /v1/payments/capture\n" +
        "  └─▶ payment_api.capture()\n" +
        "        └─▶ refund_service.schedule_timeout_refund()\n" +
        "              └─▶ RefundTimeoutWorker.process_batch()\n" +
        "                    └─▶ gateway_client.refund(...)</pre>" +
        '<p class="ref-popover__hint">Đoạn subgraph được index từ static ' +
        "analysis + symbol graph (dummy).</p>",
    },
    ref_upload_visa: {
      type: "upload",
      typeLabel: "Tài liệu upload",
      title: "Phụ lục hợp đồng cổng Visa (PDF → text)",
      path: "uploads/repo-payment-service/visa-addendum-2024-Q4.txt",
      bodyHtml:
        "<p>File upload gắn với repo <strong>payment-service</strong>, " +
        "được OCR/text extract.</p>" +
        "<p>Điều 3.2: Hoàn tiền toàn phần nếu giao dịch không hoàn tất " +
        "trong <strong>2 phút</strong> kể từ xác thực 3DS.</p>",
    },
  };

  const MOCK_REPLY = {
    reasoningSteps: [
      {
        parts: [
          "Đối chiếu quy tắc nghiệp vụ timeout trong ",
          {
            refId: "ref_ba_timeout",
            label: "refund-timeout-flow.md",
          },
          " để xác định ngưỡng thời gian và trạng thái kích hoạt hoàn tiền.",
        ],
      },
      {
        parts: [
          "Rà soát điểm vào xử lý trên mã nguồn tại ",
          {
            refId: "ref_code_refund_svc",
            label: "refund_service.py",
          },
          " (điều kiện cửa sổ 24h và enqueue job).",
        ],
      },
      {
        parts: [
          "Kiểm tra ",
          {
            refId: "ref_call_graph",
            label: "call graph",
          },
          " để đảm bảo luồng từ API tới worker không bỏ sót nhánh async.",
        ],
      },
      {
        parts: [
          "Bổ sung ngữ cảnh từ ",
          {
            refId: "ref_upload_visa",
            label: "visa-addendum-2024-Q4.txt",
          },
          " (tài liệu upload cùng repo) về SLA hoàn tiền với cổng.",
        ],
      },
    ],
    answerHtml:
      "<p>Khi giao dịch <strong>timeout</strong>, luồng hoàn tiền được kích " +
      "hoạt bởi job <code>RefundTimeoutWorker</code>: trạng thái chuyển sang " +
      "<code>PENDING_REFUND</code>, sau đó gọi cổng thanh toán để hoàn.</p>" +
      "<p>Điều kiện: chỉ các giao dịch có <code>capture_status = AUTHORIZED" +
      "</code> và chưa quá 24h kể từ <code>authorized_at</code> — khớp " +
      "BRD và implementation; phụ lục Visa thêm ngưỡng 2 phút sau 3DS.</p>",
    sources: [
      {
        kind: "ba_doc",
        kindLabel: "Tài liệu BA",
        path: "design/ba/payment/refund-timeout-flow.md",
        snippet:
          "## Timeout\nBR-042: 120s không callback → TIMEOUT → hàng đợi hoàn…",
      },
      {
        kind: "repo_code",
        kindLabel: "Source code",
        path: "src/domain/refund/refund_service.py",
        snippet:
          "def schedule_timeout_refund(tx_id: str) -> None:\n" +
          '    """Enqueue refund after gateway timeout."""\n    …',
      },
      {
        kind: "call_graph",
        kindLabel: "Call graph",
        path: "graph:timeout_refund",
        snippet:
          "capture → refund_service.schedule_timeout_refund → " +
          "RefundTimeoutWorker.process_batch → gateway.refund",
      },
      {
        kind: "upload",
        kindLabel: "Upload",
        path: "uploads/.../visa-addendum-2024-Q4.txt",
        snippet:
          "Điều 3.2: Hoàn tiền toàn phần nếu không hoàn tất trong 2 phút…",
      },
    ],
  };

  function buildReasoningPartHtml(part) {
    if (typeof part === "string") {
      return part;
    }
    const id = part.refId;
    const label = part.label;
    return (
      '<a href="#" class="ref-link" data-ref-id="' +
      id +
      '" role="button">' +
      label +
      "</a>"
    );
  }

  function buildReasoningHtml(steps) {
    const items = steps
      .map(function (step) {
        const inner = step.parts.map(buildReasoningPartHtml).join("");
        return "<li>" + inner + "</li>";
      })
      .join("");
    return (
      '<section class="reasoning-block" aria-label="Các bước suy luận">' +
      '<div class="reasoning-block__head">' +
      '<span class="reasoning-block__icon" aria-hidden="true">◇</span>' +
      '<span class="reasoning-block__title">Các bước suy luận</span>' +
      "</div>" +
      '<ol class="reasoning-steps">' +
      items +
      "</ol>" +
      "</section>" +
      '<div class="answer-divider" aria-hidden="true"></div>' +
      '<div class="answer-body">'
    );
  }

  function buildAssistantBubbleHtml(reply) {
    return (
      buildReasoningHtml(reply.reasoningSteps) +
      reply.answerHtml +
      "</div>"
    );
  }

  function hideRefPopover() {
    refPopover.hidden = true;
    refPopover.setAttribute("aria-hidden", "true");
  }

  function scheduleHideRefPopover() {
    if (refPopoverHideTimer) {
      window.clearTimeout(refPopoverHideTimer);
    }
    refPopoverHideTimer = window.setTimeout(function () {
      hideRefPopover();
      refPopoverHideTimer = null;
    }, 180);
  }

  function cancelHideRefPopover() {
    if (refPopoverHideTimer) {
      window.clearTimeout(refPopoverHideTimer);
      refPopoverHideTimer = null;
    }
  }

  function showRefPopoverForLink(linkEl) {
    const refId = linkEl.getAttribute("data-ref-id");
    const data = refId ? REF_LIBRARY[refId] : null;
    if (!data) {
      return;
    }
    cancelHideRefPopover();
    refPopoverType.textContent = data.typeLabel;
    refPopoverType.className = "ref-popover__type ref-popover__type--" +
      data.type;
    refPopoverPath.textContent = data.path;
    refPopoverTitle.textContent = data.title;
    refPopoverBody.innerHTML = data.bodyHtml;
    refPopover.hidden = false;
    refPopover.setAttribute("aria-hidden", "false");
    window.requestAnimationFrame(function () {
      const rect = linkEl.getBoundingClientRect();
      const margin = 8;
      const popW = refPopover.offsetWidth;
      const popH = refPopover.offsetHeight;
      let left = rect.left;
      let top = rect.bottom + margin;
      if (left + popW > window.innerWidth - margin) {
        left = window.innerWidth - popW - margin;
      }
      if (left < margin) {
        left = margin;
      }
      if (top + popH > window.innerHeight - margin) {
        top = rect.top - popH - margin;
      }
      if (top < margin) {
        top = margin;
      }
      refPopover.style.left = left + "px";
      refPopover.style.top = top + "px";
    });
  }

  function bindRefLinks(containerEl) {
    const links = containerEl.querySelectorAll(".ref-link");
    links.forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
      });
      link.addEventListener("mouseenter", function () {
        showRefPopoverForLink(link);
      });
      link.addEventListener("mouseleave", function () {
        scheduleHideRefPopover();
      });
      link.addEventListener("focus", function () {
        showRefPopoverForLink(link);
      });
      link.addEventListener("blur", function () {
        scheduleHideRefPopover();
      });
    });
  }

  function nextId() {
    msgIdCounter += 1;
    return "msg-" + msgIdCounter;
  }

  function toggleEmpty(visible) {
    emptyState.hidden = !visible;
  }

  /**
   * @returns {{ mode: string, modeLabel: string, modelId: string,
   *   modelLabel: string }}
   */
  function getComposerSettings() {
    const modeInput = document.querySelector(
      'input[name="chat-mode"]:checked'
    );
    const mode = modeInput ? modeInput.value : "fast";
    const modeLabel = mode === "thinking" ? "Thinking" : "Fast";
    const opt = modelSelect.selectedOptions[0];
    const modelId = modelSelect.value;
    const modelLabel = opt ? opt.textContent.trim() : modelId;
    return { mode: mode, modeLabel: modeLabel, modelId: modelId,
      modelLabel: modelLabel };
  }

  function mockLatencyMs(mode) {
    return mode === "thinking" ? 2800 : 900;
  }

  function appendUserMessage(text, settings) {
    const id = nextId();
    const wrap = document.createElement("article");
    wrap.className = "msg msg--user";
    wrap.id = id;
    const meta =
      "Bạn · " + settings.modeLabel + " · " + settings.modelLabel;
    wrap.innerHTML =
      '<span class="msg__meta"></span>' +
      '<div class="msg__bubble"></div>';
    wrap.querySelector(".msg__meta").textContent = meta;
    wrap.querySelector(".msg__bubble").textContent = text;
    chatScroll.appendChild(wrap);
    return id;
  }

  function appendLoadingAssistant(settings) {
    const id = nextId();
    const wrap = document.createElement("article");
    wrap.className = "msg msg--assistant msg--loading";
    wrap.id = id;
    wrap.setAttribute("aria-busy", "true");
    const meta =
      "Trợ lý · đang xử lý · " + settings.modeLabel + " · " +
      settings.modelLabel;
    wrap.innerHTML =
      '<span class="msg__meta"></span>' +
      '<div class="msg__bubble"><div class="typing" aria-hidden="true">' +
      "<span></span><span></span><span></span></div></div>";
    wrap.querySelector(".msg__meta").textContent = meta;
    chatScroll.appendChild(wrap);
    chatScroll.scrollTop = chatScroll.scrollHeight;
    return id;
  }

  function replaceWithAssistant(id, html, settings) {
    const el = document.getElementById(id);
    if (!el) {
      return;
    }
    el.classList.remove("msg--loading");
    el.removeAttribute("aria-busy");
    el.dataset.role = "assistant";
    const meta =
      "Trợ lý · nguồn từ repo · " + settings.modeLabel + " · " +
      settings.modelLabel;
    el.innerHTML =
      '<span class="msg__meta"></span>' +
      '<div class="msg__bubble"></div>';
    el.querySelector(".msg__meta").textContent = meta;
    const bubble = el.querySelector(".msg__bubble");
    bubble.innerHTML = html;
    bindRefLinks(bubble);
    el.addEventListener("click", function () {
      selectAssistantMessage(id, MOCK_REPLY.sources);
    });
    chatScroll.scrollTop = chatScroll.scrollHeight;
    selectAssistantMessage(id, MOCK_REPLY.sources);
  }

  function clearSourcesPlaceholder() {
    sourcesList.innerHTML = "";
    sourcesContext.textContent =
      "Chọn một câu trả lời của trợ lý để xem đoạn trích từ repo.";
  }

  function renderSources(sources) {
    sourcesList.innerHTML = "";
    sourcesContext.textContent =
      "Cùng các loại nguồn: BA, code, call graph, upload — dummy cho review.";
    sources.forEach(function (s, i) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "source-card";
      btn.setAttribute("aria-expanded", "false");
      const kind = s.kind || "repo_code";
      const kindLabel = s.kindLabel || "Nguồn";
      btn.innerHTML =
        '<span class="source-card__kind"></span>' +
        '<div class="source-card__path"></div>' +
        '<p class="source-card__snippet"></p>' +
        '<span class="source-card__expand">Nhấn để mở rộng</span>';
      const kindEl = btn.querySelector(".source-card__kind");
      kindEl.textContent = kindLabel;
      kindEl.classList.add("source-card__kind--" + kind);
      btn.querySelector(".source-card__path").textContent = s.path;
      btn.querySelector(".source-card__snippet").textContent = s.snippet;
      btn.addEventListener("click", function () {
        const expanded = btn.classList.toggle("is-expanded");
        btn.setAttribute("aria-expanded", expanded ? "true" : "false");
      });
      sourcesList.appendChild(btn);
    });
  }

  function selectAssistantMessage(id, sources) {
    selectedAssistantId = id;
    document.querySelectorAll(".msg--assistant").forEach(function (m) {
      m.classList.toggle("is-selected", m.id === id);
    });
    renderSources(sources);
    if (window.matchMedia("(max-width: 900px)").matches) {
      setMobileTab("sources");
    }
  }

  function sendQuestion(text) {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    const settings = getComposerSettings();
    toggleEmpty(false);
    appendUserMessage(trimmed, settings);
    questionInput.value = "";
    btnSend.disabled = true;

    const loadingId = appendLoadingAssistant(settings);
    const delay = mockLatencyMs(settings.mode);
    window.setTimeout(function () {
      replaceWithAssistant(
        loadingId,
        buildAssistantBubbleHtml(MOCK_REPLY),
        settings
      );
      btnSend.disabled = false;
      questionInput.focus();
    }, delay);
  }

  function resetChat() {
    hideRefPopover();
    chatScroll.innerHTML = "";
    clearSourcesPlaceholder();
    toggleEmpty(true);
    selectedAssistantId = null;
    questionInput.value = "";
  }

  function simulateIndexRefresh() {
    indexBadge.classList.remove("index-badge--ok");
    indexBadge.classList.add("index-badge--pending");
    indexBadgeText.textContent = "Đang cập nhật chỉ mục…";
    btnRefreshIndex.disabled = true;
    window.setTimeout(function () {
      indexBadge.classList.add("index-badge--ok");
      indexBadge.classList.remove("index-badge--pending");
      indexBadgeText.textContent = "Đã index · 2.4k đoạn";
      btnRefreshIndex.disabled = false;
    }, 2200);
  }

  function setMobileTab(which) {
    const isChat = which === "chat";
    tabChat.classList.toggle("is-active", isChat);
    tabSources.classList.toggle("is-active", !isChat);
    tabChat.setAttribute("aria-selected", isChat ? "true" : "false");
    tabSources.setAttribute("aria-selected", !isChat ? "true" : "false");
    panelChat.classList.toggle("is-hidden-mobile", !isChat);
    panelSources.classList.toggle("is-visible-mobile", !isChat);
  }

  btnSend.addEventListener("click", function () {
    sendQuestion(questionInput.value);
  });

  questionInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuestion(questionInput.value);
    }
  });

  btnReset.addEventListener("click", resetChat);

  btnRefreshIndex.addEventListener("click", simulateIndexRefresh);

  document.querySelectorAll(".hint-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      const q = chip.getAttribute("data-hint") || chip.textContent;
      questionInput.value = q;
      sendQuestion(q);
    });
  });

  tabChat.addEventListener("click", function () {
    setMobileTab("chat");
  });

  tabSources.addEventListener("click", function () {
    setMobileTab("sources");
  });

  refPopover.addEventListener("mouseenter", cancelHideRefPopover);
  refPopover.addEventListener("mouseleave", function () {
    hideRefPopover();
  });

  chatScroll.addEventListener(
    "scroll",
    function () {
      hideRefPopover();
    },
    { passive: true }
  );

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      hideRefPopover();
    }
  });

  toggleEmpty(true);
})();
