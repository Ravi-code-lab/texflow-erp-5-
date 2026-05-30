
import { GoogleGenAI } from "@google/genai";
import { InventoryItem, ProductionJob, Order, QualityReport, Supplier, Project, Transaction, TeamMember } from '../types';

/**
 * Common error handler for AI service failures.
 */
const handleAiError = (error: any, context: string): string => {
  const errStr = JSON.stringify(error);
  const isQuotaError = errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED');
  if (isQuotaError) return "AI System under high load. Basic operations active.";
  console.error(`Gemini Error in ${context}:`, error);
  return `Protocol failure in ${context}. Telemetry logged.`;
};

/**
 * TexBot: The main chat interface for Texflow ERP.
 * Completed from truncated original source following SDK guidelines.
 */
export const chatWithERP = async (
  history: { role: 'user' | 'model', parts: { text: string }[] }[],
  message: string,
  contextData: { inventory: InventoryItem[], production: ProductionJob[], orders: Order[], team?: TeamMember[] }
) => {
  // Always initialize right before use as per guidelines
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  const ai = new GoogleGenAI({ apiKey: apiKey! });
  
  try {
    const contextStr = `Current System State: 
    Orders: ${contextData.orders.length}, 
    Production: ${contextData.production.length}, 
    Staff: ${contextData.team?.length || 0}. 
    Raw Data Shard (Summary): ${JSON.stringify({ 
        inventory: contextData.inventory.slice(0, 10).map(i => ({ name: i.name, qty: i.quantity, unit: i.unit })), 
        production: contextData.production.slice(0, 5).map(p => ({ item: p.productName, status: p.status })) 
    })}`;

    const contents = [
        ...history,
        { role: 'user' as const, parts: [{ text: `System Context: ${contextStr}\n\nUser Question: ${message}` }] }
    ];

    // Guidelines: Use ai.models.generateContent directly
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: contents,
      config: {
        systemInstruction: `You are TexBot, the industrial intelligence core for Ravi-Textile. 
        You have access to current inventory, production lots, sales orders, and the Staff Cluster (Personnel).
        Your goal is to provide high-precision advice on efficiency, waste reduction, and workforce allocation.
        Reference specific IDs when discussing lot convergence or staff performance.`,
      }
    });

    // Guidelines: Access text via .text property
    return response.text;
  } catch (error) {
    return handleAiError(error, 'TexBot Core');
  }
};

/**
 * Performs a diagnostic analysis on quality reports.
 * Fix: Added exported function to resolve QualityControl.tsx error.
 */
export const analyzeQualityTrends = async (reports: QualityReport[]): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  const ai = new GoogleGenAI({ apiKey: apiKey! });
  try {
    const dataStr = JSON.stringify(reports.slice(-30));
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze these recent textile quality reports and provide 3-4 bullet points on trends and recommended corrective actions:\n${dataStr}`,
      config: {
        systemInstruction: "You are a Quality Assurance Engine for a textile manufacturing plant. Analyze reports for production stability.",
      }
    });
    return response.text || "No insights could be derived from current telemetry.";
  } catch (error) {
    return handleAiError(error, 'Quality Analysis');
  }
};

/**
 * AI Image Analysis for Fabric Defects.
 */
export const analyzeFabricDefect = async (imageBase64: string): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  const ai = new GoogleGenAI({ apiKey: apiKey! });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: "Analyze this image of a textile fabric. Identify any visible defects (stains, weaving errors, shade variations, holes) and provide a technical assessment of the severity and likely cause." },
          { inlineData: { mimeType: "image/jpeg", data: imageBase64.split(',')[1] || imageBase64 } }
        ]
      },
      config: {
        systemInstruction: "You are a Senior Textile Quality Inspector. You specialize in identifying fabric defects from visual data.",
      }
    });
    return response.text || "Visual analysis inconclusive.";
  } catch (error) {
    return handleAiError(error, 'Visual Defect Analysis');
  }
};

/**
 * Performs a risk assessment on the supplier matrix.
 * Fix: Added exported function to resolve Suppliers.tsx error.
 */
export const analyzeSupplierRisk = async (suppliers: Supplier[]): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  const ai = new GoogleGenAI({ apiKey: apiKey! });
  try {
    const dataStr = JSON.stringify(suppliers);
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Evaluate reliability risk across the supplier matrix. Highlight single-source vulnerabilities or delivery bottlenecks:\n${dataStr}`,
      config: {
        systemInstruction: "You are a Strategic Procurement Auditor. Focus on supplier reliability scores and fulfillment risk.",
      }
    });
    return response.text || "Risk matrix data currently unavailable.";
  } catch (error) {
    return handleAiError(error, 'Supplier Risk');
  }
};

/**
 * Audits project roadmap and budget health.
 * Fix: Added exported function to resolve Projects.tsx error.
 */
export const analyzeProjectHealth = async (project: Project): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  const ai = new GoogleGenAI({ apiKey: apiKey! });
  try {
    const dataStr = JSON.stringify(project);
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Conduct a health audit on this project node. Compare budget spent vs task convergence and identify potential roadmap slippage:\n${dataStr}`,
      config: {
        systemInstruction: "You are an Industrial PMO Intelligence Node. Analyze project roadmap health and financial slippage.",
      }
    });
    return response.text || "Project health telemetry missing.";
  } catch (error) {
    return handleAiError(error, 'Project Health');
  }
};
