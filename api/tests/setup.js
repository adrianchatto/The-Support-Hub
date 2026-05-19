import { vi } from "vitest";
// Mock the database pool so unit tests never need a real PostgreSQL connection.
// Integration tests that need a real DB should use a test database and skip this mock.
vi.mock("../src/db/client.js", () => ({
    getPool: vi.fn(() => mockPool),
    closePool: vi.fn(),
}));
export const mockQuery = vi.fn();
export const mockPool = {
    query: mockQuery,
    connect: vi.fn(),
    end: vi.fn(),
};
// Reset mocks between tests
beforeEach(() => {
    vi.clearAllMocks();
});
