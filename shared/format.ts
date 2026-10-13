/** Normalise a South African style phone number to digits only (ZA country code, no +). */
export function waDigits(phone: string): string {
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('0027')) d = d.slice(4);
  if (d.startsWith('27') && d.length >= 11) return d;
  if (d.startsWith('0')) d = '27' + d.slice(1);
  return d;
}

export function waLink(phone: string): string {
  const d = waDigits(phone);
  return d ? `https://wa.me/${d}` : '';
}

export function telLink(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (!d) return '';
  return d.startsWith('27') ? `tel:+${d}` : `tel:${d}`;
}

export function isValidPhone(phone: string): boolean {
  const d = phone.replace(/\D/g, '');
  return d.length >= 9 && d.length <= 15;
}
