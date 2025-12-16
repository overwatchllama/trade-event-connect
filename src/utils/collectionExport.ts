import type { CollectionItem } from '@/hooks/useCollection';

/**
 * Export collection to CSV format
 */
export const exportToCSV = (items: CollectionItem[], filename: string = 'collection.csv') => {
  if (items.length === 0) {
    throw new Error('No items to export');
  }

  // Define CSV headers
  const headers = [
    'Name',
    'Set',
    'Number',
    'Rarity',
    'Condition',
    'Quantity',
    'Purchase Price',
    'Market Price',
    'Acquired Date',
    'Notes',
  ];

  // Convert items to CSV rows
  const rows = items.map(item => [
    item.name,
    item.set_name || '',
    item.card_number || '',
    item.rarity || '',
    item.condition,
    item.quantity.toString(),
    item.purchase_price?.toString() || '',
    item.current_market_price?.toString() || '',
    item.acquired_date || '',
    item.notes || '',
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Parse CSV file and return collection items
 */
export const parseCSV = (csvText: string): Partial<CollectionItem>[] => {
  const lines = csvText.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV file is empty or invalid');
  }

  // Parse headers (first line)
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  // Parse data rows
  const items: Partial<CollectionItem>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));

    const item: Partial<CollectionItem> = {
      name: values[0] || '',
      set_name: values[1] || null,
      card_number: values[2] || null,
      rarity: values[3] || null,
      condition: (values[4] || 'near_mint') as any,
      quantity: parseInt(values[5]) || 1,
      purchase_price: values[6] ? parseFloat(values[6]) : null,
      current_market_price: values[7] ? parseFloat(values[7]) : null,
      acquired_date: values[8] || null,
      notes: values[9] || null,
    };

    if (item.name) {
      items.push(item);
    }
  }

  return items;
};

/**
 * Calculate collection statistics
 */
export const calculateStats = (items: CollectionItem[]) => {
  const totalCards = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = items.reduce((sum, item) => sum + ((item.current_market_price || 0) * item.quantity), 0);
  const totalInvestment = items.reduce((sum, item) => sum + ((item.purchase_price || 0) * item.quantity), 0);
  const gradedCards = 0; // Not available in current schema
  const forTradeCards = 0; // Not available in current schema

  // Group by condition
  const byCondition = items.reduce((acc, item) => {
    if (!acc[item.condition]) {
      acc[item.condition] = { count: 0, value: 0 };
    }
    acc[item.condition].count += item.quantity;
    acc[item.condition].value += (item.current_market_price || 0) * item.quantity;
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  // Group by rarity
  const byRarity = items.reduce((acc, item) => {
    const rarity = item.rarity || 'Unknown';
    if (!acc[rarity]) {
      acc[rarity] = { count: 0, value: 0 };
    }
    acc[rarity].count += item.quantity;
    acc[rarity].value += (item.current_market_price || 0) * item.quantity;
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  // Group by set
  const bySet = items.reduce((acc, item) => {
    const set = item.set_name || 'Unknown';
    if (!acc[set]) {
      acc[set] = { count: 0, value: 0 };
    }
    acc[set].count += item.quantity;
    acc[set].value += (item.current_market_price || 0) * item.quantity;
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  const profit = totalValue - totalInvestment;
  const roi = totalInvestment > 0 ? ((profit / totalInvestment) * 100) : 0;

  return {
    totalCards,
    totalValue,
    totalInvestment,
    profit,
    roi,
    gradedCards,
    forTradeCards,
    averageValue: totalCards > 0 ? totalValue / totalCards : 0,
    byCondition,
    byRarity,
    bySet,
  };
};
