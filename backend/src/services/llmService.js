import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../lib/supabase.js';

import { computeCycleBounds } from '../utils/dateUtils.js';

const draftTransactionTool = {
  name: 'draft_transaction',
  description: 'Draft a transaction for the user to confirm. Use this when the user asks to log an expense or income.',
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
  functionDeclarations: [draftTransactionTool, getBudgetStatusTool]
}];

export async function processChatMessage(userId, message, history = [], defaultAccountId = null) {
  try {
    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const systemInstruction = `You are a helpful, concise financial personal assistant.
Your goal is to help the user manage their finances by logging transactions, querying their budget, and answering questions.
Always use the provided tools to take actions or retrieve data on behalf of the user. Keep your responses short.`;

    const formattedHistory = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const model = ai.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
      systemInstruction,
      tools: geminiTools,
      generationConfig: { temperature: 0.3 }
    });

    const chat = model.startChat({
      history: formattedHistory
    });

    let result = await chat.sendMessage(message);

    let functionCalls = result.response.functionCalls();
    
    let pendingTransaction = null;

    if (functionCalls && functionCalls.length > 0) {
      const functionResponses = [];

      for (const call of functionCalls) {
        const args = call.args;
        let toolResult = {};

        if (call.name === 'draft_transaction') {
          let selectedAccountId = defaultAccountId;
          
          if (!selectedAccountId) {
            // Fetch the user's oldest account to use as the fallback default account
            const { data: acc } = await supabase
              .from('accounts')
              .select('id')
              .eq('user_id', userId)
              .order('created_at', { ascending: true })
              .limit(1)
              .single();
            selectedAccountId = acc?.id || null;
          }

          pendingTransaction = {
            account_id: selectedAccountId,
            amount: args.amount,
            type: args.type,
            occurred_at: args.date || new Date().toISOString().split('T')[0],
            note: args.note
          };
          
          toolResult = { success: true, message: "Draft created successfully. Ask the user to confirm it." };
        } 
        else if (call.name === 'get_budget_status') {
          const currentMonth = args.month || new Date().toISOString().slice(0, 7);
          const firstOfMonth = `${currentMonth}-01`;

          // 1. Get cycle bounds
          const { data: settings } = await supabase.from('user_settings').select('cycle_start_date, cycle_days').eq('user_id', userId).single();
          const { start, end } = computeCycleBounds(currentMonth, settings);

          // 2. Fetch total income for budget
          const { data: budget } = await supabase.from('budgets').select('total_income').eq('user_id', userId).eq('month', firstOfMonth).single();
          const totalIncome = budget?.total_income || 0;

          // 3. Sum expenses for the cycle
          const { data: txns } = await supabase.from('transactions')
            .select('amount, type')
            .eq('user_id', userId)
            .gte('occurred_at', start)
            .lte('occurred_at', end);

          let totalSpent = 0;
          if (txns) {
            txns.forEach(t => {
              if (['expense', 'debt_payment', 'goal_contribution'].includes(t.type)) {
                totalSpent += Number(t.amount);
              }
            });
          }

          const remaining = totalIncome - totalSpent;
          toolResult = { 
            total_budget: totalIncome,
            total_spent: totalSpent,
            remaining_budget: remaining,
            currency: 'INR',
            message: "This is the real budget data based on their active cycle."
          };
        }

        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: toolResult
          }
        });
      }

      result = await chat.sendMessage(functionResponses);
    }

    return { 
      text: result.response.text(),
      pendingTransaction
    };
  } catch (error) {
    console.error('LLM Error:', error);
    throw error;
  }
}
