/** Request-local batched reads; bounded parameters and sequential legacy fallback. */
export async function readBatch<T>(ids: string[], batch: ((ids: string[]) => Promise<T[]>) | undefined, single: (id: string) => Promise<T[]>): Promise<T[]> {
    const unique = [...new Set(ids)];
    const rows: T[] = [];
    for (let i = 0; i < unique.length; i += 200) {
        const chunk = unique.slice(i, i + 200);
        if (batch) rows.push(...await batch(chunk));
        else for (const id of chunk) rows.push(...await single(id));
    }
    return rows;
}
export function byKey<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const row of rows) { const id = key(row); const bucket = map.get(id) ?? []; bucket.push(row); map.set(id, bucket); }
    return map;
}
