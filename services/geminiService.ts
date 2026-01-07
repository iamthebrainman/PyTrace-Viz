
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { TraceData } from "../types";

export async function analyzeCodeExecution(code: string, currentViewRange: [number, number]): Promise<TraceData> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-3-pro-preview";
  
  const prompt = `
    Act as a senior Python debugger. Analyze the provided Python code.
    Since the code might be very long (up to 12k lines), focus on the main entry point and significant logical blocks.
    Handle specialty imports like dada_engine, wordberriesncream, keyboard, etc., as if they were present.
    
    Current focused lines: ${currentViewRange[0]} to ${currentViewRange[1]}.
    
    Generate a sequence of execution steps (TraceData) that explain the program logic.
    For each step:
    1. Identify the line number.
    2. Provide a clear, concise explanation of what is happening.
    3. Simulate important variable states as a JSON object string.
    
    Code:
    ${code.slice(0, 15000)}
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                lineNumber: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
                variableStateJson: { type: Type.STRING },
                importantChange: { type: Type.BOOLEAN }
              },
              required: ["lineNumber", "explanation"]
            }
          }
        },
        required: ["summary", "steps"]
      }
    }
  });

  const rawData = JSON.parse(response.text.trim());
  
  return {
    summary: rawData.summary,
    steps: rawData.steps.map((step: any) => ({
      lineNumber: step.lineNumber,
      explanation: step.explanation,
      importantChange: step.importantChange,
      variableState: step.variableStateJson ? JSON.parse(step.variableStateJson) : undefined
    }))
  } as TraceData;
}

export async function generateExplanationAudio(text: string): Promise<string | undefined> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Read this code explanation clearly: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
}
