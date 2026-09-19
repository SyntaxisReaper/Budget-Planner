import { GoogleGenAI } from '@google/genai';
import { supabase } from '../lib/supabase.js';

// Requires GEMINI_API_KEY in .env
const ai = new GoogleGenAI();

const logTransactionTool = {
  name: 'log_transaction',
  description: 'Log a new transaction (income or expense) into the system.',
  parameters: {
    type: 'object',
    properties: {
      amount: {
        type: 'number',
        description: 'The amount of the transaction.'
      },
      type: {
        type: 'string',
        enum: ['income', 'expense'],
        description: 'Whether this is an income or an expense.'
      },
      date: {
        type: 'string',
        description: 'The date of the transaction in YYYY-MM-DD format. Default to today if not specified.'
      },
      note: {
        type: 'string',
        description: 'A brief note or description of the transaction.'
      }
    },
    required: ['amount', 'type', 'date', 'note']
  }
};

const getBudgetStatusTool = {
  name: 'get_budget_status',
  description: 'Check how much money is left in the budget for the current month.',
  parameters: {
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description: 'The month to check in YYYY-MM format. Defaults to the current month.'
      }
    }
  }
};

const geminiTools = [{
  functionDeclarations: [logTransactionTool, getBudgetStatusTool]
}];

export async function processChatMessage(userId, message, history = []) {
  try {
    const systemInstruction = `You are a helpful, concise financial personal assistant.
Your goal is to help the user manage their finances by logging transactions, querying their budget, and answering questions.
Always use the provided tools to take actions or retrieve data on behalf of the user. Keep your responses short.`;

    let formattedHistory = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Start a chat session
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction,
        tools: geminiTools,
        temperature: 0.3
      },
      history: formattedHistory.length > 0 ? formattedHistory : undefined
    });

    let response = await chat.sendMessage(message);

    // Handle tool calls
    if (response.functionCalls && response.functionCalls.length > 0) {
      const calls = response.functionCalls;
      const functionResponses = [];

      for (const call of calls) {
        const args = call.args;
        let toolResult = {};

        if (call.name === 'log_transaction') {
          const { data, error } = await supabase.from('transactions').insert({
            user_id: userId,
            amount: args.amount,
            type: args.type,
            date: args.date,
            note: args.note
          }).select().single();
          
          if (error) {
            toolResult = { error: error.message };
          } else {
            toolResult = { success: true, transaction: data };
          }
        } 
        else if (call.name === 'get_budget_status') {
          toolResult = { remaining_budget: 4500, currency: 'INR', message: "This is a placeholder." };
        }

        functionResponses.push({
          name: call.name,
          response: toolResult
        });
      }

      // Send the tool responses back to the model
      response = await chat.sendMessage(functionResponses);
    }

    return response.text;
  } catch (error) {
    console.error('LLM Error:', error);
    throw new Error('Failed to process message with AI assistant.');
  }
}
