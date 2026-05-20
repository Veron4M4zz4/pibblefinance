/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function formatMoney(value: number, currency: 'BRL' | 'USD' | 'EUR' = 'BRL'): string {
  try {
    const localeMap = {
      BRL: 'pt-BR',
      USD: 'en-US',
      EUR: 'de-DE',
    };
    return new Intl.NumberFormat(localeMap[currency] || 'pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(value);
  } catch (error) {
    const symbols = { BRL: 'R$', USD: '$', EUR: '€' };
    return `${symbols[currency] || 'R$'} ${value.toFixed(2).replace('.', ',')}`;
  }
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return dateString;
  }
}
