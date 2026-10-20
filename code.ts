// Server defines tools; model requests calls; server executes, feeds results back
const tools = [{
  functionDeclarations: [
    {
      name: "http_request",
      description: "Make an HTTP request to a URL and return status + headers + body snippet",
      parameters: {
        type: "OBJECT",
        properties: { url: { type: "STRING" }, method: { type: "STRING" } },
        required: ["url"]
      }
    },
    {
      name: "query_jobs_db",
      description: "Read-only SQL query against the goblin Postgres database",
      parameters: { type: "OBJECT", properties: { sql: { type: "STRING" } }, required: ["sql"] }
    }
  ]
}];

// The agent loop — this is what makes it an "agent" instead of a chatbot
async function runAgentLoop(contents: any[], systemInstruction: string) {
  for (let turn = 0; turn < 10; turn++) {
    const res = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents, config: { systemInstruction, tools }
    });

    const part = res.candidates?.[0]?.content?.parts?.find(p => p.functionCall);
    if (!part?.functionCall) return res.text; // model is done — return final report

    // Execute the tool for real
    const result = await executeTool(part.functionCall.name, part.functionCall.args);

    // Feed the real result back into the conversation
    contents.push(res.candidates[0].content);
    contents.push({ role: "user", parts: [{ functionResponse: {
      name: part.functionCall.name,
      response: { result }
    }}]});
  }
}