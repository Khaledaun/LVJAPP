export const currency = (n: number, c = 'EUR') => new Intl.NumberFormat('en-EU', { style: 'currency', currency: c }).format(n)
