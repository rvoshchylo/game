/**
 * Cosmetics / supporter / expansions only. Gameplay code never imports this.
 * Entitlements must come from a server in the real implementation — never from the save.
 */
export interface Product {
  sku: string;
  name: string;
  kind: 'cosmetic' | 'supporter' | 'expansion' | 'convenience';
}

export interface MonetizationService {
  listProducts(): Promise<Product[]>;
  getEntitlements(): Promise<string[]>;
  isOwned(sku: string): boolean;
  purchase(sku: string): Promise<{ ok: boolean; reason?: string }>;
}

export const CATALOG: Product[] = [
  { sku: 'skin_brass', name: 'Brass Chassis (cosmetic)', kind: 'cosmetic' },
  { sku: 'theme_glass', name: 'Glass Shaft Theme (cosmetic)', kind: 'cosmetic' },
  { sku: 'supporter', name: 'Supporter Pack', kind: 'supporter' },
];

export class MockMonetizationService implements MonetizationService {
  async listProducts(): Promise<Product[]> {
    return CATALOG;
  }
  async getEntitlements(): Promise<string[]> {
    return [];
  }
  isOwned(): boolean {
    return false;
  }
  async purchase(): Promise<{ ok: boolean; reason?: string }> {
    return { ok: false, reason: 'Purchases are not available in this build.' };
  }
}

export class RealMonetizationService implements MonetizationService {
  constructor(private apiBase: string) {}
  private owned = new Set<string>();
  async listProducts(): Promise<Product[]> {
    const r = await fetch(`${this.apiBase}/products`);
    return (await r.json()) as Product[];
  }
  async getEntitlements(): Promise<string[]> {
    const r = await fetch(`${this.apiBase}/entitlements`, { credentials: 'include' });
    const list = (await r.json()) as string[];
    this.owned = new Set(list);
    return list;
  }
  isOwned(sku: string): boolean {
    return this.owned.has(sku);
  }
  async purchase(sku: string): Promise<{ ok: boolean; reason?: string }> {
    const r = await fetch(`${this.apiBase}/checkout`, { method: 'POST', body: JSON.stringify({ sku }), credentials: 'include' });
    return r.ok ? { ok: true } : { ok: false, reason: `HTTP ${r.status}` };
  }
}
