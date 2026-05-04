const cardPayload = {
  type: "AdaptiveCard",
  version: "1.5",
  body: [
    {
      type: "TextBlock",
      text: "New Software Request",
      weight: "Bolder",
      size: "Medium"
    },
    {
      type: "Input.Text",
      id: "softwareName",
      label: "Software name",
      isRequired: true,
      errorMessage: "Software name is required"
    },
    {
      type: "Input.Text",
      id: "softwareVersion",
      label: "Version",
      isRequired: true,
      errorMessage: "Version is required"
    },
    {
      type: "Input.Text",
      id: "vendorName",
      label: "Vendor",
      isRequired: true,
      errorMessage: "Vendor is required"
    },
    {
      type: "Input.Text",
      id: "businessJustification",
      label: "Business justification",
      isMultiline: true,
      isRequired: true,
      errorMessage: "Business justification is required"
    },
    {
      type: "Input.Number",
      id: "licenseCount",
      label: "License count",
      min: 1,
      max: 100000,
      isRequired: true,
      errorMessage: "License count is required"
    },
    {
      type: "Input.Text",
      id: "requesterName",
      label: "Requester name",
      placeholder: "Auto-populate from Entra profile in production",
      isRequired: true,
      errorMessage: "Requester name is required"
    },
    {
      type: "Input.Text",
      id: "requesterDepartment",
      label: "Requester department",
      isRequired: true,
      errorMessage: "Requester department is required"
    }
  ],
  actions: [
    {
      type: "Action.Submit",
      title: "Submit Request",
      data: {
        action: "submitRequest"
      }
    }
  ]
};

const state = {
  requestId: null,
  reportUrl: null,
  poller: null
};

const card = new AdaptiveCards.AdaptiveCard();
card.parse(cardPayload);
card.onExecuteAction = async (action) => {
  const data = action.data || {};
  if (data.action !== "submitRequest") {
    return;
  }

  const values = card.getAllInputs().reduce((acc, input) => {
    acc[input.id] = input.value;
    return acc;
  }, {});

  try {
    const response = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.error || "Unable to submit request");
      return;
    }

    const result = await response.json();
    state.requestId = result.requestId;
    state.reportUrl = `/api/reports/${result.requestId}`;

    document.getElementById("statusPanel").hidden = false;
    document.getElementById("requestId").textContent = result.requestId;
    document.getElementById("sessionId").textContent = result.sessionId;
    setStatus(result.status, "Pending");

    startPolling();
  } catch (error) {
    alert("Submission failed. Check backend availability.");
  }
};

document.getElementById("cardHost").appendChild(card.render());

document.getElementById("openReport").addEventListener("click", () => {
  if (!state.reportUrl) {
    return;
  }
  document.getElementById("reportFrame").src = state.reportUrl;
});

document.getElementById("approveBtn").addEventListener("click", () => submitDecision("Approve"));
document.getElementById("rejectBtn").addEventListener("click", () => submitDecision("Reject"));

async function submitDecision(value) {
  if (!state.requestId) {
    return;
  }

  const response = await fetch(`/api/requests/${state.requestId}/approval`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "left-rail",
      value,
      actor: "teams-left-rail-user"
    })
  });

  if (!response.ok) {
    const error = await response.json();
    alert(error.error || "Decision failed");
    return;
  }

  const payload = await response.json();
  alert(`Decision recorded: ${payload.decision.value}`);
}

function setStatus(status, recommendation) {
  const badge = document.getElementById("statusBadge");
  badge.className = "badge";
  if (status === "completed") {
    badge.classList.add("badge-completed");
  } else if (status === "error") {
    badge.classList.add("badge-error");
  } else {
    badge.classList.add("badge-running");
  }

  badge.textContent = status;
  document.getElementById("recommendation").textContent = recommendation;

  const isReady = status === "completed" || status === "incomplete";
  document.getElementById("openReport").disabled = !isReady;
  document.getElementById("approveBtn").disabled = !isReady;
  document.getElementById("rejectBtn").disabled = !isReady;
}

async function startPolling() {
  if (state.poller) {
    clearInterval(state.poller);
  }

  state.poller = setInterval(async () => {
    if (!state.requestId) {
      clearInterval(state.poller);
      return;
    }

    const response = await fetch(`/api/requests/${state.requestId}`);
    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    setStatus(payload.status, payload.recommendation || "Pending");

    if (payload.status === "completed" || payload.status === "incomplete" || payload.status === "error") {
      clearInterval(state.poller);
      state.poller = null;
    }
  }, 1500);
}
