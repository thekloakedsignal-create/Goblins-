const handleDispatchJob = async (newJobData: {
  title: string;
  agentId: string;
  sectorId: string;
  priority: JobPriority;
  prompt: string;
  inputData?: string;
}) => {
  const assignedAgent = agents.find(a => a.id === newJobData.agentId) || agents[0];
  const sector = sectors.find(s => s.id === newJobData.sectorId);
  const jobId = `job-${Date.now()}`;
  const createdAtTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const newJob: AgentJob = {
    id: jobId,
    title: newJobData.title,
    agentId: assignedAgent.id,
    agentName: assignedAgent.name,
    agentRole: assignedAgent.role,
    sectorId: newJobData.sectorId,
    status: "RUNNING",
    priority: newJobData.priority,
    prompt: newJobData.prompt,
    inputData: newJobData.inputData,
    result: "",
    createdAt: createdAtTime,
    logs: [
      {
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        stage: "INIT",
        message: `Job dispatched to ${assignedAgent.name} (${assignedAgent.role}).`
      }
    ]
  };

  setJobs(prev => [newJob, ...prev]);

  setAgents(prev => prev.map(a => (a.id === assignedAgent.id
    ? {
        ...a,
        status: "PROCESSING" as AgentStatus,
        activeJobId: jobId,
        currentTask: `Executing: ${newJobData.title}`,
        logs: [{
          id: `log-${Date.now()}`,
          timestamp: createdAtTime,
          message: `Job dispatched: "${newJobData.title}" (${newJobData.priority} priority).`,
          type: "info" as const
        }, ...a.logs]
      }
    : a)));

  // Reduce GoblinCoin balance if the job-board controller exposes it here —
  // if your file has a setGoblinCoins call in the old version, keep it between these lines.

  const appendJobLog = (entry: { time?: string; stage: string; message: string }) => {
    const stamp = entry.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setJobs(prev => prev.map(j => (j.id === jobId
      ? { ...j, logs: [...(j.logs || []), { timestamp: stamp, stage: entry.stage, message: entry.message }] }
      : j)));
  };

  const appendJobChunk = (delta: string) => {
    setJobs(prev => prev.map(j => (j.id === jobId ? { ...j, result: (j.result || "") + delta } : j)));
  };

  const completeJob = (finalResult: string, durationMs: number) => {
    setJobs(prev => prev.map(j => (j.id === jobId
      ? {
          ...j,
          status: "COMPLETED" as const,
          result: finalResult || j.result,
          logs: [...(j.logs || []), {
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            stage: "COMPLETE",
            message: `Deliverable sealed in ${(durationMs / 1000).toFixed(1)}s.`
          }]
        }
      : j)));

    setAgents(prev => prev.map(a => (a.id === assignedAgent.id
      ? {
          ...a,
          status: "IDLE" as AgentStatus,
          activeJobId: undefined,
          currentTask: undefined,
          stats: { ...a.stats, jobsCompleted: a.stats.jobsCompleted + 1 },
          logs: [{
            id: `log-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            message: `Delivered "${newJobData.title}". Bedrock conduits stable.`,
            type: "success" as const
          }, ...a.logs]
        }
      : a)));
  };

  const failJob = (message: string) => {
    setJobs(prev => prev.map(j => (j.id === jobId
      ? {
          ...j,
          status: "FAILED" as const,
          logs: [...(j.logs || []), {
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            stage: "ERROR",
            message
          }]
        }
      : j)));
    setAgents(prev => prev.map(a => (a.id === assignedAgent.id
      ? { ...a, status: "IDLE" as AgentStatus, activeJobId: undefined, currentTask: undefined }
      : a)));
  };

  const parseSSEBlock = (block: string, onEvent: (type: string, data: any) => void) => {
    const eventMatch = block.match(/^event:\s*(.+)$/m);
    const dataMatch = block.match(/^data:\s*(.+)$/m);
    if (!dataMatch) return;
    const type = eventMatch ? eventMatch[1].trim() : "message";
    try {
      onEvent(type, JSON.parse(dataMatch[1]));
    } catch {
      /* partial JSON frame — skip */
    }
  };

  const handleJobEvent = (
    type: string,
    data: any,
    state: { result: string; startedAt: number },
    close?: () => void
  ) => {
    if (type === "log") {
      appendJobLog({ time: data.timestamp, stage: data.stage, message: data.message });
    } else if (type === "chunk") {
      state.result += data.delta || "";
      appendJobChunk(data.delta || "");
    } else if (type === "done") {
      completeJob(data.result ?? state.result, data.durationMs ?? (Date.now() - state.startedAt));
      close?.();
    } else if (type === "error") {
      failJob(data.message || "Bedrock fault — job failed.");
      close?.();
    }
  };

  try {
    const res = await fetch("/api/jobs/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        title: newJobData.title,
        prompt: newJobData.prompt,
        inputData: newJobData.inputData,
        agentName: assignedAgent.name,
        agentRole: assignedAgent.role,
        sectorId: newJobData.sectorId,
        sectorName: sector?.name,
        priority: newJobData.priority
      })
    });

    const contentType = res.headers.get("content-type") || "";

    // Mode A — durable queue: server replied JSON { stream: "/api/jobs/stream/<id>" }
    if (contentType.includes("application/json")) {
      const dispatch = await res.json();
      if (!res.ok || !dispatch.stream) {
        failJob(dispatch.error || `Dispatch failed (HTTP ${res.status}).`);
        return;
      }
      appendJobLog({ stage: "QUEUED", message: "Job secured in bedrock queue — worker picked up the pickaxe." });

      const state = { result: "", startedAt: Date.now() };
      const evtSource = new EventSource(dispatch.stream);
      ["log", "chunk", "done", "error"].forEach(evt => {
        evtSource.addEventListener(evt, e => {
          try {
            handleJobEvent(evt, JSON.parse((e as MessageEvent).data), state, () => evtSource.close());
          } catch {
            /* malformed frame — skip */
          }
        });
      });
      evtSource.onerror = () => {
        evtSource.close();
        // If nothing finished, mark honestly instead of hanging forever
        setJobs(prev => {
          const job = prev.find(j => j.id === jobId);
          if (job && job.status === "RUNNING") failJob("Live stream dropped before completion signal.");
          return prev;
        });
      };
      return;
    }

    // Mode B — in-process fallback: SSE directly on this POST response
    if (!res.ok || !res.body) {
      failJob(`Dispatch failed (HTTP ${res.status}).`);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const state = { result: "", startedAt: Date.now() };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (block.startsWith(":")) continue; // heartbeat comment
        parseSSEBlock(block, (type, data) => handleJobEvent(type, data, state));
      }
    }
  } catch (err: any) {
    failJob(err?.message || "Network fault while dispatching job.");
  }
};