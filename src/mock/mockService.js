
import data from './data.json';

// Simulate network delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const MOCK_DELAY = 600;

export const mockService = {
  login: async (email, password) => {
    await delay(MOCK_DELAY);
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const normalizedPassword = String(password || '');
        const user = data.users.find((u) => {
            const userEmail = String(u.email || '').trim().toLowerCase();
            const storedPassword = u.password ?? u.passwordHash;
            return userEmail === normalizedEmail && String(storedPassword || '') === normalizedPassword;
        });
    if (user) {
                const { password: _, passwordHash: __, ...userWithoutPassword } = user;
                userWithoutPassword.role = String(userWithoutPassword.role || 'customer').toLowerCase();
        return userWithoutPassword;
    }
    throw new Error('Invalid email or password');
  },

  register: async (userData) => {
    await delay(MOCK_DELAY);
    return { ...userData, id: `u${Date.now()}` };
  },

  resetPassword: async (email) => {
    await delay(MOCK_DELAY);
    const user = data.users.find(u => u.email === email);
    if (!user) throw new Error('Email not found');
    return true;
  },

  // --- Shipments ---
  getShipments: async (userId, filters = {}) => {
      await delay(MOCK_DELAY);
      // If admin/agent, might return all or filtered. For customer, return theirs.
      // Assuming userId matches sender/receiver or we filter by it.
      // For simplicity in this mock, we just filter by what's in data.shipments
      // In a real app, we'd filter by userId.
      
      let results = data.shipments;
      
      // If NOT admin, filter by user? (Logic depends on requirements, but for now strict mock data access)
      // We'll let the caller handle complex filtering or add basic support here:
      if (filters.status) {
          results = results.filter(s => s.status === filters.status);
      }
      
      return results;
  },

  getShipmentById: async (id) => {
      await delay(MOCK_DELAY);
      const shipment = data.shipments.find(s => s.id === id || s.trackingId === id);
      if (!shipment) throw new Error('Shipment not found');
      return shipment;
  },

  createShipment: async (shipmentData) => {
      await delay(MOCK_DELAY);
      const newShipment = {
          ...shipmentData,
          id: `TRK${Date.now()}`,
          trackingId: `TRK${Date.now()}`,
          status: 'BOOKED',
          date: new Date().toISOString().split('T')[0],
      };
      // In a real app we would push to data.shipments, but here we can just return it
      // or actually push it if we want state persistence within the session (module level variable)
      // For now, let's just return success.
      return newShipment;
  },

  updateShipmentStatus: async (id, status) => {
      await delay(MOCK_DELAY);
      const shipment = data.shipments.find(s => s.id === id);
      if (shipment) {
          shipment.status = status;
          return shipment;
      }
      throw new Error('Shipment not found');
  },

  getTransactions: async (userId) => {
      await delay(MOCK_DELAY);
      return data.transactions;
  },
  
  getTransactionById: async (id) => {
      await delay(MOCK_DELAY);
      const txn = data.transactions.find(t => t.id === id);
      if (!txn) throw new Error('Transaction not found');
      return txn;
  },

  downloadInvoice: async (transactionId) => {
      await delay(MOCK_DELAY);
      return true; // Simulate success
  },

  // --- Support ---
  getTickets: async (userId) => {
      await delay(MOCK_DELAY);
      return data.tickets;
  },

  createTicket: async (ticketData) => {
      await delay(MOCK_DELAY);
      return { ...ticketData, id: `TKT-${Date.now()}`, date: new Date().toISOString().split('T')[0], status: 'Open' };
  },

  // --- Admin ---
  getBranches: async () => {
      await delay(MOCK_DELAY);
      return data.branches;
  },
  
  getBranchById: async (id) => {
      await delay(MOCK_DELAY);
      const branch = data.branches.find(b => b.id === id);
      if(!branch) throw new Error('Branch not found');
      return branch;
  },

  getFleet: async () => {
      await delay(MOCK_DELAY);
      return data.fleet;
  },

  getStaff: async () => {
      await delay(MOCK_DELAY);
      return data.staff;
  },

  // --- Agent ---
  getCities: async () => {
      await delay(MOCK_DELAY);
      return data.cities;
  },
  
  generateRunSheet: async () => {
      await delay(MOCK_DELAY);
      return data.runSheets[0]; // Return a mock run sheet
  },

  getCashCollections: async () => {
      await delay(MOCK_DELAY);
      return data.cashCollections;
  },
  
  submitCashCollection: async (data) => {
      await delay(MOCK_DELAY);
      return true;
  }
};


