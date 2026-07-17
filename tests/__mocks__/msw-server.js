import { setupServer } from 'msw/node';
import { handlers, DB, resetDB, seedUser, seedListing } from './handlers';

export const server = setupServer(...handlers);
export { DB, resetDB, seedUser, seedListing };
