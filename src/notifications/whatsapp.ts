export function buildWhatsappLink(phone: string, message: string): string {
  const normalized = phone.replace(/^\+/, '');
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
