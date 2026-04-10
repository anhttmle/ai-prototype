/**
 * QA UI プロトタイプ（日本語）— モックのみ、バックエンドなし。
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

  const REF_LIBRARY = {
    ref_ba_timeout: {
      type: "ba_doc",
      typeLabel: "BAドキュメント",
      title: "タイムアウト・返金条件（BRD抜粋）",
      path: "design/ba/payment/refund-timeout-flow.md",
      bodyHtml:
        "<p><strong>BAアシスタント</strong>が2025年3月のワークショップ" +
        "をもとに作成した版。</p>" +
        "<p><strong>BR-042:</strong> キャプチャ成功のコールバックが" +
        "120秒以内にない場合、取引は<code>TIMEOUT</code>となり、" +
        "自動返金キューに投入される。</p>",
    },
    ref_code_refund_svc: {
      type: "repo_code",
      typeLabel: "リポジトリのソースコード",
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
      typeLabel: "コールグラフ（リポジトリ）",
      title: "関連エッジ: API → ドメイン → ワーカー",
      path: 'call-graph · subgraph "timeout_refund"',
      bodyHtml:
        '<pre class="ref-popover__graph">' +
        "POST /v1/payments/capture\n" +
        "  └─▶ payment_api.capture()\n" +
        "        └─▶ refund_service.schedule_timeout_refund()\n" +
        "              └─▶ RefundTimeoutWorker.process_batch()\n" +
        "                    └─▶ gateway_client.refund(...)</pre>" +
        '<p class="ref-popover__hint">サブグラフは静的解析＋シンボル' +
        "グラフからインデックス（ダミー）。</p>",
    },
    ref_upload_visa: {
      type: "upload",
      typeLabel: "アップロード資料",
      title: "Visaゲートウェイ契約別紙（PDF→テキスト）",
      path: "uploads/repo-payment-service/visa-addendum-2024-Q4.txt",
      bodyHtml:
        "<p><strong>payment-service</strong>リポジトリに紐づく" +
        "アップロードファイル（OCR／テキスト抽出）。</p>" +
        "<p>第3.2条: 3DS認証後<strong>2分以内</strong>に取引が完了" +
        "しない場合は全額返金。</p>",
    },
  };

  const MOCK_REPLY = {
    reasoningSteps: [
      {
        parts: [
          "タイムアウトに関する業務ルールを ",
          {
            refId: "ref_ba_timeout",
            label: "refund-timeout-flow.md",
          },
          " で照合し、時間閾値と返金トリガー状態を特定。",
        ],
      },
      {
        parts: [
          "ソース上の処理入口を ",
          {
            refId: "ref_code_refund_svc",
            label: "refund_service.py",
          },
          " で確認（24時間ウィンドウ条件とジョブenqueue）。",
        ],
      },
      {
        parts: [
          "",
          {
            refId: "ref_call_graph",
            label: "コールグラフ",
          },
          " で API からワーカーまで非同期経路の抜けがないか検証。",
        ],
      },
      {
        parts: [
          "同一リポジトリにアップロードされた ",
          {
            refId: "ref_upload_visa",
            label: "visa-addendum-2024-Q4.txt",
          },
          " からゲートウェイSLAの補足コンテキストを付与。",
        ],
      },
    ],
    answerHtml:
      "<p>取引が<strong>タイムアウト</strong>した場合、返金フローは" +
      "ジョブ <code>RefundTimeoutWorker</code> によって起動され、" +
      "状態は <code>PENDING_REFUND</code> に遷移したうえで" +
      "決済ゲートウェイへ返金要求が送られます。</p>" +
      "<p>条件: <code>capture_status = AUTHORIZED</code> の取引に限り、" +
      "<code>authorized_at</code> から24時間以内であること — BRDと実装" +
      "の両方に整合。Visa別紙では3DS後2分の閾値が追加されています。</p>",
    sources: [
      {
        kind: "ba_doc",
        kindLabel: "BAドキュメント",
        path: "design/ba/payment/refund-timeout-flow.md",
        snippet:
          "## Timeout\nBR-042: 120秒でコールバックなし → TIMEOUT → " +
          "返金キューへ…",
      },
      {
        kind: "repo_code",
        kindLabel: "ソースコード",
        path: "src/domain/refund/refund_service.py",
        snippet:
          "def schedule_timeout_refund(tx_id: str) -> None:\n" +
          '    """Enqueue refund after gateway timeout."""\n    …',
      },
      {
        kind: "call_graph",
        kindLabel: "コールグラフ",
        path: "graph:timeout_refund",
        snippet:
          "capture → refund_service.schedule_timeout_refund → " +
          "RefundTimeoutWorker.process_batch → gateway.refund",
      },
      {
        kind: "upload",
        kindLabel: "アップロード",
        path: "uploads/.../visa-addendum-2024-Q4.txt",
        snippet:
          "第3.2条: 2分以内に完了しない場合は全額返金…",
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
      '<section class="reasoning-block" aria-label="推論の各ステップ">' +
      '<div class="reasoning-block__head">' +
      '<span class="reasoning-block__icon" aria-hidden="true">◇</span>' +
      '<span class="reasoning-block__title">推論のステップ</span>' +
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

  function getComposerSettings() {
    const modeInput = document.querySelector(
      'input[name="chat-mode"]:checked'
    );
    const mode = modeInput ? modeInput.value : "fast";
    const modeLabel = mode === "thinking" ? "思考" : "高速";
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
      "あなた · " + settings.modeLabel + " · " + settings.modelLabel;
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
      "アシスタント · 処理中 · " + settings.modeLabel + " · " +
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
      "アシスタント · リポジトリ由来 · " + settings.modeLabel + " · " +
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
      "アシスタントの回答を選ぶとリポジトリからの抜粋が表示されます。";
  }

  function renderSources(sources) {
    sourcesList.innerHTML = "";
    sourcesContext.textContent =
      "BA・コード・コールグラフ・アップロードなど種別付き（レビュー用ダミー）。";
    sources.forEach(function (s) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "source-card";
      btn.setAttribute("aria-expanded", "false");
      const kind = s.kind || "repo_code";
      const kindLabel = s.kindLabel || "ソース";
      btn.innerHTML =
        '<span class="source-card__kind"></span>' +
        '<div class="source-card__path"></div>' +
        '<p class="source-card__snippet"></p>' +
        '<span class="source-card__expand">クリックで展開</span>';
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
    indexBadgeText.textContent = "インデックスを更新しています…";
    btnRefreshIndex.disabled = true;
    window.setTimeout(function () {
      indexBadge.classList.add("index-badge--ok");
      indexBadge.classList.remove("index-badge--pending");
      indexBadgeText.textContent = "インデックス済み · 2.4k チャンク";
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
