
import { GoogleGenAI, Type } from "@google/genai";
import { Player, AuctionConfig, Team } from "../types";

// Initializing the Google GenAI client using the required named parameter and environment variable.
// Use import.meta.env for Vite (browser environment)
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const getPriceSuggestion = async (
  player: Player,
  config: AuctionConfig,
  teams: Team[]
) => {
  if (!ai) {
    console.warn("Gemini API key not configured");
    return null;
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Suggest a realistic auction price range for this player:
        Sport: ${config.sport}
        Level: ${config.level}
        Player Name: ${player.name}
        Role: ${player.roleId}
        Base Price: ${player.basePrice}
        Current Market: ${teams.length} teams with avg remaining budget of ${
          teams.reduce((acc, t) => acc + t.remainingBudget, 0) / teams.length
        }
        
        Provide the response in JSON format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedMin: { type: Type.NUMBER },
            suggestedMax: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
          },
          required: ["suggestedMin", "suggestedMax", "reasoning"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Price Suggestion Error:", error);
    return null;
  }
};

export const getAuctionInsights = async (
  players: Player[],
  teams: Team[],
  config: AuctionConfig
) => {
  try {
    const soldPlayers = players.filter(p => p.status === 'SOLD');
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the current state of this ${config.sport} auction:
        Total Budget: ${config.totalBudget}
        Sold Players: ${JSON.stringify(soldPlayers.map(p => ({ name: p.name, price: p.soldPrice })))}
        Teams: ${JSON.stringify(teams.map(t => ({ name: t.name, spent: t.budget - t.remainingBudget })))}
        
        Give 3 punchy insights about bidding trends and squad building.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    return { insights: ["No AI insights available at the moment."] };
  }
};
