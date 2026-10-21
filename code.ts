const res = await fetch("/api/jobs/execute", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ jobId, title: newJobData.title, prompt: newJobData.prompt, inputData: newJobData.inputData, agentName: assignedAgent.name, agentRole: assignedAgent.role, sectorId: newJobData.sectorId, sectorName: sectors.find(s=>s.id===newJobData.sectorId)?.name, priority: newJobData.priority })
});
const dispatch = await res.json();

// In DB mode we connect to the replay stream; in fallback mode the POST itself was the SSE stream
const streamUrl = dispatch.stream || null;
if (streamUrl) {
  const evtSource = new EventSource(streamUrl);
  evtSource.addEventListener("log",  e => appendJobLog(jobId, JSON.parse(e.data)));
  evtSource.addEventListener("chunk",e => appendJobChunk(jobId, JSON.parse(e.data).delta));
  evtSource.addEventListener("done", e => { completeJob(jobId, JSON.parse(e.data)); evtSource.close(); });
}