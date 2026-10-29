import { expect, test } from 'bun:test';
import { useState } from 'react';
import { renderToString } from 'react-dom/server';
import { RoomKitProvider } from '../src/context/RoomKitProvider';
import { useApiClient, type ApiClient } from '../src/lib/api-client';

test('retains the API client across component state updates', () => {
    const clients: ApiClient[] = [];
    function Probe() {
        const [step, setStep] = useState(0);
        clients.push(useApiClient());
        if (step < 2) setStep(step + 1);
        return null;
    }
    renderToString(<RoomKitProvider config={{ apiUrl: 'https://example.test' }}><Probe /></RoomKitProvider>);
    expect(clients).toHaveLength(3);
    expect(clients[1]).toBe(clients[0]);
    expect(clients[2]).toBe(clients[0]);
});
