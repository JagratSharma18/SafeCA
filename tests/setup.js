/**
 * Safe CA - Jest Test Setup
 */

// Mock chrome API
global.chrome = {
  runtime: {
    id: 'test-extension-id',
    sendMessage: jest.fn().mockResolvedValue({ success: true }),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    onInstalled: {
      addListener: jest.fn()
    },
    onStartup: {
      addListener: jest.fn()
    },
    getURL: jest.fn(path => `chrome-extension://test-id/${path}`),
    getPlatformInfo: jest.fn()
  },
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined)
    },
    sync: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined)
    }
  },
  alarms: {
    create: jest.fn(),
    clear: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn().mockResolvedValue([]),
    onAlarm: {
      addListener: jest.fn()
    }
  },
  notifications: {
    create: jest.fn(),
    clear: jest.fn(),
    onClicked: {
      addListener: jest.fn()
    }
  },
  contextMenus: {
    create: jest.fn(),
    remove: jest.fn(),
    removeAll: jest.fn((callback) => callback && callback()),
    onClicked: {
      addListener: jest.fn()
    }
  },
  tabs: {
    create: jest.fn(),
    query: jest.fn().mockResolvedValue([]),
    sendMessage: jest.fn()
  },
  action: {
    openPopup: jest.fn()
  }
};

// Mock fetch
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: jest.fn().mockResolvedValue({})
});

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue('')
  },
  writable: true
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  jest.restoreAllMocks();
});
