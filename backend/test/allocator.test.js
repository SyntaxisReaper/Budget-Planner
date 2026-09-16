import { describe, it, expect, vi } from 'vitest';
import { runAllocator } from '../src/services/allocator.js';

const mockDebts = [
  { id: 'd1', name: 'Credit Card', min_payment: 50, remaining_balance: 500, priority: 'high' },
  { id: 'd2', name: 'Student Loan', min_payment: 100, remaining_balance: 10000, priority: 'normal' },
];

const mockItems = [
  { id: 'i1', name: 'Rent', priority: 'essential', amount_needed: 1000 },
  { id: 'i2', name: 'Groceries', priority: 'essential', amount_needed: 400 },
  { id: 'i3', name: 'Internet', priority: 'important', amount_needed: 100 },
  { id: 'i4', name: 'Dining Out', priority: 'optional', amount_needed: 200 },
];

const mockGoals = [
  { id: 'g1', name: 'Vacation', current_amount: 500, target_amount: 1500, target_date: '2026-12-01' }, 
  { id: 'g2', name: 'Emergency', current_amount: 1000, target_amount: 5000, target_date: null }, 
];

describe('runAllocator', () => {
  it('1. Enough income for everything', () => {
    const result = runAllocator({
      totalIncome: 3000,
      items: mockItems,
      activeDebts: mockDebts,
      goals: mockGoals,
      leftoverPreference: 'savings',
      month: '2026-09-01'
    });
    
    expect(result.totalSaved).toBeGreaterThan(0);
    expect(result.atRiskGoals.length).toBe(0);
    
    const rent = result.lineItems.find(li => li.target_id === 'i1');
    expect(rent.allocated_amount).toBe(1000);
  });

  it('2. Short on essentials', () => {
    const result = runAllocator({
      totalIncome: 1000,
      items: mockItems,
      activeDebts: mockDebts,
      goals: mockGoals,
      leftoverPreference: 'savings',
      month: '2026-09-01'
    });
    
    const rent = result.lineItems.find(li => li.target_id === 'i1');
    const groceries = result.lineItems.find(li => li.target_id === 'i2');
    
    expect(rent.allocated_amount).toBeCloseTo(714.29, 1);
    expect(groceries.allocated_amount).toBeCloseTo(285.71, 1);
    
    const debts = result.lineItems.filter(li => li.target_type === 'debt');
    expect(debts.length).toBe(2);
    expect(debts[0].allocated_amount).toBe(0);
    expect(debts[1].allocated_amount).toBe(0);
  });

  it('3. Short on important/optional', () => {
    const result = runAllocator({
      totalIncome: 1950,
      items: mockItems,
      activeDebts: mockDebts,
      goals: mockGoals,
      leftoverPreference: 'savings',
      month: '2026-09-01'
    });
    
    const internet = result.lineItems.find(li => li.target_id === 'i3'); // important
    const dining = result.lineItems.find(li => li.target_id === 'i4'); // optional
    
    expect(internet.allocated_amount + dining.allocated_amount).toBeGreaterThan(0);
  });

  it('4. All debts paid off (empty debts)', () => {
    const result = runAllocator({
      totalIncome: 3000,
      items: mockItems,
      activeDebts: [],
      goals: mockGoals,
      leftoverPreference: 'savings',
      month: '2026-09-01'
    });
    
    const debts = result.lineItems.filter(li => li.target_type === 'debt');
    expect(debts.length).toBe(0);
  });

  it('5. Goal with no target_date', () => {
    const result = runAllocator({
      totalIncome: 3000,
      items: mockItems,
      activeDebts: mockDebts,
      goals: mockGoals,
      leftoverPreference: 'savings',
      month: '2026-09-01'
    });
    
    const emergencyGoal = result.lineItems.find(li => li.target_id === 'g2');
    expect(emergencyGoal).toBeUndefined();
  });

  it('6. Leftover Preference: debt', () => {
    const result = runAllocator({
      totalIncome: 3000,
      items: mockItems,
      activeDebts: mockDebts,
      goals: mockGoals,
      leftoverPreference: 'debt',
      month: '2026-09-01'
    });
    
    expect(result.leftover).toBe(0);
    expect(result.totalSaved).toBe(0);
    
    const debts = result.lineItems.filter(li => li.target_type === 'debt');
    const totalDebtAllocated = debts.reduce((sum, li) => sum + li.allocated_amount, 0);
    expect(totalDebtAllocated).toBeCloseTo(966.67, 1);
  });

  it('7. Phase 1 Regression: Proportional Important/Optional instead of Greedy', () => {
    const mockItems2 = [
      { id: 'i1', priority: 'important', amount_needed: 100 },
      { id: 'i2', priority: 'important', amount_needed: 300 },
    ];
    const result = runAllocator({
      totalIncome: 200,
      items: mockItems2,
      activeDebts: [],
      goals: [],
      leftoverPreference: 'savings',
      month: '2026-09-01'
    });
    const i1 = result.lineItems.find(li => li.target_id === 'i1');
    const i2 = result.lineItems.find(li => li.target_id === 'i2');
    expect(i1.allocated_amount).toBe(50);
    expect(i2.allocated_amount).toBe(150);
  });

  it('8. Phase 2 Regression: Debt minimums by priority', () => {
    const mockDebts2 = [
      { id: 'd1', min_payment: 100, remaining_balance: 1000, priority: 'normal' },
      { id: 'd2', min_payment: 100, remaining_balance: 1000, priority: 'high' },
    ];
    const result = runAllocator({
      totalIncome: 100,
      items: [],
      activeDebts: mockDebts2,
      goals: [],
      leftoverPreference: 'savings',
      month: '2026-09-01'
    });
    const d1 = result.lineItems.find(li => li.target_id === 'd1');
    const d2 = result.lineItems.find(li => li.target_id === 'd2');
    expect(d1 ? d1.allocated_amount : 0).toBe(0);
    expect(d2.allocated_amount).toBe(100);
  });
});
